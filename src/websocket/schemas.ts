/**
 * @fileoverview WebSocket message schemas
 * @description Defines the JSON structure for all WebSocket events
 * @module websocket/schemas
 */

import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Base WebSocket message schema
 * @description All WS messages have an event type and optional correlation ID
 */
export const BaseWsMessageSchema = z.object({
  event: z.string(),
  correlationId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

/**
 * Error response schema
 */
export const WsErrorSchema = z.object({
  event: z.literal('error'),
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  correlationId: z.string().optional(),
});

export type WsError = z.infer<typeof WsErrorSchema>;

// ============================================================================
// Authentication Events
// ============================================================================

/**
 * Client authentication message
 */
export const AuthenticateSchema = z.object({
  event: z.literal('authenticate'),
  token: z.string(),
});

export type Authenticate = z.infer<typeof AuthenticateSchema>;

/**
 * Authentication success response
 */
export const AuthenticatedSchema = z.object({
  event: z.literal('authenticated'),
  userId: z.string(),
  expiresAt: z.string().datetime(),
});

export type Authenticated = z.infer<typeof AuthenticatedSchema>;

// ============================================================================
// Message Events
// ============================================================================

/**
 * Send message payload
 */
export const SendMessageSchema = z.object({
  event: z.literal('message:send'),
  topicId: z.string(),
  content: z.string().min(1).max(4000),
  replyToId: z.string().optional(),
  mediaIds: z.array(z.string()).optional(),
  mentionedUserIds: z.array(z.string()).optional(),
  correlationId: z.string().optional(),
});

export type SendMessage = z.infer<typeof SendMessageSchema>;

/**
 * Message created event (broadcast to topic participants)
 */
export const MessageCreatedSchema = z.object({
  event: z.literal('message:created'),
  message: z.object({
    id: z.string(),
    topicId: z.string(),
    senderId: z.string(),
    content: z.string(),
    type: z.enum(['TEXT', 'MEDIA', 'SYSTEM', 'REPLY']),
    status: z.enum(['SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']),
    replyToId: z.string().nullable(),
    isPinned: z.boolean(),
    isEdited: z.boolean(),
    editedAt: z.string().datetime().nullable(),
    mediaIds: z.array(z.string()),
    mentionedUserIds: z.array(z.string()),
    reactionCounts: z.record(z.string(), z.number()),
    createdAt: z.string().datetime(),
    sender: z.object({
      id: z.string(),
      displayName: z.string(),
      username: z.string(),
      avatarUrl: z.string().nullable(),
    }),
  }),
  correlationId: z.string().optional(),
});

export type MessageCreated = z.infer<typeof MessageCreatedSchema>;

/**
 * Edit message payload
 */
export const EditMessageSchema = z.object({
  event: z.literal('message:edit'),
  messageId: z.string(),
  content: z.string().min(1).max(4000),
  correlationId: z.string().optional(),
});

export type EditMessage = z.infer<typeof EditMessageSchema>;

/**
 * Message updated event
 */
export const MessageUpdatedSchema = z.object({
  event: z.literal('message:updated'),
  messageId: z.string(),
  topicId: z.string(),
  content: z.string(),
  isEdited: z.boolean(),
  editedAt: z.string().datetime().nullable(),
  correlationId: z.string().optional(),
});

export type MessageUpdated = z.infer<typeof MessageUpdatedSchema>;

/**
 * Delete message payload
 */
export const DeleteMessageSchema = z.object({
  event: z.literal('message:delete'),
  messageId: z.string(),
  correlationId: z.string().optional(),
});

export type DeleteMessage = z.infer<typeof DeleteMessageSchema>;

/**
 * Message deleted event
 */
export const MessageDeletedSchema = z.object({
  event: z.literal('message:deleted'),
  messageId: z.string(),
  topicId: z.string(),
  correlationId: z.string().optional(),
});

export type MessageDeleted = z.infer<typeof MessageDeletedSchema>;

// ============================================================================
// Reaction Events
// ============================================================================

/**
 * Add reaction payload
 */
export const AddReactionSchema = z.object({
  event: z.literal('reaction:add'),
  messageId: z.string(),
  type: z.string().min(1).max(50),
  correlationId: z.string().optional(),
});

export type AddReaction = z.infer<typeof AddReactionSchema>;

/**
 * Reaction added event
 */
export const ReactionAddedSchema = z.object({
  event: z.literal('reaction:added'),
  messageId: z.string(),
  topicId: z.string(),
  userId: z.string(),
  type: z.string(),
  reactionCounts: z.record(z.string(), z.number()),
  correlationId: z.string().optional(),
});

export type ReactionAdded = z.infer<typeof ReactionAddedSchema>;

/**
 * Remove reaction payload
 */
export const RemoveReactionSchema = z.object({
  event: z.literal('reaction:remove'),
  messageId: z.string(),
  type: z.string(),
  correlationId: z.string().optional(),
});

export type RemoveReaction = z.infer<typeof RemoveReactionSchema>;

/**
 * Reaction removed event
 */
export const ReactionRemovedSchema = z.object({
  event: z.literal('reaction:removed'),
  messageId: z.string(),
  topicId: z.string(),
  userId: z.string(),
  type: z.string(),
  reactionCounts: z.record(z.string(), z.number()),
  correlationId: z.string().optional(),
});

export type ReactionRemoved = z.infer<typeof ReactionRemovedSchema>;

// ============================================================================
// Typing Events
// ============================================================================

/**
 * Start typing indicator
 */
export const StartTypingSchema = z.object({
  event: z.literal('typing:start'),
  topicId: z.string(),
});

export type StartTyping = z.infer<typeof StartTypingSchema>;

/**
 * Stop typing indicator
 */
export const StopTypingSchema = z.object({
  event: z.literal('typing:stop'),
  topicId: z.string(),
});

export type StopTyping = z.infer<typeof StopTypingSchema>;

/**
 * User typing event (broadcast to topic)
 */
export const UserTypingSchema = z.object({
  event: z.literal('typing:user'),
  topicId: z.string(),
  userId: z.string(),
  displayName: z.string(),
  isTyping: z.boolean(),
});

export type UserTyping = z.infer<typeof UserTypingSchema>;

// ============================================================================
// Presence Events
// ============================================================================

/**
 * User online event
 */
export const UserOnlineSchema = z.object({
  event: z.literal('presence:online'),
  userId: z.string(),
  status: z.enum(['ONLINE', 'AWAY', 'DO_NOT_DISTURB']),
});

export type UserOnline = z.infer<typeof UserOnlineSchema>;

/**
 * User offline event
 */
export const UserOfflineSchema = z.object({
  event: z.literal('presence:offline'),
  userId: z.string(),
  lastSeenAt: z.string().datetime(),
});

export type UserOffline = z.infer<typeof UserOfflineSchema>;

/**
 * Presence subscription
 */
export const SubscribePresenceSchema = z.object({
  event: z.literal('presence:subscribe'),
  userIds: z.array(z.string()),
});

export type SubscribePresence = z.infer<typeof SubscribePresenceSchema>;

// ============================================================================
// Topic Events
// ============================================================================

/**
 * Join topic (subscribe to updates)
 */
export const JoinTopicSchema = z.object({
  event: z.literal('topic:join'),
  topicId: z.string(),
});

export type JoinTopic = z.infer<typeof JoinTopicSchema>;

/**
 * Leave topic (unsubscribe from updates)
 */
export const LeaveTopicSchema = z.object({
  event: z.literal('topic:leave'),
  topicId: z.string(),
});

export type LeaveTopic = z.infer<typeof LeaveTopicSchema>;

/**
 * Mark topic as read
 */
export const MarkReadSchema = z.object({
  event: z.literal('topic:read'),
  topicId: z.string(),
  lastMessageId: z.string().optional(),
});

export type MarkRead = z.infer<typeof MarkReadSchema>;

/**
 * Topic read receipt (broadcast to sender)
 */
export const ReadReceiptSchema = z.object({
  event: z.literal('topic:read_receipt'),
  topicId: z.string(),
  userId: z.string(),
  lastReadMessageId: z.string(),
});

export type ReadReceipt = z.infer<typeof ReadReceiptSchema>;

// ============================================================================
// Union Types for Message Handling
// ============================================================================

/**
 * All client-to-server message types
 */
export const ClientMessageSchema = z.discriminatedUnion('event', [
  AuthenticateSchema,
  SendMessageSchema,
  EditMessageSchema,
  DeleteMessageSchema,
  AddReactionSchema,
  RemoveReactionSchema,
  StartTypingSchema,
  StopTypingSchema,
  SubscribePresenceSchema,
  JoinTopicSchema,
  LeaveTopicSchema,
  MarkReadSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

/**
 * All server-to-client message types
 */
export const ServerMessageSchema = z.discriminatedUnion('event', [
  AuthenticatedSchema,
  WsErrorSchema,
  MessageCreatedSchema,
  MessageUpdatedSchema,
  MessageDeletedSchema,
  ReactionAddedSchema,
  ReactionRemovedSchema,
  UserTypingSchema,
  UserOnlineSchema,
  UserOfflineSchema,
  ReadReceiptSchema,
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;

// ============================================================================
// WebSocket Event Names
// ============================================================================

/**
 * All WebSocket event names
 * @constant
 */
export const WS_EVENTS = {
  // Authentication
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',

  // Messages
  MESSAGE_SEND: 'message:send',
  MESSAGE_CREATED: 'message:created',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_DELETED: 'message:deleted',

  // Reactions
  REACTION_ADD: 'reaction:add',
  REACTION_ADDED: 'reaction:added',
  REACTION_REMOVE: 'reaction:remove',
  REACTION_REMOVED: 'reaction:removed',

  // Typing
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_USER: 'typing:user',

  // Presence
  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',
  PRESENCE_SUBSCRIBE: 'presence:subscribe',

  // Topics
  TOPIC_JOIN: 'topic:join',
  TOPIC_LEAVE: 'topic:leave',
  TOPIC_READ: 'topic:read',
  TOPIC_READ_RECEIPT: 'topic:read_receipt',

  // Errors
  ERROR: 'error',
} as const;
