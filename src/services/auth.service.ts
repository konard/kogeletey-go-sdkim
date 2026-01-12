/**
 * @fileoverview Authentication service
 * @description Handles user authentication, JWT token management, and password hashing
 * @module services/auth
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserDTO, UserRole, UserStatus, CreateUserInput } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  TokenExpiredError,
  UnauthorizedError,
} from '../errors/domain.errors';
import { config } from '../config/config';

/**
 * JWT payload interface
 * @interface JwtPayload
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Authentication tokens response
 * @interface AuthTokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Login response with user and tokens
 * @interface LoginResponse
 */
export interface LoginResponse {
  user: UserDTO;
  tokens: AuthTokens;
}

/**
 * Authentication service
 * @description Handles user registration, login, and token management
 * @class AuthService
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService
  ) {}

  /**
   * Registers a new user
   * @param {CreateUserInput} input - User registration data
   * @returns {Promise<LoginResponse>} Created user with auth tokens
   * @throws {UserAlreadyExistsError} If email or username already exists
   * @side-effect Creates a new user in the database
   */
  async register(input: CreateUserInput): Promise<LoginResponse> {
    // Check if email already exists
    if (await this.userRepository.emailExists(input.email)) {
      throw new UserAlreadyExistsError('email', input.email);
    }

    // Check if username already exists
    if (await this.userRepository.usernameExists(input.username)) {
      throw new UserAlreadyExistsError('username', input.username);
    }

    // Hash password
    const passwordHash = await this.hashPassword(input.password);

    // Create user
    const user = await this.userRepository.create({
      email: input.email,
      displayName: input.displayName,
      username: input.username,
      passwordHash,
      avatarUrl: input.avatarUrl ?? null,
      bio: input.bio ?? null,
      role: UserRole.USER,
      status: UserStatus.ONLINE,
      lastSeenAt: new Date(),
      emailVerified: false,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.toUserDTO(user),
      tokens,
    };
  }

  /**
   * Authenticates a user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<LoginResponse>} User with auth tokens
   * @throws {InvalidCredentialsError} If credentials are invalid
   * @side-effect Updates user's lastSeenAt timestamp
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Verify password
    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    // Update last seen
    await this.userRepository.updateLastSeen(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.toUserDTO(user),
      tokens,
    };
  }

  /**
   * Refreshes authentication tokens
   * @param {string} refreshToken - The refresh token
   * @returns {Promise<AuthTokens>} New auth tokens
   * @throws {TokenExpiredError} If refresh token is expired
   * @throws {UnauthorizedError} If refresh token is invalid
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: config.jwt.secret,
      });

      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      if ((error as Error).name === 'TokenExpiredError') {
        throw new TokenExpiredError('Refresh token has expired');
      }
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Validates a JWT token and returns the payload
   * @param {string} token - JWT token to validate
   * @returns {Promise<JwtPayload>} Token payload
   * @throws {UnauthorizedError} If token is invalid
   * @throws {TokenExpiredError} If token is expired
   */
  async validateToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: config.jwt.secret,
      });
    } catch (error) {
      if ((error as Error).name === 'TokenExpiredError') {
        throw new TokenExpiredError();
      }
      throw new UnauthorizedError('Invalid token');
    }
  }

  /**
   * Gets user from a valid JWT token
   * @param {string} token - JWT token
   * @returns {Promise<UserDTO>} User data
   * @throws {UnauthorizedError} If token is invalid or user not found
   */
  async getUserFromToken(token: string): Promise<UserDTO> {
    const payload = await this.validateToken(token);
    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return this.toUserDTO(user);
  }

  /**
   * Generates access and refresh tokens
   * @private
   * @param {User} user - User to generate tokens for
   * @returns {Promise<AuthTokens>} Generated tokens
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: config.jwt.accessTokenExpiration as unknown as number,
        secret: config.jwt.secret,
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: config.jwt.refreshTokenExpiration as unknown as number,
        secret: config.jwt.secret,
      }),
    ]);

    // Parse expiration time to seconds
    const expiresIn = this.parseExpirationToSeconds(config.jwt.accessTokenExpiration);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Hashes a password using a secure algorithm
   * @private
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   * @description Uses Bun's native password hashing (bcrypt under the hood)
   */
  private async hashPassword(password: string): Promise<string> {
    // Using Bun's native password hashing for better performance
    // Falls back to simple hash for environments without Bun.password
    if (typeof Bun !== 'undefined' && Bun.password) {
      return Bun.password.hash(password);
    }
    // Fallback for testing - in production, always use proper hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(password + config.jwt.secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifies a password against a hash
   * @private
   * @param {string} password - Plain text password
   * @param {string} hash - Password hash
   * @returns {Promise<boolean>} Whether password matches
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (typeof Bun !== 'undefined' && Bun.password) {
      return Bun.password.verify(password, hash);
    }
    // Fallback for testing
    const testHash = await this.hashPassword(password);
    return testHash === hash;
  }

  /**
   * Converts User to UserDTO (removes sensitive fields)
   * @private
   * @param {User} user - User entity
   * @returns {UserDTO} User DTO without sensitive fields
   */
  private toUserDTO(user: User): UserDTO {
    const { passwordHash, ...userDto } = user;
    return userDto;
  }

  /**
   * Parses expiration string to seconds
   * @private
   * @param {string} expiration - Expiration string (e.g., '15m', '7d')
   * @returns {number} Expiration in seconds
   */
  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }
}
