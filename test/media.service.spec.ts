/**
 * @fileoverview MediaService unit tests
 * @description Tests for media upload and management operations
 * @module test/media.service.spec
 */

import { MediaService } from '../src/services/media.service';
import { MediaRepository } from '../src/repositories/media.repository';
import { MediaType, MediaStatus } from '../src/entities/media.entity';
import {
  MediaNotFoundError,
  MediaUploadError,
  FileTooLargeError,
  InvalidFileTypeError,
} from '../src/errors/domain.errors';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
}));

describe('MediaService', () => {
  let mediaService: MediaService;
  let mediaRepository: MediaRepository;

  // Test data
  const testUserId = 'user-123';

  beforeEach(() => {
    // Initialize repository with fresh in-memory store
    mediaRepository = new MediaRepository();

    // Initialize service with repository
    mediaService = new MediaService(mediaRepository);
  });

  describe('createPresignedUpload', () => {
    it('should create a presigned upload URL for valid image', async () => {
      // Act
      const result = await mediaService.createPresignedUpload(testUserId, {
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.mediaId).toBeDefined();
      expect(result.uploadUrl).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.headers['Content-Type']).toBe('image/jpeg');
    });

    it('should throw FileTooLargeError when file exceeds size limit', async () => {
      // Act & Assert: Image over 10MB limit
      await expect(
        mediaService.createPresignedUpload(testUserId, {
          originalName: 'huge-image.jpg',
          mimeType: 'image/jpeg',
          size: 20 * 1024 * 1024, // 20MB
        })
      ).rejects.toThrow(FileTooLargeError);
    });

    it('should throw InvalidFileTypeError for disallowed MIME types', async () => {
      // Act & Assert: Executable file
      await expect(
        mediaService.createPresignedUpload(testUserId, {
          originalName: 'malware.exe',
          mimeType: 'application/x-msdownload',
          size: 1024,
        })
      ).rejects.toThrow(InvalidFileTypeError);
    });

    it('should create media record with UPLOADING status', async () => {
      // Act
      const result = await mediaService.createPresignedUpload(testUserId, {
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
      });

      // Assert
      const media = await mediaRepository.findById(result.mediaId);
      expect(media).toBeDefined();
      expect(media?.status).toBe(MediaStatus.UPLOADING);
      expect(media?.uploaderId).toBe(testUserId);
    });

    it('should correctly detect media type from MIME type', async () => {
      // Act: Upload video
      const videoResult = await mediaService.createPresignedUpload(testUserId, {
        originalName: 'video.mp4',
        mimeType: 'video/mp4',
        size: 50 * 1024 * 1024, // 50MB
      });

      // Assert
      const videoMedia = await mediaRepository.findById(videoResult.mediaId);
      expect(videoMedia?.type).toBe(MediaType.VIDEO);

      // Act: Upload audio
      const audioResult = await mediaService.createPresignedUpload(testUserId, {
        originalName: 'audio.mp3',
        mimeType: 'audio/mpeg',
        size: 5 * 1024 * 1024, // 5MB
      });

      // Assert
      const audioMedia = await mediaRepository.findById(audioResult.mediaId);
      expect(audioMedia?.type).toBe(MediaType.AUDIO);
    });
  });

  describe('confirmUpload', () => {
    it('should confirm upload and update status to READY', async () => {
      // Arrange: Create presigned upload
      const uploadResult = await mediaService.createPresignedUpload(testUserId, {
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
      });

      // Act: Confirm upload
      const media = await mediaService.confirmUpload(testUserId, uploadResult.mediaId);

      // Assert
      expect(media.status).toBe(MediaStatus.READY);
      expect(media.url).toBeDefined();
    });

    it('should throw MediaNotFoundError when media does not exist', async () => {
      await expect(
        mediaService.confirmUpload(testUserId, 'non-existent-media')
      ).rejects.toThrow(MediaNotFoundError);
    });

    it('should throw MediaUploadError when user is not the uploader', async () => {
      // Arrange
      const uploadResult = await mediaService.createPresignedUpload(testUserId, {
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
      });

      // Act & Assert: Different user tries to confirm
      await expect(
        mediaService.confirmUpload('different-user', uploadResult.mediaId)
      ).rejects.toThrow(MediaUploadError);
    });
  });

  describe('getMedia', () => {
    it('should return media by ID', async () => {
      // Arrange
      const uploadResult = await mediaService.createPresignedUpload(testUserId, {
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
      });

      // Act
      const media = await mediaService.getMedia(uploadResult.mediaId);

      // Assert
      expect(media).toBeDefined();
      expect(media.id).toBe(uploadResult.mediaId);
      expect(media.originalName).toBe('test-image.jpg');
    });

    it('should throw MediaNotFoundError when media does not exist', async () => {
      await expect(mediaService.getMedia('non-existent-media')).rejects.toThrow(
        MediaNotFoundError
      );
    });
  });

  describe('deleteMedia', () => {
    it('should delete media successfully', async () => {
      // Arrange
      const uploadResult = await mediaService.createPresignedUpload(testUserId, {
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
      });

      // Act
      await mediaService.deleteMedia(testUserId, uploadResult.mediaId);

      // Assert: Media should be soft-deleted
      await expect(mediaService.getMedia(uploadResult.mediaId)).rejects.toThrow(
        MediaNotFoundError
      );
    });

    it('should throw MediaUploadError when non-owner tries to delete', async () => {
      // Arrange
      const uploadResult = await mediaService.createPresignedUpload(testUserId, {
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
      });

      // Act & Assert
      await expect(
        mediaService.deleteMedia('different-user', uploadResult.mediaId)
      ).rejects.toThrow(MediaUploadError);
    });
  });

  describe('getStorageUsed', () => {
    it('should calculate total storage used by user', async () => {
      // Arrange: Upload multiple files
      await mediaService.createPresignedUpload(testUserId, {
        originalName: 'image1.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      });

      await mediaService.createPresignedUpload(testUserId, {
        originalName: 'image2.jpg',
        mimeType: 'image/jpeg',
        size: 2 * 1024 * 1024, // 2MB
      });

      // Act
      const storage = await mediaService.getStorageUsed(testUserId);

      // Assert
      expect(storage.used).toBe(3 * 1024 * 1024); // 3MB total
      expect(storage.formatted).toBe('3 MB');
    });

    it('should return 0 for users with no uploads', async () => {
      // Act
      const storage = await mediaService.getStorageUsed('user-with-no-uploads');

      // Assert
      expect(storage.used).toBe(0);
      expect(storage.formatted).toBe('0 Bytes');
    });
  });
});
