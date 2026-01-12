/**
 * @fileoverview Media controller
 * @description REST API endpoints for media upload and management
 * @module controllers/media
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MediaService } from '../services/media.service';
import { Media, MediaDTO, PresignedUploadResponse } from '../entities/media.entity';
import { RequestUploadDto } from './dto/media.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Media controller
 * @description Handles media upload and management operations
 * @class MediaController
 */
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Requests a presigned URL for direct S3 upload
   * @route POST /media/upload
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {RequestUploadDto} body - Upload metadata
   * @returns {Promise<PresignedUploadResponse>} Presigned URL and details
   * @throws {400} If file size or type is invalid
   * @description Client should use the returned URL to upload directly to S3
   */
  @Post('upload')
  async requestUpload(
    @Req() req: AuthenticatedRequest,
    @Body() body: RequestUploadDto
  ): Promise<PresignedUploadResponse> {
    return this.mediaService.createPresignedUpload(req.user.id, {
      originalName: body.originalName,
      mimeType: body.mimeType,
      size: body.size,
    });
  }

  /**
   * Confirms upload completion and triggers processing
   * @route POST /media/:id/confirm
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Media ID from the presigned upload
   * @returns {Promise<Media>} Media with URL
   * @throws {404} If media not found
   * @throws {403} If user is not the uploader
   * @description Call this after successfully uploading to S3
   */
  @Post(':id/confirm')
  async confirmUpload(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<Media> {
    return this.mediaService.confirmUpload(req.user.id, id);
  }

  /**
   * Gets media by ID
   * @route GET /media/:id
   * @param {string} id - Media ID
   * @returns {Promise<Media>} Media details
   * @throws {404} If media not found
   */
  @Get(':id')
  async getMedia(@Param('id') id: string): Promise<Media> {
    return this.mediaService.getMedia(id);
  }

  /**
   * Gets a fresh signed URL for a media file
   * @route GET /media/:id/url
   * @param {string} id - Media ID
   * @returns {Promise<{ url: string }>} Signed URL
   * @throws {404} If media not found
   * @description URLs expire, use this to get a fresh URL
   */
  @Get(':id/url')
  async getSignedUrl(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.mediaService.getSignedUrl(id);
    return { url };
  }

  /**
   * Gets media uploaded by the current user
   * @route GET /media/user/me
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @returns {Promise<MediaDTO[]>} User's media uploads
   */
  @Get('user/me')
  async getMyMedia(@Req() req: AuthenticatedRequest): Promise<MediaDTO[]> {
    return this.mediaService.getUserMedia(req.user.id);
  }

  /**
   * Gets storage usage for the current user
   * @route GET /media/storage
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @returns {Promise<{ used: number; formatted: string }>} Storage usage
   */
  @Get('storage')
  async getStorageUsage(@Req() req: AuthenticatedRequest): Promise<{ used: number; formatted: string }> {
    return this.mediaService.getStorageUsed(req.user.id);
  }

  /**
   * Deletes a media file
   * @route DELETE /media/:id
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Media ID
   * @returns {Promise<void>}
   * @throws {404} If media not found
   * @throws {403} If user is not the uploader
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedia(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<void> {
    await this.mediaService.deleteMedia(req.user.id, id);
  }
}
