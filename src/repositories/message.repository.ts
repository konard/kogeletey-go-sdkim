/**
 * @fileoverview Message repository for data access
 * @description Handles message persistence operations
 * @module repositories/message
 */

import { Injectable } from '@nestjs/common';
import { Message, MessagePaginationOptions, PaginatedMessages } from '../entities/message.entity';
import { InMemoryRepository, IRepository } from './base.repository';

/**
 * Message repository interface with message-specific methods
 * @interface IMessageRepository
 * @extends IRepository<Message>
 */
export interface IMessageRepository extends IRepository<Message> {
  /**
   * Finds messages in a topic with cursor-based pagination
   * @param {string} topicId - Topic ID
   * @param {MessagePaginationOptions} options - Pagination options
   * @returns {Promise<PaginatedMessages>} Paginated messages
   */
  findByTopic(topicId: string, options?: MessagePaginationOptions): Promise<PaginatedMessages>;

  /**
   * Finds pinned messages in a topic
   * @param {string} topicId - Topic ID
   * @returns {Promise<Message[]>} Pinned messages
   */
  findPinnedByTopic(topicId: string): Promise<Message[]>;

  /**
   * Finds messages mentioning a user
   * @param {string} userId - User ID
   * @param {number} [limit=50] - Maximum messages to return
   * @returns {Promise<Message[]>} Messages mentioning the user
   */
  findMentioningUser(userId: string, limit?: number): Promise<Message[]>;

  /**
   * Gets the last message in a topic
   * @param {string} topicId - Topic ID
   * @returns {Promise<Message | null>} Last message or null
   */
  getLastMessageInTopic(topicId: string): Promise<Message | null>;

  /**
   * Counts unread messages for a user in a topic
   * @param {string} topicId - Topic ID
   * @param {string} lastReadMessageId - ID of last read message
   * @returns {Promise<number>} Count of unread messages
   */
  countUnread(topicId: string, lastReadMessageId: string | null): Promise<number>;

  /**
   * Searches messages by content
   * @param {string} topicId - Topic ID (optional, searches all if not provided)
   * @param {string} query - Search query
   * @param {number} [limit=20] - Maximum results
   * @returns {Promise<Message[]>} Matching messages
   */
  searchByContent(topicId: string | null, query: string, limit?: number): Promise<Message[]>;
}

/**
 * In-memory message repository implementation
 * @description Development/testing implementation - replace with actual database in production
 * @class MessageRepository
 * @extends InMemoryRepository<Message>
 * @implements {IMessageRepository}
 */
@Injectable()
export class MessageRepository extends InMemoryRepository<Message> implements IMessageRepository {
  async findByTopic(topicId: string, options: MessagePaginationOptions = {}): Promise<PaginatedMessages> {
    const { limit = 50, cursor, direction = 'before' } = options;

    let messages = await this.findMany({
      where: { topicId } as Partial<Message>,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });

    // Apply cursor-based pagination
    if (cursor) {
      const cursorIndex = messages.findIndex((m) => m.id === cursor);
      if (cursorIndex !== -1) {
        if (direction === 'before') {
          messages = messages.slice(cursorIndex + 1);
        } else {
          messages = messages.slice(0, cursorIndex);
        }
      }
    }

    // Get one extra to check if there are more
    const hasMore = messages.length > limit;
    const resultMessages = messages.slice(0, limit);
    const nextCursor = hasMore ? resultMessages[resultMessages.length - 1]?.id ?? null : null;

    // Transform to MessageWithSender (in real impl, join with user table)
    const messagesWithSender = resultMessages.map((m) => ({
      ...m,
      sender: {
        id: m.senderId,
        displayName: 'User',
        username: 'user',
        avatarUrl: null,
      },
    }));

    return {
      messages: messagesWithSender,
      hasMore,
      nextCursor,
    };
  }

  async findPinnedByTopic(topicId: string): Promise<Message[]> {
    return this.findMany({
      where: { topicId, isPinned: true } as Partial<Message>,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });
  }

  async findMentioningUser(userId: string, limit = 50): Promise<Message[]> {
    const allMessages = await this.findMany({
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });

    return allMessages.filter((m) => m.mentionedUserIds.includes(userId)).slice(0, limit);
  }

  async getLastMessageInTopic(topicId: string): Promise<Message | null> {
    const messages = await this.findMany({
      where: { topicId } as Partial<Message>,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      take: 1,
    });
    return messages[0] || null;
  }

  async countUnread(topicId: string, lastReadMessageId: string | null): Promise<number> {
    const messages = await this.findMany({
      where: { topicId } as Partial<Message>,
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    });

    if (!lastReadMessageId) {
      return messages.length;
    }

    const lastReadIndex = messages.findIndex((m) => m.id === lastReadMessageId);
    if (lastReadIndex === -1) {
      return messages.length;
    }

    return messages.length - lastReadIndex - 1;
  }

  async searchByContent(topicId: string | null, query: string, limit = 20): Promise<Message[]> {
    const lowerQuery = query.toLowerCase();
    let messages = await this.findMany({
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });

    if (topicId) {
      messages = messages.filter((m) => m.topicId === topicId);
    }

    return messages.filter((m) => m.content.toLowerCase().includes(lowerQuery)).slice(0, limit);
  }
}
