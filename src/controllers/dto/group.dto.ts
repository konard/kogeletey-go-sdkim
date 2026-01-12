/**
 * @fileoverview Group DTOs with validation
 * @description Data transfer objects for group endpoints
 * @module controllers/dto/group
 */

import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsBoolean,
  IsUrl,
} from 'class-validator';
import { GroupType, GroupMemberRole } from '../../entities/group.entity';

/**
 * Create group DTO
 * @class CreateGroupDto
 */
export class CreateGroupDto {
  /**
   * Group name
   */
  @IsString()
  @MinLength(2, { message: 'Group name must be at least 2 characters' })
  @MaxLength(100, { message: 'Group name must not exceed 100 characters' })
  name!: string;

  /**
   * Group description
   */
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  /**
   * Group avatar URL
   */
  @IsOptional()
  @IsUrl({}, { message: 'Invalid avatar URL' })
  avatarUrl?: string;

  /**
   * Group type (public/private)
   */
  @IsEnum(GroupType, { message: 'Invalid group type' })
  type!: GroupType;

  /**
   * Maximum number of members (null for unlimited)
   */
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(10000)
  maxMembers?: number;
}

/**
 * Update group DTO
 * @class UpdateGroupDto
 */
export class UpdateGroupDto {
  /**
   * Group name
   */
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Group name must be at least 2 characters' })
  @MaxLength(100, { message: 'Group name must not exceed 100 characters' })
  name?: string;

  /**
   * Group description
   */
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  /**
   * Group avatar URL
   */
  @IsOptional()
  @IsUrl({}, { message: 'Invalid avatar URL' })
  avatarUrl?: string;

  /**
   * Group type (public/private)
   */
  @IsOptional()
  @IsEnum(GroupType, { message: 'Invalid group type' })
  type?: GroupType;

  /**
   * Maximum number of members
   */
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(10000)
  maxMembers?: number;
}

/**
 * Add member DTO
 * @class AddMemberDto
 */
export class AddMemberDto {
  /**
   * User ID to add
   */
  @IsUUID('4', { message: 'Invalid user ID' })
  userId!: string;

  /**
   * Role to assign to the member
   */
  @IsOptional()
  @IsEnum(GroupMemberRole, { message: 'Invalid member role' })
  role?: GroupMemberRole;

  /**
   * Optional nickname for the member in this group
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;
}

/**
 * Update member DTO
 * @class UpdateMemberDto
 */
export class UpdateMemberDto {
  /**
   * New role for the member
   */
  @IsOptional()
  @IsEnum(GroupMemberRole, { message: 'Invalid member role' })
  role?: GroupMemberRole;

  /**
   * New nickname for the member
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  /**
   * Whether notifications are muted
   */
  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;
}

/**
 * Join by invite code DTO
 * @class JoinByInviteDto
 */
export class JoinByInviteDto {
  /**
   * Group invite code
   */
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  inviteCode!: string;
}

/**
 * Transfer ownership DTO
 * @class TransferOwnershipDto
 */
export class TransferOwnershipDto {
  /**
   * User ID of the new owner
   */
  @IsUUID('4', { message: 'Invalid user ID' })
  newOwnerId!: string;
}
