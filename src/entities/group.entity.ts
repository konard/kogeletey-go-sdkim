/**
 * @fileoverview Group entity interface for the chat application
 * @description Defines the Group domain model for multi-user conversations
 * @module entities/group
 */

import { BaseEntity } from './base.entity';

/**
 * Group type enumeration
 * @description Defines the types of groups in the system
 * @enum {string}
 */
export enum GroupType {
  /** Public group that anyone can discover and join */
  PUBLIC = 'PUBLIC',
  /** Private group that requires invitation */
  PRIVATE = 'PRIVATE',
}

/**
 * Member role within a group
 * @description Defines permissions hierarchy within a group
 * @enum {string}
 */
export enum GroupMemberRole {
  /** Group owner with full control */
  OWNER = 'OWNER',
  /** Administrator with management permissions */
  ADMIN = 'ADMIN',
  /** Moderator with content moderation permissions */
  MODERATOR = 'MODERATOR',
  /** Regular member */
  MEMBER = 'MEMBER',
}

/**
 * Group entity interface
 * @description Represents a group/channel in the chat system
 * @interface Group
 * @extends BaseEntity
 */
export interface Group extends BaseEntity {
  /**
   * Group name
   * @type {string}
   */
  name: string;

  /**
   * Group description
   * @type {string | null}
   */
  description: string | null;

  /**
   * URL to group's avatar/icon
   * @type {string | null}
   */
  avatarUrl: string | null;

  /**
   * Type of the group (public/private)
   * @type {GroupType}
   */
  type: GroupType;

  /**
   * User ID of the group creator/owner
   * @type {string}
   */
  ownerId: string;

  /**
   * Maximum number of members allowed (null = unlimited)
   * @type {number | null}
   */
  maxMembers: number | null;

  /**
   * Invite code for joining private groups
   * @type {string | null}
   */
  inviteCode: string | null;
}

/**
 * Group member entity
 * @description Represents membership relationship between users and groups
 * @interface GroupMember
 * @extends BaseEntity
 */
export interface GroupMember extends BaseEntity {
  /**
   * ID of the group
   * @type {string}
   */
  groupId: string;

  /**
   * ID of the member user
   * @type {string}
   */
  userId: string;

  /**
   * Member's role in the group
   * @type {GroupMemberRole}
   */
  role: GroupMemberRole;

  /**
   * Timestamp when the user joined the group
   * @type {Date}
   */
  joinedAt: Date;

  /**
   * Custom nickname for the user in this group
   * @type {string | null}
   */
  nickname: string | null;

  /**
   * Whether notifications are muted for this member
   * @type {boolean}
   */
  isMuted: boolean;
}

/**
 * Create group input data
 * @interface CreateGroupInput
 */
export interface CreateGroupInput {
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  type: GroupType;
  maxMembers?: number | null;
}

/**
 * Update group input data
 * @interface UpdateGroupInput
 */
export interface UpdateGroupInput {
  name?: string;
  description?: string | null;
  avatarUrl?: string | null;
  type?: GroupType;
  maxMembers?: number | null;
}

/**
 * Add member to group input
 * @interface AddGroupMemberInput
 */
export interface AddGroupMemberInput {
  userId: string;
  role?: GroupMemberRole;
  nickname?: string | null;
}

/**
 * Update group member input
 * @interface UpdateGroupMemberInput
 */
export interface UpdateGroupMemberInput {
  role?: GroupMemberRole;
  nickname?: string | null;
  isMuted?: boolean;
}
