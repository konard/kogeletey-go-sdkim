/**
 * @fileoverview Message service
 * @description Handles message CRUD operations, reactions, and real-time updates
 * @module services/message
 */

import { Injectable } from '@nestjs/common';
import {
  Message,
  MessageType,
  MessageStatus,
  CreateMessageInput,
  UpdateMessageInput,
  MessagePaginationOptions,
  PaginatedMessages,
} from '../entities/message.entity';
import { MessageRepository } from '../repositories/message.repository';
import { TopicRepository, TopicSettingRepository } from '../repositories/topic.repository';
import { ReactionRepository } from '../repositories/reaction.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  MessageNotFoundError,
  TopicNotFoundError,
  PermissionError,
  ValidationError,
} from '../errors/domain.errors';

/**
 * Maximum message content length
 * @constant
 */
const MAX_MESSAGE_LENGTH = 4000;

/**
 * Message service
 * @description Handles all message-related business logic
 * @class MessageService
 */
@Injectable()
export class MessageService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly topicRepository: TopicRepository,
    private readonly topicSettingRepository: TopicSettingRepository,
    private readonly reactionRepository: ReactionRepository,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Sends a new message
   * @param {string} senderId - ID of the sender
   * @param {CreateMessageInput} input - Message data
   * @returns {Promise<Message>} Created message
   * @throws {TopicNotFoundError} If topic doesn't exist
   * @throws {ValidationError} If message content is too long
   * @side-effect Updates topic's lastMessage info
   * @side-effect Increments unread count for other participants
   */
  async sendMessage(senderId: string, input: CreateMessageInput): Promise<Message> {
    // Validate topic exists
    const topic = await this.topicRepository.findById(input.topicId);
    if (!topic) {
      throw new TopicNotFoundError(input.topicId);
    }

    // Validate message content length
    if (input.content.length > MAX_MESSAGE_LENGTH) {
      throw new ValidationError(`Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }

    // Determine message type
    let type = input.type || MessageType.TEXT;
    if (input.replyToId) {
      type = MessageType.REPLY;
      // Validate reply target exists
      const replyTo = await this.messageRepository.findById(input.replyToId);
      if (!replyTo) {
        throw new MessageNotFoundError(input.replyToId);
      }
    }
    if (input.mediaIds && input.mediaIds.length > 0) {
      type = MessageType.MEDIA;
    }

    // Create message
    const message = await this.messageRepository.create({
      topicId: input.topicId,
      senderId,
      content: input.content,
      type,
      status: MessageStatus.SENT,
      replyToId: input.replyToId ?? null,
      isPinned: false,
      isEdited: false,
      editedAt: null,
      mediaIds: input.mediaIds ?? [],
      mentionedUserIds: input.mentionedUserIds ?? [],
      reactionCounts: {},
    });

    // Update topic's last message
    // Note: In production, this would be done in a transaction
    await this.topicRepository.updateLastMessage(input.topicId, message.id, message.createdAt);

    // Update unread counts for other participants
    // Note: WebSocket messages are fire-and-forget; delivery status is stored in DB for eventual consistency
    const participants = topic.participantIds.filter((id) => id !== senderId);
    for (const participantId of participants) {
      const settings = await this.topicSettingRepository.getOrCreate(input.topicId, participantId);
      await this.topicSettingRepository.updateUnreadCount(
        input.topicId,
        participantId,
        settings.unreadCount + 1
      );
    }

    return message;
  }

  /**
   * Gets messages from a topic with pagination
   * @param {string} topicId - Topic ID
   * @param {MessagePaginationOptions} [options] - Pagination options
   * @returns {Promise<PaginatedMessages>} Paginated messages
   * @throws {TopicNotFoundError} If topic doesn't exist
   */
  async getMessages(topicId: string, options?: MessagePaginationOptions): Promise<PaginatedMessages> {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new TopicNotFoundError(topicId);
    }

    return this.messageRepository.findByTopic(topicId, options);
  }

  /**
   * Gets a single message by ID
   * @param {string} messageId - Message ID
   * @returns {Promise<Message>} Message
   * @throws {MessageNotFoundError} If message doesn't exist
   */
  async getMessage(messageId: string): Promise<Message> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new MessageNotFoundError(messageId);
    }
    return message;
  }

  /**
   * Edits an existing message
   * @param {string} userId - ID of the user editing
   * @param {string} messageId - Message ID
   * @param {UpdateMessageInput} input - Update data
   * @returns {Promise<Message>} Updated message
   * @throws {MessageNotFoundError} If message doesn't exist
   * @throws {PermissionError} If user is not the message author
   * @throws {ValidationError} If content is too long
   * @side-effect Sets isEdited flag and editedAt timestamp
   */
  async editMessage(userId: string, messageId: string, input: UpdateMessageInput): Promise<Message> {
    const message = await this.getMessage(messageId);

    // Only the sender can edit their message
    if (message.senderId !== userId) {
      throw new PermissionError('Only the message author can edit this message', 'edit', 'message');
    }

    // Validate content length if provided
    if (input.content && input.content.length > MAX_MESSAGE_LENGTH) {
      throw new ValidationError(`Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }

    // Update message
    const updates: Partial<Omit<Message, keyof import('../entities/base.entity').BaseEntity>> = {};

    if (input.content !== undefined) {
      updates.content = input.content;
      updates.isEdited = true;
      updates.editedAt = new Date();
    }

    if (input.isPinned !== undefined) {
      updates.isPinned = input.isPinned;
    }

    return this.messageRepository.update(messageId, updates);
  }

  /**
   * Deletes a message (soft delete)
   * @param {string} userId - ID of the user deleting
   * @param {string} messageId - Message ID
   * @returns {Promise<void>}
   * @throws {MessageNotFoundError} If message doesn't exist
   * @throws {PermissionError} If user is not the message author
   */
  async deleteMessage(userId: string, messageId: string): Promise<void> {
    const message = await this.getMessage(messageId);

    // Only the sender can delete their message
    if (message.senderId !== userId) {
      throw new PermissionError('Only the message author can delete this message', 'delete', 'message');
    }

    await this.messageRepository.softDelete(messageId);
  }

  /**
   * Pins a message in a topic
   * @param {string} userId - ID of the user pinning
   * @param {string} messageId - Message ID
   * @returns {Promise<Message>} Updated message
   * @throws {MessageNotFoundError} If message doesn't exist
   */
  async pinMessage(userId: string, messageId: string): Promise<Message> {
    const message = await this.getMessage(messageId);

    // TODO: Add permission check for pin action (admin/moderator)

    return this.messageRepository.update(messageId, { isPinned: true } as Partial<
      Omit<Message, keyof import('../entities/base.entity').BaseEntity>
    >);
  }

  /**
   * Unpins a message in a topic
   * @param {string} userId - ID of the user unpinning
   * @param {string} messageId - Message ID
   * @returns {Promise<Message>} Updated message
   * @throws {MessageNotFoundError} If message doesn't exist
   */
  async unpinMessage(userId: string, messageId: string): Promise<Message> {
    const message = await this.getMessage(messageId);

    return this.messageRepository.update(messageId, { isPinned: false } as Partial<
      Omit<Message, keyof import('../entities/base.entity').BaseEntity>
    >);
  }

  /**
   * Gets pinned messages in a topic
   * @param {string} topicId - Topic ID
   * @returns {Promise<Message[]>} Pinned messages
   * @throws {TopicNotFoundError} If topic doesn't exist
   */
  async getPinnedMessages(topicId: string): Promise<Message[]> {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new TopicNotFoundError(topicId);
    }

    return this.messageRepository.findPinnedByTopic(topicId);
  }

  /**
   * Adds a reaction to a message
   * @param {string} userId - ID of the user reacting
   * @param {string} messageId - Message ID
   * @param {string} reactionType - Reaction type/emoji
   * @returns {Promise<Message>} Updated message with new reaction counts
   * @throws {MessageNotFoundError} If message doesn't exist
   * @side-effect Creates a reaction record
   * @side-effect Updates message reaction counts
   */
  async addReaction(userId: string, messageId: string, reactionType: string): Promise<Message> {
    const message = await this.getMessage(messageId);

    // Check if reaction already exists
    const existing = await this.reactionRepository.findReaction(messageId, userId, reactionType);
    if (existing) {
      // Already reacted, return message as-is
      return message;
    }

    // Create reaction
    await this.reactionRepository.create({
      messageId,
      userId,
      type: reactionType,
    });

    // Update message reaction counts
    const counts = await this.reactionRepository.getReactionCounts(messageId);
    return this.messageRepository.update(messageId, { reactionCounts: counts } as Partial<
      Omit<Message, keyof import('../entities/base.entity').BaseEntity>
    >);
  }

  /**
   * Removes a reaction from a message
   * @param {string} userId - ID of the user removing reaction
   * @param {string} messageId - Message ID
   * @param {string} reactionType - Reaction type/emoji
   * @returns {Promise<Message>} Updated message with updated reaction counts
   * @throws {MessageNotFoundError} If message doesn't exist
   * @side-effect Removes the reaction record
   * @side-effect Updates message reaction counts
   */
  async removeReaction(userId: string, messageId: string, reactionType: string): Promise<Message> {
    const message = await this.getMessage(messageId);

    // Remove reaction
    await this.reactionRepository.removeReaction(messageId, userId, reactionType);

    // Update message reaction counts
    const counts = await this.reactionRepository.getReactionCounts(messageId);
    return this.messageRepository.update(messageId, { reactionCounts: counts } as Partial<
      Omit<Message, keyof import('../entities/base.entity').BaseEntity>
    >);
  }

  /**
   * Creates a reply to a message
   * @param {string} senderId - ID of the sender
   * @param {string} replyToId - ID of the message being replied to
   * @param {string} content - Reply content
   * @param {string[]} [mediaIds] - Optional media attachments
   * @returns {Promise<Message>} Created reply message
   * @throws {MessageNotFoundError} If original message doesn't exist
   */
  async replyMessage(
    senderId: string,
    replyToId: string,
    content: string,
    mediaIds?: string[]
  ): Promise<Message> {
    const originalMessage = await this.getMessage(replyToId);

    return this.sendMessage(senderId, {
      topicId: originalMessage.topicId,
      content,
      type: MessageType.REPLY,
      replyToId,
      mediaIds,
    });
  }

  /**
   * Marks messages in a topic as read for a user
   * @param {string} userId - User ID
   * @param {string} topicId - Topic ID
   * @param {string} [lastMessageId] - ID of last read message (defaults to most recent)
   * @returns {Promise<void>}
   * @throws {TopicNotFoundError} If topic doesn't exist
   * @side-effect Updates TopicSetting with lastReadMessageId and resets unreadCount
   */
  async markAsRead(userId: string, topicId: string, lastMessageId?: string): Promise<void> {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new TopicNotFoundError(topicId);
    }

    // Use provided lastMessageId or get the topic's last message
    const messageId = lastMessageId || topic.lastMessageId;
    if (messageId) {
      await this.topicSettingRepository.markAsRead(topicId, userId, messageId);
    }
  }

  /**
   * Searches messages by content
   * @param {string | null} topicId - Topic ID (null to search all accessible topics)
   * @param {string} query - Search query
   * @param {number} [limit=20] - Maximum results
   * @returns {Promise<Message[]>} Matching messages
   */
  async searchMessages(topicId: string | null, query: string, limit = 20): Promise<Message[]> {
    if (topicId) {
      const topic = await this.topicRepository.findById(topicId);
      if (!topic) {
        throw new TopicNotFoundError(topicId);
      }
    }

    return this.messageRepository.searchByContent(topicId, query, limit);
  }
}
