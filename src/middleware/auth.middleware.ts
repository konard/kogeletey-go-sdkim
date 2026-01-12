/**
 * @fileoverview Authentication middleware types
 * @description Type definitions for authenticated requests
 * @module middleware/auth
 */

import { Request } from 'express';
import { UserRole } from '../entities/user.entity';

/**
 * Authenticated user payload attached to request
 * @interface AuthUser
 */
export interface AuthUser {
  /**
   * User ID
   * @type {string}
   */
  id: string;

  /**
   * User email
   * @type {string}
   */
  email: string;

  /**
   * User role
   * @type {UserRole}
   */
  role: UserRole;
}

/**
 * Request with authenticated user
 * @interface AuthenticatedRequest
 * @extends Request
 */
export interface AuthenticatedRequest extends Request {
  /**
   * Authenticated user
   * @type {AuthUser}
   */
  user: AuthUser;
}
