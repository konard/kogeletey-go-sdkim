/**
 * @fileoverview Media repository for data access
 * @description Handles media file metadata persistence operations
 * @module repositories/media
 */

import { Injectable } from '@nestjs/common';
import { Media, MediaStatus, MediaType } from '../entities/media.entity';
import { InMemoryRepository, IRepository } from './base.repository';

/**
 * Media repository interface with media-specific methods
 * @interface IMediaRepository
 * @extends IRepository<Media>
 */
export interface IMediaRepository extends IRepository<Media> {
  /**
   * Finds media by IDs
   * @param {string[]} ids - Media IDs
   * @returns {Promise<Media[]>} Media records
   */
  findByIds(ids: string[]): Promise<Media[]>;

  /**
   * Finds media uploaded by a user
   * @param {string} uploaderId - Uploader user ID
   * @returns {Promise<Media[]>} User's media uploads
   */
  findByUploader(uploaderId: string): Promise<Media[]>;

  /**
   * Finds media by status
   * @param {MediaStatus} status - Media status
   * @returns {Promise<Media[]>} Media with the status
   */
  findByStatus(status: MediaStatus): Promise<Media[]>;

  /**
   * Finds media by type
   * @param {MediaType} type - Media type
   * @returns {Promise<Media[]>} Media of the type
   */
  findByType(type: MediaType): Promise<Media[]>;

  /**
   * Updates media status
   * @param {string} id - Media ID
   * @param {MediaStatus} status - New status
   * @returns {Promise<Media>} Updated media
   */
  updateStatus(id: string, status: MediaStatus): Promise<Media>;

  /**
   * Updates media URL after processing
   * @param {string} id - Media ID
   * @param {string} url - Media URL
   * @param {string} [thumbnailUrl] - Thumbnail URL
   * @returns {Promise<Media>} Updated media
   */
  updateUrls(id: string, url: string, thumbnailUrl?: string): Promise<Media>;

  /**
   * Gets total storage used by a user in bytes
   * @param {string} uploaderId - Uploader user ID
   * @returns {Promise<number>} Total bytes used
   */
  getTotalStorageUsed(uploaderId: string): Promise<number>;

  /**
   * Finds pending/failed uploads older than a threshold
   * @param {Date} olderThan - Threshold date
   * @returns {Promise<Media[]>} Stale uploads
   */
  findStaleUploads(olderThan: Date): Promise<Media[]>;
}

/**
 * In-memory media repository implementation
 * @class MediaRepository
 * @extends InMemoryRepository<Media>
 * @implements {IMediaRepository}
 */
@Injectable()
export class MediaRepository extends InMemoryRepository<Media> implements IMediaRepository {
  async findByIds(ids: string[]): Promise<Media[]> {
    const media = await this.findMany();
    return media.filter((m) => ids.includes(m.id));
  }

  async findByUploader(uploaderId: string): Promise<Media[]> {
    return this.findMany({
      where: { uploaderId } as Partial<Media>,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });
  }

  async findByStatus(status: MediaStatus): Promise<Media[]> {
    return this.findMany({
      where: { status } as Partial<Media>,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });
  }

  async findByType(type: MediaType): Promise<Media[]> {
    return this.findMany({
      where: { type } as Partial<Media>,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });
  }

  async updateStatus(id: string, status: MediaStatus): Promise<Media> {
    return this.update(id, { status } as Partial<
      Omit<Media, keyof import('../entities/base.entity').BaseEntity>
    >);
  }

  async updateUrls(id: string, url: string, thumbnailUrl?: string): Promise<Media> {
    const updates: Partial<Omit<Media, keyof import('../entities/base.entity').BaseEntity>> = {
      url,
      status: MediaStatus.READY,
    };

    if (thumbnailUrl) {
      updates.thumbnailUrl = thumbnailUrl;
    }

    return this.update(id, updates);
  }

  async getTotalStorageUsed(uploaderId: string): Promise<number> {
    const media = await this.findByUploader(uploaderId);
    return media.reduce((total, m) => total + m.size, 0);
  }

  async findStaleUploads(olderThan: Date): Promise<Media[]> {
    const media = await this.findMany({
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    });

    return media.filter(
      (m) =>
        (m.status === MediaStatus.UPLOADING || m.status === MediaStatus.FAILED) &&
        m.createdAt < olderThan
    );
  }
}
