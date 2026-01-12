/**
 * @fileoverview Base repository with generic CRUD operations
 * @description Provides abstract data access layer that can be implemented with any database
 * @module repositories/base
 */

import { BaseEntity } from '../entities/base.entity';

/**
 * Query options for filtering and pagination
 * @interface QueryOptions
 */
export interface QueryOptions<T> {
  /**
   * Filter conditions
   * @type {Partial<T>}
   */
  where?: Partial<T>;

  /**
   * Fields to select
   * @type {Array<keyof T>}
   */
  select?: Array<keyof T>;

  /**
   * Order by field and direction
   * @type {{ field: keyof T; direction: 'asc' | 'desc' }[]}
   */
  orderBy?: Array<{ field: keyof T; direction: 'asc' | 'desc' }>;

  /**
   * Number of records to skip (pagination offset)
   * @type {number}
   */
  skip?: number;

  /**
   * Number of records to take (pagination limit)
   * @type {number}
   */
  take?: number;

  /**
   * Include soft-deleted records
   * @type {boolean}
   * @default false
   */
  includeSoftDeleted?: boolean;
}

/**
 * Paginated result interface
 * @interface PaginatedResult
 */
export interface PaginatedResult<T> {
  /**
   * Array of items
   * @type {T[]}
   */
  items: T[];

  /**
   * Total count of items matching the query
   * @type {number}
   */
  total: number;

  /**
   * Current page number (1-indexed)
   * @type {number}
   */
  page: number;

  /**
   * Items per page
   * @type {number}
   */
  pageSize: number;

  /**
   * Total number of pages
   * @type {number}
   */
  totalPages: number;

  /**
   * Whether there are more pages
   * @type {boolean}
   */
  hasMore: boolean;
}

/**
 * Generic repository interface for CRUD operations
 * @description Abstracts data access operations - can be implemented with Prisma, TypeORM, etc.
 * @interface IRepository
 * @template T - Entity type extending BaseEntity
 */
export interface IRepository<T extends BaseEntity> {
  /**
   * Creates a new entity
   * @param {Omit<T, keyof BaseEntity>} data - Entity data without base fields
   * @returns {Promise<T>} The created entity
   * @throws {Error} If creation fails
   */
  create(data: Omit<T, keyof BaseEntity>): Promise<T>;

  /**
   * Finds an entity by ID
   * @param {string} id - Entity ID
   * @param {QueryOptions<T>} [options] - Query options
   * @returns {Promise<T | null>} The entity or null if not found
   */
  findById(id: string, options?: QueryOptions<T>): Promise<T | null>;

  /**
   * Finds a single entity matching the query
   * @param {QueryOptions<T>} options - Query options
   * @returns {Promise<T | null>} The entity or null if not found
   */
  findOne(options: QueryOptions<T>): Promise<T | null>;

  /**
   * Finds all entities matching the query
   * @param {QueryOptions<T>} [options] - Query options
   * @returns {Promise<T[]>} Array of entities
   */
  findMany(options?: QueryOptions<T>): Promise<T[]>;

  /**
   * Finds entities with pagination
   * @param {number} page - Page number (1-indexed)
   * @param {number} pageSize - Items per page
   * @param {QueryOptions<T>} [options] - Additional query options
   * @returns {Promise<PaginatedResult<T>>} Paginated result
   */
  findPaginated(page: number, pageSize: number, options?: QueryOptions<T>): Promise<PaginatedResult<T>>;

  /**
   * Updates an entity by ID
   * @param {string} id - Entity ID
   * @param {Partial<Omit<T, keyof BaseEntity>>} data - Fields to update
   * @returns {Promise<T>} The updated entity
   * @throws {Error} If entity not found or update fails
   */
  update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): Promise<T>;

  /**
   * Soft-deletes an entity by ID
   * @param {string} id - Entity ID
   * @returns {Promise<T>} The soft-deleted entity
   * @throws {Error} If entity not found
   */
  softDelete(id: string): Promise<T>;

  /**
   * Permanently deletes an entity by ID
   * @param {string} id - Entity ID
   * @returns {Promise<void>}
   * @throws {Error} If entity not found
   */
  hardDelete(id: string): Promise<void>;

  /**
   * Restores a soft-deleted entity
   * @param {string} id - Entity ID
   * @returns {Promise<T>} The restored entity
   * @throws {Error} If entity not found or not soft-deleted
   */
  restore(id: string): Promise<T>;

  /**
   * Counts entities matching the query
   * @param {QueryOptions<T>} [options] - Query options
   * @returns {Promise<number>} Count of entities
   */
  count(options?: QueryOptions<T>): Promise<number>;

  /**
   * Checks if an entity exists
   * @param {string} id - Entity ID
   * @returns {Promise<boolean>} Whether entity exists
   */
  exists(id: string): Promise<boolean>;
}

/**
 * In-memory repository implementation for development/testing
 * @description Simple in-memory storage - replace with actual database implementation in production
 * @class InMemoryRepository
 * @implements {IRepository<T>}
 * @template T - Entity type extending BaseEntity
 */
export class InMemoryRepository<T extends BaseEntity> implements IRepository<T> {
  protected store: Map<string, T> = new Map();

  /**
   * Generates a unique ID
   * @returns {string} UUID
   */
  protected generateId(): string {
    return crypto.randomUUID();
  }

  async create(data: Omit<T, keyof BaseEntity>): Promise<T> {
    const now = new Date();
    const id = this.generateId();
    const entity = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    } as T;
    this.store.set(id, entity);
    return entity;
  }

  async findById(id: string, options?: QueryOptions<T>): Promise<T | null> {
    const entity = this.store.get(id);
    if (!entity) return null;
    if (!options?.includeSoftDeleted && entity.deletedAt) return null;
    return entity;
  }

  async findOne(options: QueryOptions<T>): Promise<T | null> {
    const results = await this.findMany({ ...options, take: 1 });
    return results[0] || null;
  }

  async findMany(options?: QueryOptions<T>): Promise<T[]> {
    let results = Array.from(this.store.values());

    // Filter soft-deleted unless requested
    if (!options?.includeSoftDeleted) {
      results = results.filter((e) => e.deletedAt === null);
    }

    // Apply where filter
    if (options?.where) {
      results = results.filter((entity) => {
        return Object.entries(options.where!).every(([key, value]) => {
          return (entity as Record<string, unknown>)[key] === value;
        });
      });
    }

    // Apply ordering
    if (options?.orderBy?.length) {
      results.sort((a, b) => {
        for (const order of options.orderBy!) {
          const aVal = (a as Record<string, unknown>)[order.field as string] as string | number | Date;
          const bVal = (b as Record<string, unknown>)[order.field as string] as string | number | Date;
          if (aVal < bVal) return order.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return order.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply pagination
    if (options?.skip) {
      results = results.slice(options.skip);
    }
    if (options?.take) {
      results = results.slice(0, options.take);
    }

    return results;
  }

  async findPaginated(
    page: number,
    pageSize: number,
    options?: QueryOptions<T>
  ): Promise<PaginatedResult<T>> {
    const total = await this.count(options);
    const items = await this.findMany({
      ...options,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  async update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`Entity with id ${id} not found`);
    }

    const updated = {
      ...entity,
      ...data,
      updatedAt: new Date(),
    } as T;

    this.store.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`Entity with id ${id} not found`);
    }

    const deleted = {
      ...entity,
      deletedAt: new Date(),
      updatedAt: new Date(),
    } as T;

    this.store.set(id, deleted);
    return deleted;
  }

  async hardDelete(id: string): Promise<void> {
    if (!this.store.has(id)) {
      throw new Error(`Entity with id ${id} not found`);
    }
    this.store.delete(id);
  }

  async restore(id: string): Promise<T> {
    const entity = this.store.get(id);
    if (!entity) {
      throw new Error(`Entity with id ${id} not found`);
    }
    if (!entity.deletedAt) {
      throw new Error(`Entity with id ${id} is not soft-deleted`);
    }

    const restored = {
      ...entity,
      deletedAt: null,
      updatedAt: new Date(),
    } as T;

    this.store.set(id, restored);
    return restored;
  }

  async count(options?: QueryOptions<T>): Promise<number> {
    const results = await this.findMany({ ...options, skip: undefined, take: undefined });
    return results.length;
  }

  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  /**
   * Clears all data (useful for testing)
   */
  clear(): void {
    this.store.clear();
  }
}
