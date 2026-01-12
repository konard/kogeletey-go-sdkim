/**
 * @fileoverview Media entity interface for the chat application
 * @description Defines the Media domain model for file uploads and attachments
 * @module entities/media
 */

import { BaseEntity } from './base.entity';

/**
 * Media type enumeration
 * @description Defines the types of media files supported
 * @enum {string}
 */
export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  FILE = 'FILE',
}

/**
 * Media processing status
 * @description Tracks the upload and processing status of media
 * @enum {string}
 */
export enum MediaStatus {
  /** Upload in progress */
  UPLOADING = 'UPLOADING',
  /** Processing (e.g., generating thumbnails) */
  PROCESSING = 'PROCESSING',
  /** Ready for use */
  READY = 'READY',
  /** Processing/upload failed */
  FAILED = 'FAILED',
}

/**
 * Media entity interface
 * @description Represents a media file/attachment in the chat system
 * @interface Media
 * @extends BaseEntity
 */
export interface Media extends BaseEntity {
  /**
   * ID of the user who uploaded the media
   * @type {string}
   */
  uploaderId: string;

  /**
   * Original filename
   * @type {string}
   */
  originalName: string;

  /**
   * MIME type of the file
   * @type {string}
   */
  mimeType: string;

  /**
   * File size in bytes
   * @type {number}
   */
  size: number;

  /**
   * Type of media
   * @type {MediaType}
   */
  type: MediaType;

  /**
   * Current processing status
   * @type {MediaStatus}
   */
  status: MediaStatus;

  /**
   * S3 bucket name
   * @type {string}
   */
  bucket: string;

  /**
   * S3 object key
   * @type {string}
   */
  key: string;

  /**
   * URL to the media (may be signed URL)
   * @type {string | null}
   */
  url: string | null;

  /**
   * URL to thumbnail (for images/videos)
   * @type {string | null}
   */
  thumbnailUrl: string | null;

  /**
   * Width in pixels (for images/videos)
   * @type {number | null}
   */
  width: number | null;

  /**
   * Height in pixels (for images/videos)
   * @type {number | null}
   */
  height: number | null;

  /**
   * Duration in seconds (for audio/video)
   * @type {number | null}
   */
  duration: number | null;

  /**
   * Additional metadata
   * @type {Record<string, unknown>}
   */
  metadata: Record<string, unknown>;
}

/**
 * Media DTO for API responses
 * @interface MediaDTO
 * @description Excludes internal fields like bucket/key
 */
export interface MediaDTO {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: MediaType;
  status: MediaStatus;
  url: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: Date;
}

/**
 * Upload media input data
 * @interface UploadMediaInput
 */
export interface UploadMediaInput {
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Presigned URL response for direct S3 upload
 * @interface PresignedUploadResponse
 */
export interface PresignedUploadResponse {
  /**
   * Media ID
   * @type {string}
   */
  mediaId: string;

  /**
   * Presigned URL for uploading
   * @type {string}
   */
  uploadUrl: string;

  /**
   * Required headers for the upload request
   * @type {Record<string, string>}
   */
  headers: Record<string, string>;

  /**
   * URL expiration time
   * @type {Date}
   */
  expiresAt: Date;
}

/**
 * Maximum file sizes by type (in bytes)
 * @constant
 */
export const MAX_FILE_SIZES: Record<MediaType, number> = {
  [MediaType.IMAGE]: 10 * 1024 * 1024, // 10MB
  [MediaType.VIDEO]: 100 * 1024 * 1024, // 100MB
  [MediaType.AUDIO]: 50 * 1024 * 1024, // 50MB
  [MediaType.DOCUMENT]: 25 * 1024 * 1024, // 25MB
  [MediaType.FILE]: 25 * 1024 * 1024, // 25MB
};

/**
 * Allowed MIME types by media type
 * @constant
 */
export const ALLOWED_MIME_TYPES: Record<MediaType, string[]> = {
  [MediaType.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  [MediaType.VIDEO]: ['video/mp4', 'video/webm', 'video/quicktime'],
  [MediaType.AUDIO]: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  [MediaType.DOCUMENT]: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  [MediaType.FILE]: ['*/*'],
};

/**
 * Blocked MIME types for security (always rejected regardless of type)
 * @constant
 */
export const BLOCKED_MIME_TYPES: string[] = [
  'application/x-msdownload', // .exe
  'application/x-msdos-program', // DOS executables
  'application/x-executable', // Linux executables
  'application/x-sharedlib', // Shared libraries
  'application/x-shellscript', // Shell scripts
  'application/x-bat', // Batch files
  'application/x-msi', // Windows installer
  'application/vnd.microsoft.portable-executable', // PE format
  'application/x-dosexec', // DOS executables
];

/**
 * Determines media type from MIME type
 * @param {string} mimeType - The MIME type
 * @returns {MediaType} The determined media type
 */
export function getMediaTypeFromMimeType(mimeType: string): MediaType {
  if (mimeType.startsWith('image/')) return MediaType.IMAGE;
  if (mimeType.startsWith('video/')) return MediaType.VIDEO;
  if (mimeType.startsWith('audio/')) return MediaType.AUDIO;
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('sheet')
  ) {
    return MediaType.DOCUMENT;
  }
  return MediaType.FILE;
}
