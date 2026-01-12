/**
 * @fileoverview User repository for data access
 * @description Handles user persistence operations
 * @module repositories/user
 */

import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { InMemoryRepository, IRepository } from './base.repository';

/**
 * User repository interface with user-specific methods
 * @interface IUserRepository
 * @extends IRepository<User>
 */
export interface IUserRepository extends IRepository<User> {
  /**
   * Finds a user by email
   * @param {string} email - User email
   * @returns {Promise<User | null>} User or null if not found
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Finds a user by username
   * @param {string} username - Username
   * @returns {Promise<User | null>} User or null if not found
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Finds multiple users by IDs
   * @param {string[]} ids - Array of user IDs
   * @returns {Promise<User[]>} Array of users
   */
  findByIds(ids: string[]): Promise<User[]>;

  /**
   * Checks if email exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} Whether email exists
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Checks if username exists
   * @param {string} username - Username to check
   * @returns {Promise<boolean>} Whether username exists
   */
  usernameExists(username: string): Promise<boolean>;

  /**
   * Updates user's last seen timestamp
   * @param {string} id - User ID
   * @returns {Promise<void>}
   */
  updateLastSeen(id: string): Promise<void>;
}

/**
 * In-memory user repository implementation
 * @description Development/testing implementation - replace with actual database in production
 * @class UserRepository
 * @extends InMemoryRepository<User>
 * @implements {IUserRepository}
 */
@Injectable()
export class UserRepository extends InMemoryRepository<User> implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } as Partial<User> });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ where: { username } as Partial<User> });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    const users = await this.findMany();
    return users.filter((user) => ids.includes(user.id));
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  async usernameExists(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    return user !== null;
  }

  async updateLastSeen(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user) {
      await this.update(id, { lastSeenAt: new Date() } as Partial<Omit<User, keyof import('../entities/base.entity').BaseEntity>>);
    }
  }
}
