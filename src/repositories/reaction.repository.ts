/**
 * @fileoverview Reaction repository for data access
 * @description Handles reaction persistence operations
 * @module repositories/reaction
 */

import { Injectable } from '@nestjs/common';
import { Reaction, ReactionSummary } from '../entities/reaction.entity';
import { InMemoryRepository, IRepository } from './base.repository';

/**
 * Reaction repository interface with reaction-specific methods
 * @interface IReactionRepository
 * @extends IRepository<Reaction>
 */
export interface IReactionRepository extends IRepository<Reaction> {
  /**
   * Finds a reaction by message, user, and type
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {string} type - Reaction type
   * @returns {Promise<Reaction | null>} Reaction or null
   */
  findReaction(messageId: string, userId: string, type: string): Promise<Reaction | null>;

  /**
   * Finds all reactions on a message
   * @param {string} messageId - Message ID
   * @returns {Promise<Reaction[]>} Reactions on the message
   */
  findByMessage(messageId: string): Promise<Reaction[]>;

  /**
   * Finds all reactions by a user
   * @param {string} userId - User ID
   * @returns {Promise<Reaction[]>} User's reactions
   */
  findByUser(userId: string): Promise<Reaction[]>;

  /**
   * Gets reaction summary for a message
   * @param {string} messageId - Message ID
   * @param {string} [currentUserId] - Current user ID to check hasReacted
   * @returns {Promise<ReactionSummary[]>} Reaction summaries
   */
  getReactionSummary(messageId: string, currentUserId?: string): Promise<ReactionSummary[]>;

  /**
   * Gets reaction counts for a message
   * @param {string} messageId - Message ID
   * @returns {Promise<Record<string, number>>} Reaction type to count map
   */
  getReactionCounts(messageId: string): Promise<Record<string, number>>;

  /**
   * Removes a reaction
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {string} type - Reaction type
   * @returns {Promise<boolean>} Whether reaction was removed
   */
  removeReaction(messageId: string, userId: string, type: string): Promise<boolean>;

  /**
   * Checks if user has reacted to a message with a specific type
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {string} type - Reaction type
   * @returns {Promise<boolean>} Whether user has reacted
   */
  hasReacted(messageId: string, userId: string, type: string): Promise<boolean>;
}

/**
 * In-memory reaction repository implementation
 * @class ReactionRepository
 * @extends InMemoryRepository<Reaction>
 * @implements {IReactionRepository}
 */
@Injectable()
export class ReactionRepository
  extends InMemoryRepository<Reaction>
  implements IReactionRepository
{
  async findReaction(messageId: string, userId: string, type: string): Promise<Reaction | null> {
    return this.findOne({
      where: { messageId, userId, type } as Partial<Reaction>,
    });
  }

  async findByMessage(messageId: string): Promise<Reaction[]> {
    return this.findMany({
      where: { messageId } as Partial<Reaction>,
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    });
  }

  async findByUser(userId: string): Promise<Reaction[]> {
    return this.findMany({
      where: { userId } as Partial<Reaction>,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });
  }

  async getReactionSummary(messageId: string, currentUserId?: string): Promise<ReactionSummary[]> {
    const reactions = await this.findByMessage(messageId);

    // Group reactions by type
    const grouped = new Map<
      string,
      { count: number; hasReacted: boolean; users: Array<{ id: string; displayName: string }> }
    >();

    for (const reaction of reactions) {
      const existing = grouped.get(reaction.type) || {
        count: 0,
        hasReacted: false,
        users: [],
      };

      existing.count++;
      if (currentUserId && reaction.userId === currentUserId) {
        existing.hasReacted = true;
      }
      if (existing.users.length < 3) {
        // Only store first 3 users
        existing.users.push({
          id: reaction.userId,
          displayName: 'User', // In real impl, join with user table
        });
      }

      grouped.set(reaction.type, existing);
    }

    return Array.from(grouped.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      hasReacted: data.hasReacted,
      users: data.users,
    }));
  }

  async getReactionCounts(messageId: string): Promise<Record<string, number>> {
    const reactions = await this.findByMessage(messageId);
    const counts: Record<string, number> = {};

    for (const reaction of reactions) {
      counts[reaction.type] = (counts[reaction.type] || 0) + 1;
    }

    return counts;
  }

  async removeReaction(messageId: string, userId: string, type: string): Promise<boolean> {
    const reaction = await this.findReaction(messageId, userId, type);
    if (!reaction) return false;

    await this.hardDelete(reaction.id);
    return true;
  }

  async hasReacted(messageId: string, userId: string, type: string): Promise<boolean> {
    const reaction = await this.findReaction(messageId, userId, type);
    return reaction !== null;
  }
}
