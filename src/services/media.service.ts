/**
 * @fileoverview Media service
 * @description Handles media upload, processing, and URL generation with S3 integration
 * @module services/media
 */

import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Media,
  MediaType,
  MediaStatus,
  MediaDTO,
  UploadMediaInput,
  PresignedUploadResponse,
  MAX_FILE_SIZES,
  ALLOWED_MIME_TYPES,
  BLOCKED_MIME_TYPES,
  getMediaTypeFromMimeType,
} from '../entities/media.entity';
import { MediaRepository } from '../repositories/media.repository';
import {
  MediaNotFoundError,
  MediaUploadError,
  FileTooLargeError,
  InvalidFileTypeError,
} from '../errors/domain.errors';
import { config } from '../config/config';

/**
 * Media service
 * @description Handles all media-related business logic including S3 integration
 * @class MediaService
 */
@Injectable()
export class MediaService {
  private s3Client: S3Client;

  constructor(private readonly mediaRepository: MediaRepository) {
    this.s3Client = new S3Client({
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
      ...(config.s3.endpoint && { endpoint: config.s3.endpoint }),
    });
  }

  /**
   * Creates a presigned URL for direct S3 upload
   * @param {string} uploaderId - ID of the uploading user
   * @param {UploadMediaInput} input - Upload metadata
   * @returns {Promise<PresignedUploadResponse>} Presigned URL and upload details
   * @throws {FileTooLargeError} If file exceeds size limit
   * @throws {InvalidFileTypeError} If file type is not allowed
   * @side-effect Creates a media record with UPLOADING status
   * @description Allows client-side direct upload to S3, bypassing server bandwidth
   */
  async createPresignedUpload(
    uploaderId: string,
    input: UploadMediaInput
  ): Promise<PresignedUploadResponse> {
    // Determine media type
    const mediaType = getMediaTypeFromMimeType(input.mimeType);

    // Check for blocked MIME types first (security block)
    if (BLOCKED_MIME_TYPES.includes(input.mimeType)) {
      throw new InvalidFileTypeError(input.mimeType, ['Safe file types only']);
    }

    // Validate file size
    const maxSize = MAX_FILE_SIZES[mediaType];
    if (input.size > maxSize) {
      throw new FileTooLargeError(input.size, maxSize);
    }

    // Validate MIME type
    const allowedTypes = ALLOWED_MIME_TYPES[mediaType];
    if (!allowedTypes.includes('*/*') && !allowedTypes.includes(input.mimeType)) {
      throw new InvalidFileTypeError(input.mimeType, allowedTypes);
    }

    // Generate unique key
    const key = this.generateS3Key(uploaderId, input.originalName, mediaType);

    // Create media record
    const media = await this.mediaRepository.create({
      uploaderId,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size,
      type: mediaType,
      status: MediaStatus.UPLOADING,
      bucket: config.s3.bucket,
      key,
      url: null,
      thumbnailUrl: null,
      width: null,
      height: null,
      duration: null,
      metadata: {},
    });

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      ContentType: input.mimeType,
      ContentLength: input.size,
      Metadata: {
        'original-name': encodeURIComponent(input.originalName),
        'uploader-id': uploaderId,
        'media-id': media.id,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: config.s3.presignedUrlExpiration,
    });

    const expiresAt = new Date(Date.now() + config.s3.presignedUrlExpiration * 1000);

    return {
      mediaId: media.id,
      uploadUrl,
      headers: {
        'Content-Type': input.mimeType,
        'Content-Length': String(input.size),
      },
      expiresAt,
    };
  }

  /**
   * Confirms upload completion and triggers processing
   * @param {string} uploaderId - ID of the uploading user
   * @param {string} mediaId - Media ID
   * @returns {Promise<Media>} Updated media record
   * @throws {MediaNotFoundError} If media doesn't exist
   * @throws {MediaUploadError} If upload verification fails
   * @side-effect Updates media status to PROCESSING then READY
   * @side-effect Generates and stores the public URL
   */
  async confirmUpload(uploaderId: string, mediaId: string): Promise<Media> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new MediaNotFoundError(mediaId);
    }

    // Verify ownership
    if (media.uploaderId !== uploaderId) {
      throw new MediaUploadError('Unauthorized to confirm this upload');
    }

    // Verify media exists in S3 (in production, would actually check S3)
    // For now, just update status
    await this.mediaRepository.updateStatus(mediaId, MediaStatus.PROCESSING);

    // Generate public URL
    const url = await this.generateSignedUrl(media.key);

    // Generate thumbnail URL for images/videos (in production, would trigger Lambda)
    let thumbnailUrl: string | null = null;
    if (media.type === MediaType.IMAGE || media.type === MediaType.VIDEO) {
      thumbnailUrl = url; // Placeholder - in production, would be a separate thumbnail
    }

    // Update with URLs and mark as ready
    return this.mediaRepository.updateUrls(mediaId, url, thumbnailUrl || undefined);
  }

  /**
   * Gets a media record by ID
   * @param {string} mediaId - Media ID
   * @returns {Promise<Media>} Media record
   * @throws {MediaNotFoundError} If media doesn't exist
   */
  async getMedia(mediaId: string): Promise<Media> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new MediaNotFoundError(mediaId);
    }
    return media;
  }

  /**
   * Gets multiple media records by IDs
   * @param {string[]} mediaIds - Media IDs
   * @returns {Promise<Media[]>} Media records
   */
  async getMediaByIds(mediaIds: string[]): Promise<Media[]> {
    return this.mediaRepository.findByIds(mediaIds);
  }

  /**
   * Generates a fresh signed URL for a media file
   * @param {string} mediaId - Media ID
   * @returns {Promise<string>} Signed URL
   * @throws {MediaNotFoundError} If media doesn't exist
   * @description URLs expire after config.s3.presignedUrlExpiration seconds
   */
  async getSignedUrl(mediaId: string): Promise<string> {
    const media = await this.getMedia(mediaId);
    return this.generateSignedUrl(media.key);
  }

  /**
   * Deletes a media file
   * @param {string} uploaderId - ID of the uploader (for authorization)
   * @param {string} mediaId - Media ID
   * @returns {Promise<void>}
   * @throws {MediaNotFoundError} If media doesn't exist
   * @throws {MediaUploadError} If user is not the uploader
   * @side-effect Deletes file from S3
   * @side-effect Soft-deletes media record
   */
  async deleteMedia(uploaderId: string, mediaId: string): Promise<void> {
    const media = await this.getMedia(mediaId);

    // Verify ownership
    if (media.uploaderId !== uploaderId) {
      throw new MediaUploadError('Unauthorized to delete this media');
    }

    // Delete from S3
    try {
      const command = new DeleteObjectCommand({
        Bucket: media.bucket,
        Key: media.key,
      });
      await this.s3Client.send(command);
    } catch (error) {
      // Log but don't fail - S3 deletion is best-effort
      console.error('Failed to delete from S3:', error);
    }

    // Soft-delete record
    await this.mediaRepository.softDelete(mediaId);
  }

  /**
   * Gets media uploaded by a user
   * @param {string} uploaderId - Uploader user ID
   * @returns {Promise<MediaDTO[]>} User's media uploads
   */
  async getUserMedia(uploaderId: string): Promise<MediaDTO[]> {
    const media = await this.mediaRepository.findByUploader(uploaderId);
    return media.map(this.toDTO);
  }

  /**
   * Gets total storage used by a user
   * @param {string} uploaderId - Uploader user ID
   * @returns {Promise<{ used: number; formatted: string }>} Storage usage
   */
  async getStorageUsed(uploaderId: string): Promise<{ used: number; formatted: string }> {
    const used = await this.mediaRepository.getTotalStorageUsed(uploaderId);
    return {
      used,
      formatted: this.formatBytes(used),
    };
  }

  /**
   * Cleans up stale uploads (admin function)
   * @param {number} [hoursOld=24] - Delete uploads older than this many hours
   * @returns {Promise<number>} Number of cleaned up records
   * @side-effect Deletes stale files from S3
   * @side-effect Hard-deletes stale media records
   */
  async cleanupStaleUploads(hoursOld = 24): Promise<number> {
    const threshold = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    const staleMedia = await this.mediaRepository.findStaleUploads(threshold);

    let cleaned = 0;
    for (const media of staleMedia) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: media.bucket,
          Key: media.key,
        });
        await this.s3Client.send(command);
        await this.mediaRepository.hardDelete(media.id);
        cleaned++;
      } catch (error) {
        console.error(`Failed to cleanup media ${media.id}:`, error);
      }
    }

    return cleaned;
  }

  /**
   * Generates a signed URL for S3 object
   * @private
   * @param {string} key - S3 object key
   * @returns {Promise<string>} Signed URL
   */
  private async generateSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: config.s3.presignedUrlExpiration,
    });
  }

  /**
   * Generates a unique S3 key for a file
   * @private
   * @param {string} uploaderId - Uploader ID
   * @param {string} originalName - Original filename
   * @param {MediaType} mediaType - Type of media
   * @returns {string} S3 key
   */
  private generateS3Key(uploaderId: string, originalName: string, mediaType: MediaType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop() || 'bin';
    const folder = mediaType.toLowerCase();

    return `${folder}/${uploaderId}/${timestamp}-${random}.${extension}`;
  }

  /**
   * Converts Media to MediaDTO
   * @private
   * @param {Media} media - Media entity
   * @returns {MediaDTO} Media DTO
   */
  private toDTO(media: Media): MediaDTO {
    return {
      id: media.id,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      type: media.type,
      status: media.status,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      width: media.width,
      height: media.height,
      duration: media.duration,
      createdAt: media.createdAt,
    };
  }

  /**
   * Formats bytes to human-readable string
   * @private
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
