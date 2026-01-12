/**
 * @fileoverview Authentication DTOs with validation
 * @description Data transfer objects for authentication endpoints
 * @module controllers/dto/auth
 */

import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsUrl } from 'class-validator';

/**
 * Register user DTO
 * @class RegisterDto
 */
export class RegisterDto {
  /**
   * User's email address
   * @example "user@example.com"
   */
  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  /**
   * User's display name
   * @example "John Doe"
   */
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters' })
  @MaxLength(50, { message: 'Display name must not exceed 50 characters' })
  displayName!: string;

  /**
   * User's username
   * @example "johndoe"
   */
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  username!: string;

  /**
   * User's password
   * @example "SecureP@ss123"
   */
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  password!: string;

  /**
   * Optional avatar URL
   */
  @IsOptional()
  @IsUrl({}, { message: 'Invalid avatar URL' })
  avatarUrl?: string;

  /**
   * Optional user bio
   */
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio must not exceed 500 characters' })
  bio?: string;
}

/**
 * Login DTO
 * @class LoginDto
 */
export class LoginDto {
  /**
   * User's email address
   * @example "user@example.com"
   */
  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  /**
   * User's password
   */
  @IsString()
  password!: string;
}

/**
 * Refresh token DTO
 * @class RefreshTokenDto
 */
export class RefreshTokenDto {
  /**
   * Refresh token
   */
  @IsString({ message: 'Refresh token is required' })
  refreshToken!: string;
}
