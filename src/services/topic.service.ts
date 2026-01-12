/**
 * @fileoverview Topic service
 * @description Handles topic/conversation management including DMs and group topics
 * @module services/topic
 */

import { Injectable } from '@nestjs/common';
import {
  Topic,
  TopicType,
  TopicSetting,
  CreateTopicInput,
  UpdateTopicSettingInput,
} from '../entities/topic.entity';
import { TopicRepository, TopicSettingRepository } from '../repositories/topic.repository';
import { UserRepository } from '../repositories/user.repository';
import { GroupRepository } from '../repositories/group.repository';
import { TopicNotFoundError, UserNotFoundError, GroupNotFoundError, ValidationError } from '../errors/domain.errors';

/**
 * Topic service
 * @description Handles all topic-related business logic
 * @class TopicService
 */
@Injectable()
export class TopicService {
  constructor(
    private readonly topicRepository: TopicRepository,
    private readonly topicSettingRepository: TopicSettingRepository,
    private readonly userRepository: UserRepository,
    private readonly groupRepository: GroupRepository
  ) {}

  /**
   * Creates a new topic
   * @param {string} creatorId - ID of the topic creator
   * @param {CreateTopicInput} input - Topic creation data
   * @returns {Promise<Topic>} Created topic
   * @throws {ValidationError} If input is invalid
   * @throws {UserNotFoundError} If participant doesn't exist
   * @throws {GroupNotFoundError} If group doesn't exist
   * @side-effect Creates TopicSettings for all participants
   */
  async createTopic(creatorId: string, input: CreateTopicInput): Promise<Topic> {
    // Validate based on type
    if (input.type === TopicType.DIRECT) {
      if (!input.participantIds || input.participantIds.length !== 1) {
        throw new ValidationError('Direct message topics require exactly one other participant');
      }

      const otherUserId = input.participantIds[0];

      // Check if DM topic already exists
      const existingTopic = await this.topicRepository.findDirectMessageTopic(creatorId, otherUserId);
      if (existingTopic) {
        return existingTopic; // Return existing DM topic instead of creating duplicate
      }

      // Verify other user exists
      const otherUser = await this.userRepository.findById(otherUserId);
      if (!otherUser) {
        throw new UserNotFoundError(otherUserId);
      }
    }

    if (input.type === TopicType.GROUP) {
      if (!input.groupId) {
        throw new ValidationError('Group topics require a groupId');
      }

      // Verify group exists
      const group = await this.groupRepository.findById(input.groupId);
      if (!group) {
        throw new GroupNotFoundError(input.groupId);
      }
    }

    // Build participant IDs
    let participantIds: string[];
    if (input.type === TopicType.DIRECT) {
      participantIds = [creatorId, ...(input.participantIds || [])];
    } else {
      participantIds = input.participantIds || [creatorId];
    }

    // Create topic
    const topic = await this.topicRepository.create({
      title: input.title ?? null,
      type: input.type,
      groupId: input.groupId ?? null,
      lastMessageId: null,
      lastMessageAt: null,
      participantIds,
      isArchived: false,
    });

    // Create settings for all participants
    for (const participantId of participantIds) {
      await this.topicSettingRepository.getOrCreate(topic.id, participantId);
    }

    return topic;
  }

  /**
   * Gets or creates a direct message topic between two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<Topic>} DM topic
   * @throws {UserNotFoundError} If either user doesn't exist
   */
  async getOrCreateDirectMessageTopic(userId1: string, userId2: string): Promise<Topic> {
    // Check for existing DM topic
    const existingTopic = await this.topicRepository.findDirectMessageTopic(userId1, userId2);
    if (existingTopic) {
      return existingTopic;
    }

    // Create new DM topic
    return this.createTopic(userId1, {
      type: TopicType.DIRECT,
      participantIds: [userId2],
    });
  }

  /**
   * Gets a topic by ID
   * @param {string} topicId - Topic ID
   * @returns {Promise<Topic>} Topic
   * @throws {TopicNotFoundError} If topic doesn't exist
   */
  async getTopic(topicId: string): Promise<Topic> {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new TopicNotFoundError(topicId);
    }
    return topic;
  }

  /**
   * Gets topics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Topic[]>} User's topics sorted by last message time
   */
  async getUserTopics(userId: string): Promise<Topic[]> {
    return this.topicRepository.findUserTopics(userId);
  }

  /**
   * Gets topics for a group
   * @param {string} groupId - Group ID
   * @returns {Promise<Topic[]>} Group's topics
   * @throws {GroupNotFoundError} If group doesn't exist
   */
  async getGroupTopics(groupId: string): Promise<Topic[]> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new GroupNotFoundError(groupId);
    }
    return this.topicRepository.findByGroup(groupId);
  }

  /**
   * Gets topic settings for a user
   * @param {string} topicId - Topic ID
   * @param {string} userId - User ID
   * @returns {Promise<TopicSetting>} Topic settings
   * @throws {TopicNotFoundError} If topic doesn't exist
   */
  async getTopicSettings(topicId: string, userId: string): Promise<TopicSetting> {
    await this.getTopic(topicId); // Verify topic exists
    return this.topicSettingRepository.getOrCreate(topicId, userId);
  }

  /**
   * Updates topic settings for a user
   * @param {string} userId - User ID
   * @param {string} topicId - Topic ID
   * @param {UpdateTopicSettingInput} input - Settings update data
   * @returns {Promise<TopicSetting>} Updated settings
   * @throws {TopicNotFoundError} If topic doesn't exist
   * @side-effect Updates TopicSetting record
   */
  async updateTopicSettings(
    userId: string,
    topicId: string,
    input: UpdateTopicSettingInput
  ): Promise<TopicSetting> {
    await this.getTopic(topicId); // Verify topic exists
    const settings = await this.topicSettingRepository.getOrCreate(topicId, userId);

    const updates: Partial<Omit<TopicSetting, keyof import('../entities/base.entity').BaseEntity>> = {};

    if (input.isPinned !== undefined) updates.isPinned = input.isPinned;
    if (input.isMuted !== undefined) updates.isMuted = input.isMuted;
    if (input.notificationSettings) {
      updates.notificationSettings = {
        ...settings.notificationSettings,
        ...input.notificationSettings,
      };
    }

    return this.topicSettingRepository.update(settings.id, updates);
  }

  /**
   * Pins a topic for a user
   * @param {string} userId - User ID
   * @param {string} topicId - Topic ID
   * @returns {Promise<TopicSetting>} Updated settings
   * @throws {TopicNotFoundError} If topic doesn't exist
   */
  async pinTopic(userId: string, topicId: string): Promise<TopicSetting> {
    return this.updateTopicSettings(userId, topicId, { isPinned: true });
  }

  /**
   * Unpins a topic for a user
   * @param {string} userId - User ID
   * @param {string} topicId - Topic ID
   * @returns {Promise<TopicSetting>} Updated settings
   * @throws {TopicNotFoundError} If topic doesn't exist
   */
  async unpinTopic(userId: string, topicId: string): Promise<TopicSetting> {
    return this.updateTopicSettings(userId, topicId, { isPinned: false });
  }

  /**
   * Mutes a topic for a user
   * @param {string} userId - User ID
   * @param {string} topicId - Topic ID
   * @returns {Promise<TopicSetting>} Updated settings
   * @throws {TopicNotFoundError} If topic doesn't exist
   */
  async muteTopic(userId: string, topicId: string): Promise<TopicSetting> {
    return this.updateTopicSettings(userId, topicId, { isMuted: true });
  }

  /**
   * Unmutes a topic for a user
   * @param {string} userId - User ID
   * @param {string} topicId - Topic ID
   * @returns {Promise<TopicSetting>} Updated settings
   * @throws {TopicNotFoundError} If topic doesn't exist
   */
  async unmuteTopic(userId: string, topicId: string): Promise<TopicSetting> {
    return this.updateTopicSettings(userId, topicId, { isMuted: false });
  }

  /**
   * Gets pinned topics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Topic[]>} Pinned topics
   */
  async getPinnedTopics(userId: string): Promise<Topic[]> {
    const pinnedSettings = await this.topicSettingRepository.findPinnedForUser(userId);
    const topics: Topic[] = [];

    for (const settings of pinnedSettings) {
      const topic = await this.topicRepository.findById(settings.topicId);
      if (topic) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Marks all messages in a topic as read for a user
   * @param {string} userId - User ID
   * @param {string} topicId - Topic ID
   * @returns {Promise<void>}
   * @throws {TopicNotFoundError} If topic doesn't exist
   * @side-effect Updates TopicSetting with lastReadMessageId and resets unreadCount
   */
  async markTopicAsRead(userId: string, topicId: string): Promise<void> {
    const topic = await this.getTopic(topicId);

    if (topic.lastMessageId) {
      await this.topicSettingRepository.markAsRead(topicId, userId, topic.lastMessageId);
    }
  }

  /**
   * Archives a topic
   * @param {string} topicId - Topic ID
   * @returns {Promise<Topic>} Archived topic
   * @throws {TopicNotFoundError} If topic doesn't exist
   */
  async archiveTopic(topicId: string): Promise<Topic> {
    await this.getTopic(topicId);
    return this.topicRepository.update(topicId, { isArchived: true } as Partial<
      Omit<Topic, keyof import('../entities/base.entity').BaseEntity>
    >);
  }

  /**
   * Unarchives a topic
   * @param {string} topicId - Topic ID
   * @returns {Promise<Topic>} Unarchived topic
   * @throws {TopicNotFoundError} If topic doesn't exist
   */
  async unarchiveTopic(topicId: string): Promise<Topic> {
    await this.getTopic(topicId);
    return this.topicRepository.update(topicId, { isArchived: false } as Partial<
      Omit<Topic, keyof import('../entities/base.entity').BaseEntity>
    >);
  }

  /**
   * Gets unread counts for a user across all topics
   * @param {string} userId - User ID
   * @returns {Promise<Record<string, number>>} Topic ID to unread count map
   */
  async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const topics = await this.getUserTopics(userId);
    const counts: Record<string, number> = {};

    for (const topic of topics) {
      const settings = await this.topicSettingRepository.getOrCreate(topic.id, userId);
      counts[topic.id] = settings.unreadCount;
    }

    return counts;
  }
}
