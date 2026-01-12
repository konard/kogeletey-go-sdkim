/**
 * @fileoverview Authentication controller
 * @description REST API endpoints for user authentication
 * @module controllers/auth
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService, LoginResponse, AuthTokens } from '../services/auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';

/**
 * Authentication controller
 * @description Handles user registration, login, and token refresh
 * @class AuthController
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new user
   * @route POST /auth/register
   * @param {RegisterDto} body - Registration data
   * @returns {Promise<LoginResponse>} Created user with auth tokens
   * @throws {409} If email or username already exists
   * @throws {400} If validation fails
   */
  @Post('register')
  async register(@Body() body: RegisterDto): Promise<LoginResponse> {
    return this.authService.register({
      email: body.email,
      displayName: body.displayName,
      username: body.username,
      password: body.password,
      avatarUrl: body.avatarUrl,
      bio: body.bio,
    });
  }

  /**
   * Authenticates a user
   * @route POST /auth/login
   * @param {LoginDto} body - Login credentials
   * @returns {Promise<LoginResponse>} User with auth tokens
   * @throws {401} If credentials are invalid
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto): Promise<LoginResponse> {
    return this.authService.login(body.email, body.password);
  }

  /**
   * Refreshes authentication tokens
   * @route POST /auth/refresh
   * @param {RefreshTokenDto} body - Refresh token
   * @returns {Promise<AuthTokens>} New auth tokens
   * @throws {401} If refresh token is invalid or expired
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refreshTokens(body.refreshToken);
  }
}
