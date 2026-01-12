/**
 * @fileoverview JWT authentication guard
 * @description Protects routes that require authentication
 * @module guards/jwt-auth
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { config } from '../config/config';
import { UnauthorizedError, TokenExpiredError } from '../errors/domain.errors';
import { JwtPayload } from '../services/auth.service';

/**
 * JWT Authentication Guard
 * @description Validates JWT tokens and attaches user to request
 * @class JwtAuthGuard
 * @implements {CanActivate}
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Determines if the current request can proceed
   * @param {ExecutionContext} context - Execution context
   * @returns {Promise<boolean>} Whether request is authorized
   * @throws {UnauthorizedError} If no token provided
   * @throws {TokenExpiredError} If token has expired
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedError('No authorization token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: config.jwt.secret,
      });

      // Attach user payload to request
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch (error) {
      if ((error as Error).name === 'TokenExpiredError') {
        throw new TokenExpiredError();
      }
      throw new UnauthorizedError('Invalid authorization token');
    }
  }

  /**
   * Extracts Bearer token from Authorization header
   * @private
   * @param {Request} request - HTTP request
   * @returns {string | undefined} Token or undefined
   */
  private extractTokenFromHeader(request: { headers: { authorization?: string } }): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
