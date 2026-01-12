/**
 * @fileoverview Base entity interface with common audit fields
 * @description All domain entities extend this base interface for consistent audit tracking
 * @module entities/base
 */

/**
 * Base entity interface with common audit fields
 * @description Provides standard audit fields for all entities including soft-delete support
 * @interface BaseEntity
 */
export interface BaseEntity {
  /**
   * Unique identifier for the entity
   * @type {string}
   */
  id: string;

  /**
   * Timestamp when the entity was created
   * @type {Date}
   */
  createdAt: Date;

  /**
   * Timestamp when the entity was last updated
   * @type {Date}
   */
  updatedAt: Date;

  /**
   * Timestamp when the entity was soft-deleted (null if not deleted)
   * @description Enables soft-delete pattern - records are never permanently deleted
   * @type {Date | null}
   */
  deletedAt: Date | null;
}

/**
 * Creates a new entity with base fields populated
 * @template T - Entity type extending BaseEntity
 * @param {string} id - The unique identifier
 * @returns {Pick<BaseEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>} Base entity fields
 */
export function createBaseEntityFields(id: string): Pick<BaseEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  const now = new Date();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}
