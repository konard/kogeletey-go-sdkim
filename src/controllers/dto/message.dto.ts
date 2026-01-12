/**
 * @fileoverview Message DTOs with validation
 * @description Data transfer objects for message endpoints
 * @module controllers/dto/message
 */

import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';

/**
 * Create message DTO
 * @class CreateMessageDto
 */
export class CreateMessageDto {
  /**
   * Topic ID where the message will be posted
   */
  @IsUUID('4', { message: 'Invalid topic ID' })
  topicId!: string;

  /**
   * Message content
   */
  @IsString()
  @MinLength(1, { message: 'Message content cannot be empty' })
  @MaxLength(4000, { message: 'Message content must not exceed 4000 characters' })
  content!: string;

  /**
   * Optional ID of message being replied to
   */
  @IsOptional()
  @IsUUID('4', { message: 'Invalid reply message ID' })
  replyToId?: string;

  /**
   * Optional media attachment IDs
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Invalid media ID' })
  mediaIds?: string[];

  /**
   * Optional mentioned user IDs
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Invalid user ID' })
  mentionedUserIds?: string[];
}

/**
 * Update message DTO
 * @class UpdateMessageDto
 */
export class UpdateMessageDto {
  /**
   * Updated message content
   */
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Message content cannot be empty' })
  @MaxLength(4000, { message: 'Message content must not exceed 4000 characters' })
  content?: string;

  /**
   * Whether message is pinned
   */
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

/**
 * Get messages query DTO
 * @class GetMessagesQueryDto
 */
export class GetMessagesQueryDto {
  /**
   * Number of messages to fetch
   * @default 50
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  /**
   * Cursor for pagination (message ID)
   */
  @IsOptional()
  @IsString()
  cursor?: string;

  /**
   * Pagination direction
   * @default "before"
   */
  @IsOptional()
  @IsEnum(['before', 'after'])
  direction?: 'before' | 'after';
}

/**
 * Add reaction DTO
 * @class AddReactionDto
 */
export class AddReactionDto {
  /**
   * Reaction type/emoji
   */
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  type!: string;
}

/**
 * Search messages query DTO
 * @class SearchMessagesQueryDto
 */
export class SearchMessagesQueryDto {
  /**
   * Search query
   */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  query!: string;

  /**
   * Optional topic ID to search within
   */
  @IsOptional()
  @IsUUID('4')
  topicId?: string;

  /**
   * Maximum results
   * @default 20
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
