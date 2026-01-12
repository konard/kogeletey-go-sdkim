/**
 * @fileoverview Global exception filter
 * @description Handles all exceptions and formats error responses
 * @module middleware/error.filter
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError, ERROR_HTTP_STATUS } from '../errors/base.error';

/**
 * Error response format
 * @interface ErrorResponse
 */
interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}

/**
 * Global exception filter
 * @description Catches all exceptions and formats consistent error responses
 * @class AllExceptionsFilter
 * @implements {ExceptionFilter}
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  /**
   * Handles exceptions and sends formatted error response
   * @param {unknown} exception - The thrown exception
   * @param {ArgumentsHost} host - Arguments host
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let errorResponse: ErrorResponse;

    if (exception instanceof DomainError) {
      // Handle domain errors
      errorResponse = {
        statusCode: exception.statusCode,
        code: exception.code,
        message: exception.message,
        details: Object.keys(exception.details).length > 0 ? exception.details : undefined,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    } else if (exception instanceof HttpException) {
      // Handle NestJS HTTP exceptions
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string;
      let details: Record<string, unknown> | undefined;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const response = exceptionResponse as Record<string, unknown>;
        message = (response.message as string) || exception.message;
        if (Array.isArray(response.message)) {
          // Validation errors from class-validator
          details = { errors: response.message };
          message = 'Validation failed';
        }
      } else {
        message = exception.message;
      }

      errorResponse = {
        statusCode: status,
        code: this.getCodeFromStatus(status),
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    } else {
      // Handle unknown errors
      console.error('Unhandled exception:', exception);

      errorResponse = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      // Include stack trace in development
      if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
        errorResponse.details = { stack: exception.stack };
      }
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Maps HTTP status to error code
   * @private
   * @param {number} status - HTTP status code
   * @returns {string} Error code
   */
  private getCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'PERMISSION_DENIED';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'ALREADY_EXISTS';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
