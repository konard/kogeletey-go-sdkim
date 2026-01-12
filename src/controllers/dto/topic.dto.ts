/**
 * @fileoverview Topic DTOs with validation
 * @description Data transfer objects for topic endpoints
 * @module controllers/dto/topic
 */

import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TopicType } from '../../entities/topic.entity';

/**
 * Create topic DTO
 * @class CreateTopicDto
 */
export class CreateTopicDto {
  /**
   * Topic title (optional for DMs)
   */
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title?: string;

  /**
   * Topic type
   */
  @IsEnum(TopicType, { message: 'Invalid topic type' })
  type!: TopicType;

  /**
   * Group ID (required for group topics)
   */
  @IsOptional()
  @IsUUID('4', { message: 'Invalid group ID' })
  groupId?: string;

  /**
   * Participant user IDs (for DM topics)
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Invalid participant ID' })
  participantIds?: string[];
}

/**
 * Create DM topic DTO
 * @class CreateDmTopicDto
 */
export class CreateDmTopicDto {
  /**
   * User ID to start DM with
   */
  @IsUUID('4', { message: 'Invalid user ID' })
  userId!: string;
}

/**
 * Notification settings DTO
 * @class NotificationSettingsDto
 */
export class NotificationSettingsDto {
  /**
   * Show push notifications
   */
  @IsOptional()
  @IsBoolean()
  showPush?: boolean;

  /**
   * Show in-app notifications
   */
  @IsOptional()
  @IsBoolean()
  showInApp?: boolean;

  /**
   * Play notification sound
   */
  @IsOptional()
  @IsBoolean()
  playSound?: boolean;

  /**
   * Show message preview in notifications
   */
  @IsOptional()
  @IsBoolean()
  showPreview?: boolean;
}

/**
 * Update topic settings DTO
 * @class UpdateTopicSettingsDto
 */
export class UpdateTopicSettingsDto {
  /**
   * Whether topic is pinned
   */
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  /**
   * Whether notifications are muted
   */
  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;

  /**
   * Notification settings
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notificationSettings?: NotificationSettingsDto;
}

/**
 * Mark as read DTO
 * @class MarkAsReadDto
 */
export class MarkAsReadDto {
  /**
   * ID of the last read message (optional, defaults to most recent)
   */
  @IsOptional()
  @IsUUID('4', { message: 'Invalid message ID' })
  lastMessageId?: string;
}
