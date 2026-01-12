/**
 * @fileoverview User entity interface for the chat application
 * @description Defines the User domain model with authentication and profile fields
 * @module entities/user
 */

import { BaseEntity } from './base.entity';

/**
 * User role enumeration
 * @description Defines the possible roles a user can have in the system
 * @enum {string}
 */
export enum UserRole {
  /** Regular user with standard permissions */
  USER = 'USER',
  /** Administrator with elevated permissions */
  ADMIN = 'ADMIN',
  /** Moderator with content moderation permissions */
  MODERATOR = 'MODERATOR',
}

/**
 * User status enumeration
 * @description Represents the online/offline status of a user
 * @enum {string}
 */
export enum UserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
  DO_NOT_DISTURB = 'DO_NOT_DISTURB',
}

/**
 * User entity interface
 * @description Represents a user in the chat system with authentication and profile data
 * @interface User
 * @extends BaseEntity
 */
export interface User extends BaseEntity {
  /**
   * User's email address (unique)
   * @type {string}
   */
  email: string;

  /**
   * User's display name
   * @type {string}
   */
  displayName: string;

  /**
   * User's username (unique)
   * @type {string}
   */
  username: string;

  /**
   * Hashed password (never exposed in API responses)
   * @type {string}
   */
  passwordHash: string;

  /**
   * URL to user's avatar image
   * @type {string | null}
   */
  avatarUrl: string | null;

  /**
   * User's bio/description
   * @type {string | null}
   */
  bio: string | null;

  /**
   * User's role in the system
   * @type {UserRole}
   */
  role: UserRole;

  /**
   * User's current online status
   * @type {UserStatus}
   */
  status: UserStatus;

  /**
   * Timestamp of user's last activity
   * @type {Date | null}
   */
  lastSeenAt: Date | null;

  /**
   * Whether the user's email has been verified
   * @type {boolean}
   */
  emailVerified: boolean;
}

/**
 * User data transfer object for API responses
 * @description Excludes sensitive fields like passwordHash
 * @interface UserDTO
 */
export type UserDTO = Omit<User, 'passwordHash'>;

/**
 * Create user input data
 * @interface CreateUserInput
 */
export interface CreateUserInput {
  email: string;
  displayName: string;
  username: string;
  password: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

/**
 * Update user input data
 * @interface UpdateUserInput
 */
export interface UpdateUserInput {
  displayName?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  status?: UserStatus;
}
