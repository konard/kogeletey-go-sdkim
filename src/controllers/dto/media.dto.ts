/**
 * @fileoverview Media DTOs with validation
 * @description Data transfer objects for media endpoints
 * @module controllers/dto/media
 */

import { IsString, IsNumber, Min, Max, MaxLength, MinLength } from 'class-validator';

/**
 * Request presigned upload URL DTO
 * @class RequestUploadDto
 */
export class RequestUploadDto {
  /**
   * Original filename
   */
  @IsString()
  @MinLength(1, { message: 'Filename is required' })
  @MaxLength(255, { message: 'Filename must not exceed 255 characters' })
  originalName!: string;

  /**
   * MIME type of the file
   */
  @IsString()
  @MinLength(3, { message: 'MIME type is required' })
  @MaxLength(100, { message: 'MIME type must not exceed 100 characters' })
  mimeType!: string;

  /**
   * File size in bytes
   */
  @IsNumber()
  @Min(1, { message: 'File size must be at least 1 byte' })
  @Max(100 * 1024 * 1024, { message: 'File size must not exceed 100MB' })
  size!: number;
}

/**
 * Confirm upload DTO
 * @class ConfirmUploadDto
 */
export class ConfirmUploadDto {
  // No additional fields needed - media ID comes from URL param
}
