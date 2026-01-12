/**
 * @fileoverview Reaction entity interface for the chat application
 * @description Defines the Reaction domain model for message reactions/emojis
 * @module entities/reaction
 */

import { BaseEntity } from './base.entity';

/**
 * Common reaction types
 * @description Predefined reaction types (users can also use custom emojis)
 * @enum {string}
 */
export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  LAUGH = 'laugh',
  WOW = 'wow',
  SAD = 'sad',
  ANGRY = 'angry',
  THUMBS_UP = 'thumbs_up',
  THUMBS_DOWN = 'thumbs_down',
  FIRE = 'fire',
  CLAP = 'clap',
}

/**
 * Reaction entity interface
 * @description Represents a reaction to a message
 * @interface Reaction
 * @extends BaseEntity
 */
export interface Reaction extends BaseEntity {
  /**
   * ID of the message being reacted to
   * @type {string}
   */
  messageId: string;

  /**
   * ID of the user who added the reaction
   * @type {string}
   */
  userId: string;

  /**
   * Type/emoji of the reaction
   * @type {string}
   * @description Can be a ReactionType enum value or custom emoji string
   */
  type: string;
}

/**
 * Reaction with user details for API responses
 * @interface ReactionWithUser
 */
export interface ReactionWithUser extends Reaction {
  /**
   * User who added the reaction
   */
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
}

/**
 * Add reaction input data
 * @interface AddReactionInput
 */
export interface AddReactionInput {
  messageId: string;
  type: string;
}

/**
 * Remove reaction input data
 * @interface RemoveReactionInput
 */
export interface RemoveReactionInput {
  messageId: string;
  type: string;
}

/**
 * Reaction summary for a message
 * @interface ReactionSummary
 */
export interface ReactionSummary {
  /**
   * Reaction type
   * @type {string}
   */
  type: string;

  /**
   * Count of this reaction type
   * @type {number}
   */
  count: number;

  /**
   * Whether the current user has added this reaction
   * @type {boolean}
   */
  hasReacted: boolean;

  /**
   * Sample of users who reacted (first few)
   * @type {Array<{ id: string; displayName: string }>}
   */
  users: Array<{ id: string; displayName: string }>;
}
