/**
 * @fileoverview Message entity interface for the chat application
 * @description Defines the Message domain model with support for replies, edits, and reactions
 * @module entities/message
 */

import { BaseEntity } from './base.entity';

/**
 * Message type enumeration
 * @description Defines the types of messages in the system
 * @enum {string}
 */
export enum MessageType {
  /** Regular text message */
  TEXT = 'TEXT',
  /** Message with media attachment */
  MEDIA = 'MEDIA',
  /** System message (join, leave, etc.) */
  SYSTEM = 'SYSTEM',
  /** Reply to another message */
  REPLY = 'REPLY',
}

/**
 * Message status enumeration
 * @description Tracks the delivery and read status of a message
 * @enum {string}
 */
export enum MessageStatus {
  /** Message is being sent */
  SENDING = 'SENDING',
  /** Message was sent to server */
  SENT = 'SENT',
  /** Message was delivered to recipient */
  DELIVERED = 'DELIVERED',
  /** Message was read by recipient */
  READ = 'READ',
  /** Message failed to send */
  FAILED = 'FAILED',
}

/**
 * Message entity interface
 * @description Represents a message in the chat system
 * @interface Message
 * @extends BaseEntity
 */
export interface Message extends BaseEntity {
  /**
   * ID of the topic this message belongs to
   * @type {string}
   */
  topicId: string;

  /**
   * ID of the user who sent the message
   * @type {string}
   */
  senderId: string;

  /**
   * Message content/text
   * @type {string}
   */
  content: string;

  /**
   * Type of the message
   * @type {MessageType}
   */
  type: MessageType;

  /**
   * Current status of the message
   * @type {MessageStatus}
   * @description WebSocket messages are fire-and-forget; delivery status is stored in DB for eventual consistency
   */
  status: MessageStatus;

  /**
   * ID of the message this is replying to (if type is REPLY)
   * @type {string | null}
   */
  replyToId: string | null;

  /**
   * Whether the message is pinned in the topic
   * @type {boolean}
   */
  isPinned: boolean;

  /**
   * Whether the message has been edited
   * @type {boolean}
   */
  isEdited: boolean;

  /**
   * Timestamp of last edit
   * @type {Date | null}
   */
  editedAt: Date | null;

  /**
   * IDs of attached media files
   * @type {string[]}
   */
  mediaIds: string[];

  /**
   * Mentioned user IDs in the message
   * @type {string[]}
   */
  mentionedUserIds: string[];

  /**
   * Reaction summary (reaction type -> count)
   * @type {Record<string, number>}
   */
  reactionCounts: Record<string, number>;
}

/**
 * Message with sender details for API responses
 * @interface MessageWithSender
 */
export interface MessageWithSender extends Message {
  /**
   * Sender user information
   */
  sender: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
}

/**
 * Create message input data
 * @interface CreateMessageInput
 */
export interface CreateMessageInput {
  topicId: string;
  content: string;
  type?: MessageType;
  replyToId?: string | null;
  mediaIds?: string[];
  mentionedUserIds?: string[];
}

/**
 * Update message input data
 * @interface UpdateMessageInput
 */
export interface UpdateMessageInput {
  content?: string;
  isPinned?: boolean;
}

/**
 * Message pagination options
 * @interface MessagePaginationOptions
 */
export interface MessagePaginationOptions {
  /**
   * Number of messages to fetch
   * @type {number}
   * @default 50
   */
  limit?: number;

  /**
   * Cursor for pagination (message ID to fetch before/after)
   * @type {string}
   */
  cursor?: string;

  /**
   * Direction of pagination
   * @type {'before' | 'after'}
   * @default 'before'
   */
  direction?: 'before' | 'after';
}

/**
 * Paginated messages response
 * @interface PaginatedMessages
 */
export interface PaginatedMessages {
  messages: MessageWithSender[];
  hasMore: boolean;
  nextCursor: string | null;
}
