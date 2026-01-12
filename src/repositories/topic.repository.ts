/**
 * @fileoverview Topic repository for data access
 * @description Handles topic and topic settings persistence operations
 * @module repositories/topic
 */

import { Injectable } from '@nestjs/common';
import { Topic, TopicSetting, TopicType, DEFAULT_NOTIFICATION_SETTINGS } from '../entities/topic.entity';
import { InMemoryRepository, IRepository } from './base.repository';

/**
 * Topic repository interface with topic-specific methods
 * @interface ITopicRepository
 * @extends IRepository<Topic>
 */
export interface ITopicRepository extends IRepository<Topic> {
  /**
   * Finds a direct message topic between two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<Topic | null>} DM topic or null
   */
  findDirectMessageTopic(userId1: string, userId2: string): Promise<Topic | null>;

  /**
   * Finds topics for a group
   * @param {string} groupId - Group ID
   * @returns {Promise<Topic[]>} Topics in the group
   */
  findByGroup(groupId: string): Promise<Topic[]>;

  /**
   * Finds topics a user participates in
   * @param {string} userId - User ID
   * @returns {Promise<Topic[]>} User's topics
   */
  findUserTopics(userId: string): Promise<Topic[]>;

  /**
   * Updates the last message info for a topic
   * @param {string} topicId - Topic ID
   * @param {string} messageId - Last message ID
   * @param {Date} messageTime - Last message timestamp
   * @returns {Promise<void>}
   */
  updateLastMessage(topicId: string, messageId: string, messageTime: Date): Promise<void>;
}

/**
 * Topic settings repository interface
 * @interface ITopicSettingRepository
 * @extends IRepository<TopicSetting>
 */
export interface ITopicSettingRepository extends IRepository<TopicSetting> {
  /**
   * Finds settings for a user in a topic
   * @param {string} topicId - Topic ID
   * @param {string} userId - User ID
   * @returns {Promise<TopicSetting | null>} Settings or null
   */
  findByTopicAndUser(topicId: string, userId: string): Promise<TopicSetting | null>;

  /**
   * Gets or creates settings for a user in a topic
   * @param {string} topicId - Topic ID
   * @param {string} userId - User ID
   * @returns {Promise<TopicSetting>} Settings (created with defaults if not exists)
   */
  getOrCreate(topicId: string, userId: string): Promise<TopicSetting>;

  /**
   * Finds pinned topics for a user
   * @param {string} userId - User ID
   * @returns {Promise<TopicSetting[]>} Settings for pinned topics
   */
  findPinnedForUser(userId: string): Promise<TopicSetting[]>;

  /**
   * Updates unread count for a user in a topic
   * @param {string} topicId - Topic ID
   * @param {string} userId - User ID
   * @param {number} count - New unread count
   * @returns {Promise<void>}
   */
  updateUnreadCount(topicId: string, userId: string, count: number): Promise<void>;

  /**
   * Marks all messages as read for a user in a topic
   * @param {string} topicId - Topic ID
   * @param {string} userId - User ID
   * @param {string} lastMessageId - ID of last read message
   * @returns {Promise<void>}
   */
  markAsRead(topicId: string, userId: string, lastMessageId: string): Promise<void>;
}

/**
 * In-memory topic repository implementation
 * @class TopicRepository
 * @extends InMemoryRepository<Topic>
 * @implements {ITopicRepository}
 */
@Injectable()
export class TopicRepository extends InMemoryRepository<Topic> implements ITopicRepository {
  async findDirectMessageTopic(userId1: string, userId2: string): Promise<Topic | null> {
    const topics = await this.findMany({
      where: { type: TopicType.DIRECT } as Partial<Topic>,
    });

    return (
      topics.find((topic) => {
        const participants = topic.participantIds;
        return (
          participants.length === 2 &&
          participants.includes(userId1) &&
          participants.includes(userId2)
        );
      }) ?? null
    );
  }

  async findByGroup(groupId: string): Promise<Topic[]> {
    return this.findMany({
      where: { groupId } as Partial<Topic>,
      orderBy: [{ field: 'lastMessageAt', direction: 'desc' }],
    });
  }

  async findUserTopics(userId: string): Promise<Topic[]> {
    const allTopics = await this.findMany({
      orderBy: [{ field: 'lastMessageAt', direction: 'desc' }],
    });

    return allTopics.filter((topic) => {
      if (topic.type === TopicType.DIRECT) {
        return topic.participantIds.includes(userId);
      }
      // For group topics, membership should be checked via GroupMemberRepository
      // This is a simplified implementation
      return true;
    });
  }

  async updateLastMessage(topicId: string, messageId: string, messageTime: Date): Promise<void> {
    const topic = await this.findById(topicId);
    if (topic) {
      await this.update(topicId, {
        lastMessageId: messageId,
        lastMessageAt: messageTime,
      } as Partial<Omit<Topic, keyof import('../entities/base.entity').BaseEntity>>);
    }
  }
}

/**
 * In-memory topic settings repository implementation
 * @class TopicSettingRepository
 * @extends InMemoryRepository<TopicSetting>
 * @implements {ITopicSettingRepository}
 */
@Injectable()
export class TopicSettingRepository
  extends InMemoryRepository<TopicSetting>
  implements ITopicSettingRepository
{
  async findByTopicAndUser(topicId: string, userId: string): Promise<TopicSetting | null> {
    return this.findOne({
      where: { topicId, userId } as Partial<TopicSetting>,
    });
  }

  async getOrCreate(topicId: string, userId: string): Promise<TopicSetting> {
    let settings = await this.findByTopicAndUser(topicId, userId);

    if (!settings) {
      settings = await this.create({
        topicId,
        userId,
        isPinned: false,
        isMuted: false,
        lastReadMessageId: null,
        unreadCount: 0,
        notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
      } as Omit<TopicSetting, keyof import('../entities/base.entity').BaseEntity>);
    }

    return settings;
  }

  async findPinnedForUser(userId: string): Promise<TopicSetting[]> {
    return this.findMany({
      where: { userId, isPinned: true } as Partial<TopicSetting>,
    });
  }

  async updateUnreadCount(topicId: string, userId: string, count: number): Promise<void> {
    const settings = await this.getOrCreate(topicId, userId);
    await this.update(settings.id, { unreadCount: count } as Partial<
      Omit<TopicSetting, keyof import('../entities/base.entity').BaseEntity>
    >);
  }

  async markAsRead(topicId: string, userId: string, lastMessageId: string): Promise<void> {
    const settings = await this.getOrCreate(topicId, userId);
    await this.update(settings.id, {
      lastReadMessageId: lastMessageId,
      unreadCount: 0,
    } as Partial<Omit<TopicSetting, keyof import('../entities/base.entity').BaseEntity>>);
  }
}
