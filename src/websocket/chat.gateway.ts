/**
 * @fileoverview WebSocket gateway for real-time chat functionality
 * @description Handles WebSocket connections, authentication, and message routing
 * @module websocket/chat.gateway
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../services/auth.service';
import { MessageService } from '../services/message.service';
import { TopicService } from '../services/topic.service';
import {
  WS_EVENTS,
  SendMessage,
  EditMessage,
  DeleteMessage,
  AddReaction,
  RemoveReaction,
  StartTyping,
  StopTyping,
  JoinTopic,
  LeaveTopic,
  MarkRead,
  ClientMessageSchema,
} from './schemas';
import { config } from '../config/config';
import { DomainError, ErrorCode } from '../errors/base.error';

/**
 * Connected client interface
 * @interface ConnectedClient
 */
interface ConnectedClient {
  userId: string;
  socket: Socket;
  joinedTopics: Set<string>;
}

/**
 * WebSocket Gateway for real-time chat
 * @description Handles all WebSocket events for the chat application
 * @class ChatGateway
 * @implements {OnGatewayConnection, OnGatewayDisconnect}
 */
@WebSocketGateway({
  cors: {
    origin: config.websocket.corsOrigin,
    credentials: true,
  },
  pingInterval: config.websocket.pingInterval,
  pingTimeout: config.websocket.pingTimeout,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** Map of socket ID to connected client info */
  private clients: Map<string, ConnectedClient> = new Map();

  /** Map of user ID to socket IDs (for multi-device support) */
  private userSockets: Map<string, Set<string>> = new Map();

  /** Map of typing timeouts by socket+topic */
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly authService: AuthService,
    private readonly messageService: MessageService,
    private readonly topicService: TopicService
  ) {}

  /**
   * Handles new WebSocket connections
   * @param {Socket} socket - The connecting socket
   * @description Connection is established but user must authenticate
   */
  handleConnection(socket: Socket): void {
    console.log(`Client connected: ${socket.id}`);
    // Client must authenticate within a timeout
    const authTimeout = setTimeout(() => {
      if (!this.clients.has(socket.id)) {
        socket.emit(WS_EVENTS.ERROR, {
          event: WS_EVENTS.ERROR,
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authentication timeout',
        });
        socket.disconnect();
      }
    }, 30000); // 30 second auth timeout

    socket.data.authTimeout = authTimeout;
  }

  /**
   * Handles WebSocket disconnections
   * @param {Socket} socket - The disconnecting socket
   * @description Cleans up client state and broadcasts offline status
   */
  handleDisconnect(socket: Socket): void {
    console.log(`Client disconnected: ${socket.id}`);

    // Clear auth timeout if still pending
    if (socket.data.authTimeout) {
      clearTimeout(socket.data.authTimeout);
    }

    const client = this.clients.get(socket.id);
    if (client) {
      // Remove from user sockets
      const userSocketSet = this.userSockets.get(client.userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(client.userId);
          // User is now fully offline - broadcast to contacts
          this.broadcastUserOffline(client.userId);
        }
      }

      // Clear typing indicators
      for (const topicId of client.joinedTopics) {
        this.clearTyping(socket.id, topicId);
      }

      this.clients.delete(socket.id);
    }
  }

  /**
   * Handles client authentication
   * @param {Socket} socket - The client socket
   * @param {object} payload - Authentication payload with token
   * @returns {Promise<void>}
   */
  @SubscribeMessage(WS_EVENTS.AUTHENTICATE)
  async handleAuthenticate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { token: string }
  ): Promise<void> {
    try {
      // Clear auth timeout
      if (socket.data.authTimeout) {
        clearTimeout(socket.data.authTimeout);
      }

      // Validate token
      const jwtPayload = await this.authService.validateToken(payload.token);

      // Store client info
      const client: ConnectedClient = {
        userId: jwtPayload.sub,
        socket,
        joinedTopics: new Set(),
      };
      this.clients.set(socket.id, client);

      // Add to user sockets
      if (!this.userSockets.has(jwtPayload.sub)) {
        this.userSockets.set(jwtPayload.sub, new Set());
      }
      this.userSockets.get(jwtPayload.sub)!.add(socket.id);

      // Broadcast online status
      this.broadcastUserOnline(jwtPayload.sub);

      // Send success response
      socket.emit(WS_EVENTS.AUTHENTICATED, {
        event: WS_EVENTS.AUTHENTICATED,
        userId: jwtPayload.sub,
        expiresAt: new Date(jwtPayload.exp! * 1000).toISOString(),
      });
    } catch (error) {
      this.emitError(socket, error as Error);
      socket.disconnect();
    }
  }

  /**
   * Handles sending a new message
   * @param {Socket} socket - The client socket
   * @param {SendMessage} payload - Message data
   * @returns {Promise<void>}
   * @side-effect Creates message and broadcasts to topic participants
   */
  @SubscribeMessage(WS_EVENTS.MESSAGE_SEND)
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SendMessage
  ): Promise<void> {
    try {
      const client = this.requireAuth(socket);

      const message = await this.messageService.sendMessage(client.userId, {
        topicId: payload.topicId,
        content: payload.content,
        replyToId: payload.replyToId,
        mediaIds: payload.mediaIds,
        mentionedUserIds: payload.mentionedUserIds,
      });

      // Clear typing indicator
      this.clearTyping(socket.id, payload.topicId);

      // Broadcast to topic room
      // Note: In production, would also fetch sender details
      const event = {
        event: WS_EVENTS.MESSAGE_CREATED,
        message: {
          ...message,
          createdAt: message.createdAt.toISOString(),
          editedAt: message.editedAt?.toISOString() ?? null,
          sender: {
            id: client.userId,
            displayName: 'User', // Would fetch from user service
            username: 'user',
            avatarUrl: null,
          },
        },
        correlationId: payload.correlationId,
      };

      this.broadcastToTopic(payload.topicId, WS_EVENTS.MESSAGE_CREATED, event);
    } catch (error) {
      this.emitError(socket, error as Error, payload.correlationId);
    }
  }

  /**
   * Handles editing a message
   * @param {Socket} socket - The client socket
   * @param {EditMessage} payload - Edit data
   * @returns {Promise<void>}
   */
  @SubscribeMessage(WS_EVENTS.MESSAGE_EDIT)
  async handleEditMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: EditMessage
  ): Promise<void> {
    try {
      const client = this.requireAuth(socket);

      const message = await this.messageService.editMessage(client.userId, payload.messageId, {
        content: payload.content,
      });

      const event = {
        event: WS_EVENTS.MESSAGE_UPDATED,
        messageId: message.id,
        topicId: message.topicId,
        content: message.content,
        isEdited: message.isEdited,
        editedAt: message.editedAt?.toISOString() ?? null,
        correlationId: payload.correlationId,
      };

      this.broadcastToTopic(message.topicId, WS_EVENTS.MESSAGE_UPDATED, event);
    } catch (error) {
      this.emitError(socket, error as Error, payload.correlationId);
    }
  }

  /**
   * Handles deleting a message
   * @param {Socket} socket - The client socket
   * @param {DeleteMessage} payload - Delete data
   * @returns {Promise<void>}
   */
  @SubscribeMessage(WS_EVENTS.MESSAGE_DELETE)
  async handleDeleteMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: DeleteMessage
  ): Promise<void> {
    try {
      const client = this.requireAuth(socket);

      const message = await this.messageService.getMessage(payload.messageId);
      await this.messageService.deleteMessage(client.userId, payload.messageId);

      const event = {
        event: WS_EVENTS.MESSAGE_DELETED,
        messageId: payload.messageId,
        topicId: message.topicId,
        correlationId: payload.correlationId,
      };

      this.broadcastToTopic(message.topicId, WS_EVENTS.MESSAGE_DELETED, event);
    } catch (error) {
      this.emitError(socket, error as Error, payload.correlationId);
    }
  }

  /**
   * Handles adding a reaction
   * @param {Socket} socket - The client socket
   * @param {AddReaction} payload - Reaction data
   * @returns {Promise<void>}
   */
  @SubscribeMessage(WS_EVENTS.REACTION_ADD)
  async handleAddReaction(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: AddReaction
  ): Promise<void> {
    try {
      const client = this.requireAuth(socket);

      const message = await this.messageService.addReaction(
        client.userId,
        payload.messageId,
        payload.type
      );

      const event = {
        event: WS_EVENTS.REACTION_ADDED,
        messageId: message.id,
        topicId: message.topicId,
        userId: client.userId,
        type: payload.type,
        reactionCounts: message.reactionCounts,
        correlationId: payload.correlationId,
      };

      this.broadcastToTopic(message.topicId, WS_EVENTS.REACTION_ADDED, event);
    } catch (error) {
      this.emitError(socket, error as Error, payload.correlationId);
    }
  }

  /**
   * Handles removing a reaction
   * @param {Socket} socket - The client socket
   * @param {RemoveReaction} payload - Reaction data
   * @returns {Promise<void>}
   */
  @SubscribeMessage(WS_EVENTS.REACTION_REMOVE)
  async handleRemoveReaction(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: RemoveReaction
  ): Promise<void> {
    try {
      const client = this.requireAuth(socket);

      const message = await this.messageService.removeReaction(
        client.userId,
        payload.messageId,
        payload.type
      );

      const event = {
        event: WS_EVENTS.REACTION_REMOVED,
        messageId: message.id,
        topicId: message.topicId,
        userId: client.userId,
        type: payload.type,
        reactionCounts: message.reactionCounts,
        correlationId: payload.correlationId,
      };

      this.broadcastToTopic(message.topicId, WS_EVENTS.REACTION_REMOVED, event);
    } catch (error) {
      this.emitError(socket, error as Error, payload.correlationId);
    }
  }

  /**
   * Handles typing start indicator
   * @param {Socket} socket - The client socket
   * @param {StartTyping} payload - Typing data
   */
  @SubscribeMessage(WS_EVENTS.TYPING_START)
  handleStartTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: StartTyping
  ): void {
    try {
      const client = this.requireAuth(socket);

      // Clear existing timeout
      this.clearTyping(socket.id, payload.topicId);

      // Broadcast typing indicator
      this.broadcastToTopic(
        payload.topicId,
        WS_EVENTS.TYPING_USER,
        {
          event: WS_EVENTS.TYPING_USER,
          topicId: payload.topicId,
          userId: client.userId,
          displayName: 'User', // Would fetch from user service
          isTyping: true,
        },
        [socket.id] // Exclude sender
      );

      // Set auto-clear timeout (5 seconds)
      const timeout = setTimeout(() => {
        this.clearTyping(socket.id, payload.topicId);
      }, 5000);

      this.typingTimeouts.set(`${socket.id}:${payload.topicId}`, timeout);
    } catch (error) {
      this.emitError(socket, error as Error);
    }
  }

  /**
   * Handles typing stop indicator
   * @param {Socket} socket - The client socket
   * @param {StopTyping} payload - Typing data
   */
  @SubscribeMessage(WS_EVENTS.TYPING_STOP)
  handleStopTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: StopTyping
  ): void {
    try {
      this.requireAuth(socket);
      this.clearTyping(socket.id, payload.topicId);
    } catch (error) {
      this.emitError(socket, error as Error);
    }
  }

  /**
   * Handles joining a topic (subscribing to updates)
   * @param {Socket} socket - The client socket
   * @param {JoinTopic} payload - Join data
   */
  @SubscribeMessage(WS_EVENTS.TOPIC_JOIN)
  async handleJoinTopic(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinTopic
  ): Promise<void> {
    try {
      const client = this.requireAuth(socket);

      // Verify user has access to topic
      await this.topicService.getTopic(payload.topicId);

      // Join socket room
      socket.join(`topic:${payload.topicId}`);
      client.joinedTopics.add(payload.topicId);
    } catch (error) {
      this.emitError(socket, error as Error);
    }
  }

  /**
   * Handles leaving a topic (unsubscribing from updates)
   * @param {Socket} socket - The client socket
   * @param {LeaveTopic} payload - Leave data
   */
  @SubscribeMessage(WS_EVENTS.TOPIC_LEAVE)
  handleLeaveTopic(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: LeaveTopic
  ): void {
    try {
      const client = this.requireAuth(socket);

      socket.leave(`topic:${payload.topicId}`);
      client.joinedTopics.delete(payload.topicId);
      this.clearTyping(socket.id, payload.topicId);
    } catch (error) {
      this.emitError(socket, error as Error);
    }
  }

  /**
   * Handles marking a topic as read
   * @param {Socket} socket - The client socket
   * @param {MarkRead} payload - Read data
   */
  @SubscribeMessage(WS_EVENTS.TOPIC_READ)
  async handleMarkRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: MarkRead
  ): Promise<void> {
    try {
      const client = this.requireAuth(socket);

      await this.messageService.markAsRead(client.userId, payload.topicId, payload.lastMessageId);

      // Broadcast read receipt to other participants
      this.broadcastToTopic(
        payload.topicId,
        WS_EVENTS.TOPIC_READ_RECEIPT,
        {
          event: WS_EVENTS.TOPIC_READ_RECEIPT,
          topicId: payload.topicId,
          userId: client.userId,
          lastReadMessageId: payload.lastMessageId || '',
        },
        [socket.id] // Exclude sender
      );
    } catch (error) {
      this.emitError(socket, error as Error);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Requires client to be authenticated
   * @private
   * @param {Socket} socket - The client socket
   * @returns {ConnectedClient} The authenticated client
   * @throws {DomainError} If not authenticated
   */
  private requireAuth(socket: Socket): ConnectedClient {
    const client = this.clients.get(socket.id);
    if (!client) {
      throw new DomainError(ErrorCode.UNAUTHORIZED, 'Not authenticated');
    }
    return client;
  }

  /**
   * Emits an error to a client
   * @private
   * @param {Socket} socket - The client socket
   * @param {Error} error - The error
   * @param {string} [correlationId] - Optional correlation ID
   */
  private emitError(socket: Socket, error: Error, correlationId?: string): void {
    const isDomainError = error instanceof DomainError;
    socket.emit(WS_EVENTS.ERROR, {
      event: WS_EVENTS.ERROR,
      code: isDomainError ? error.code : ErrorCode.INTERNAL_ERROR,
      message: error.message,
      correlationId,
    });
  }

  /**
   * Broadcasts a message to all clients in a topic room
   * @private
   * @param {string} topicId - Topic ID
   * @param {string} event - Event name
   * @param {unknown} data - Event data
   * @param {string[]} [excludeSocketIds] - Socket IDs to exclude
   */
  private broadcastToTopic(
    topicId: string,
    event: string,
    data: unknown,
    excludeSocketIds: string[] = []
  ): void {
    const room = `topic:${topicId}`;
    if (excludeSocketIds.length > 0) {
      this.server.to(room).except(excludeSocketIds).emit(event, data);
    } else {
      this.server.to(room).emit(event, data);
    }
  }

  /**
   * Broadcasts user online status
   * @private
   * @param {string} userId - User ID
   */
  private broadcastUserOnline(userId: string): void {
    // Broadcast to all connected clients (in production, would be more targeted)
    this.server.emit(WS_EVENTS.PRESENCE_ONLINE, {
      event: WS_EVENTS.PRESENCE_ONLINE,
      userId,
      status: 'ONLINE',
    });
  }

  /**
   * Broadcasts user offline status
   * @private
   * @param {string} userId - User ID
   */
  private broadcastUserOffline(userId: string): void {
    this.server.emit(WS_EVENTS.PRESENCE_OFFLINE, {
      event: WS_EVENTS.PRESENCE_OFFLINE,
      userId,
      lastSeenAt: new Date().toISOString(),
    });
  }

  /**
   * Clears typing indicator for a client in a topic
   * @private
   * @param {string} socketId - Socket ID
   * @param {string} topicId - Topic ID
   */
  private clearTyping(socketId: string, topicId: string): void {
    const key = `${socketId}:${topicId}`;
    const timeout = this.typingTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(key);
    }

    const client = this.clients.get(socketId);
    if (client) {
      this.broadcastToTopic(
        topicId,
        WS_EVENTS.TYPING_USER,
        {
          event: WS_EVENTS.TYPING_USER,
          topicId,
          userId: client.userId,
          displayName: 'User',
          isTyping: false,
        },
        [socketId]
      );
    }
  }
}
