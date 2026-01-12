/**
 * @fileoverview Base error class for the chat application
 * @description Defines the base domain error with error codes and stack traces
 * @module errors/base
 */

/**
 * Error codes enumeration
 * @description All possible error codes in the application
 * @enum {string}
 */
export enum ErrorCode {
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_PASSWORD = 'INVALID_PASSWORD',

  // Group errors
  GROUP_NOT_FOUND = 'GROUP_NOT_FOUND',
  GROUP_FULL = 'GROUP_FULL',
  ALREADY_MEMBER = 'ALREADY_MEMBER',
  NOT_A_MEMBER = 'NOT_A_MEMBER',
  CANNOT_REMOVE_OWNER = 'CANNOT_REMOVE_OWNER',

  // Topic errors
  TOPIC_NOT_FOUND = 'TOPIC_NOT_FOUND',
  TOPIC_ARCHIVED = 'TOPIC_ARCHIVED',

  // Message errors
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  CANNOT_EDIT_MESSAGE = 'CANNOT_EDIT_MESSAGE',
  CANNOT_DELETE_MESSAGE = 'CANNOT_DELETE_MESSAGE',

  // Reaction errors
  REACTION_NOT_FOUND = 'REACTION_NOT_FOUND',
  REACTION_ALREADY_EXISTS = 'REACTION_ALREADY_EXISTS',

  // Media errors
  MEDIA_NOT_FOUND = 'MEDIA_NOT_FOUND',
  MEDIA_UPLOAD_FAILED = 'MEDIA_UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  MEDIA_PROCESSING_FAILED = 'MEDIA_PROCESSING_FAILED',

  // WebSocket errors
  WS_CONNECTION_FAILED = 'WS_CONNECTION_FAILED',
  WS_INVALID_MESSAGE = 'WS_INVALID_MESSAGE',
}

/**
 * HTTP status code mapping for error codes
 * @constant
 */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,

  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,

  [ErrorCode.PERMISSION_DENIED]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,

  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.USER_ALREADY_EXISTS]: 409,
  [ErrorCode.INVALID_PASSWORD]: 400,

  [ErrorCode.GROUP_NOT_FOUND]: 404,
  [ErrorCode.GROUP_FULL]: 400,
  [ErrorCode.ALREADY_MEMBER]: 409,
  [ErrorCode.NOT_A_MEMBER]: 400,
  [ErrorCode.CANNOT_REMOVE_OWNER]: 400,

  [ErrorCode.TOPIC_NOT_FOUND]: 404,
  [ErrorCode.TOPIC_ARCHIVED]: 400,

  [ErrorCode.MESSAGE_NOT_FOUND]: 404,
  [ErrorCode.MESSAGE_TOO_LONG]: 400,
  [ErrorCode.CANNOT_EDIT_MESSAGE]: 403,
  [ErrorCode.CANNOT_DELETE_MESSAGE]: 403,

  [ErrorCode.REACTION_NOT_FOUND]: 404,
  [ErrorCode.REACTION_ALREADY_EXISTS]: 409,

  [ErrorCode.MEDIA_NOT_FOUND]: 404,
  [ErrorCode.MEDIA_UPLOAD_FAILED]: 500,
  [ErrorCode.FILE_TOO_LARGE]: 400,
  [ErrorCode.INVALID_FILE_TYPE]: 400,
  [ErrorCode.MEDIA_PROCESSING_FAILED]: 500,

  [ErrorCode.WS_CONNECTION_FAILED]: 500,
  [ErrorCode.WS_INVALID_MESSAGE]: 400,
};

/**
 * Base domain error class
 * @description All domain errors extend this class for consistent error handling
 * @class DomainError
 * @extends Error
 */
export class DomainError extends Error {
  /**
   * Error code for identification
   * @type {ErrorCode}
   */
  public readonly code: ErrorCode;

  /**
   * HTTP status code
   * @type {number}
   */
  public readonly statusCode: number;

  /**
   * Additional error details
   * @type {Record<string, unknown>}
   */
  public readonly details: Record<string, unknown>;

  /**
   * Creates a new DomainError
   * @param {ErrorCode} code - The error code
   * @param {string} message - Human-readable error message
   * @param {Record<string, unknown>} [details={}] - Additional error details
   */
  constructor(code: ErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = ERROR_HTTP_STATUS[code] ?? 500;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts the error to a JSON-serializable format
   * @returns {object} The error as a plain object
   */
  toJSON(): {
    name: string;
    code: ErrorCode;
    message: string;
    statusCode: number;
    details: Record<string, unknown>;
    stack?: string;
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}
