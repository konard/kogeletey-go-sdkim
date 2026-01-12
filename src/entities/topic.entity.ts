/**
 * @fileoverview Topic entity interface for the chat application
 * @description Defines the Topic domain model for conversation threads
 * @module entities/topic
 */

import { BaseEntity } from './base.entity';

/**
 * Topic type enumeration
 * @description Defines the types of topics/conversations
 * @enum {string}
 */
export enum TopicType {
  /** Direct message between two users */
  DIRECT = 'DIRECT',
  /** Group conversation topic */
  GROUP = 'GROUP',
}

/**
 * Topic entity interface
 * @description Represents a conversation topic/thread in the chat system
 * @interface Topic
 * @extends BaseEntity
 */
export interface Topic extends BaseEntity {
  /**
   * Topic title/name (optional for direct messages)
   * @type {string | null}
   */
  title: string | null;

  /**
   * Type of the topic
   * @type {TopicType}
   */
  type: TopicType;

  /**
   * Group ID if this is a group topic
   * @type {string | null}
   */
  groupId: string | null;

  /**
   * ID of the last message in the topic (for sorting/preview)
   * @type {string | null}
   */
  lastMessageId: string | null;

  /**
   * Timestamp of the last message
   * @type {Date | null}
   */
  lastMessageAt: Date | null;

  /**
   * Participant user IDs for direct messages (2 users)
   * @type {string[]}
   */
  participantIds: string[];

  /**
   * Whether the topic is archived
   * @type {boolean}
   */
  isArchived: boolean;
}

/**
 * Topic settings per user
 * @description User-specific settings for a topic
 * @interface TopicSetting
 * @extends BaseEntity
 */
export interface TopicSetting extends BaseEntity {
  /**
   * ID of the topic
   * @type {string}
   */
  topicId: string;

  /**
   * ID of the user
   * @type {string}
   */
  userId: string;

  /**
   * Whether the topic is pinned for this user
   * @type {boolean}
   */
  isPinned: boolean;

  /**
   * Whether notifications are muted for this user
   * @type {boolean}
   */
  isMuted: boolean;

  /**
   * ID of the last message read by this user
   * @type {string | null}
   */
  lastReadMessageId: string | null;

  /**
   * Count of unread messages for this user
   * @type {number}
   */
  unreadCount: number;

  /**
   * Custom notification settings
   * @type {TopicNotificationSettings}
   */
  notificationSettings: TopicNotificationSettings;
}

/**
 * Notification settings for a topic
 * @interface TopicNotificationSettings
 */
export interface TopicNotificationSettings {
  /**
   * Show push notifications
   * @type {boolean}
   */
  showPush: boolean;

  /**
   * Show in-app notifications
   * @type {boolean}
   */
  showInApp: boolean;

  /**
   * Play sound for notifications
   * @type {boolean}
   */
  playSound: boolean;

  /**
   * Show message preview in notifications
   * @type {boolean}
   */
  showPreview: boolean;
}

/**
 * Default notification settings
 * @constant
 */
export const DEFAULT_NOTIFICATION_SETTINGS: TopicNotificationSettings = {
  showPush: true,
  showInApp: true,
  playSound: true,
  showPreview: true,
};

/**
 * Create topic input data
 * @interface CreateTopicInput
 */
export interface CreateTopicInput {
  title?: string | null;
  type: TopicType;
  groupId?: string | null;
  participantIds?: string[];
}

/**
 * Update topic setting input
 * @interface UpdateTopicSettingInput
 */
export interface UpdateTopicSettingInput {
  isPinned?: boolean;
  isMuted?: boolean;
  notificationSettings?: Partial<TopicNotificationSettings>;
}
