/**
 * @fileoverview Domain-specific error classes
 * @description Concrete error implementations for different domains
 * @module errors/domain
 */

import { DomainError, ErrorCode } from './base.error';

// ============================================================================
// Authentication Errors
// ============================================================================

/**
 * Error thrown when authentication fails
 * @class UnauthorizedError
 * @extends DomainError
 */
export class UnauthorizedError extends DomainError {
  /**
   * Creates a new UnauthorizedError
   * @param {string} [message='Authentication required'] - Error message
   */
  constructor(message = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, message);
  }
}

/**
 * Error thrown when credentials are invalid
 * @class InvalidCredentialsError
 * @extends DomainError
 */
export class InvalidCredentialsError extends DomainError {
  /**
   * Creates a new InvalidCredentialsError
   * @param {string} [message='Invalid email or password'] - Error message
   */
  constructor(message = 'Invalid email or password') {
    super(ErrorCode.INVALID_CREDENTIALS, message);
  }
}

/**
 * Error thrown when a token has expired
 * @class TokenExpiredError
 * @extends DomainError
 */
export class TokenExpiredError extends DomainError {
  /**
   * Creates a new TokenExpiredError
   * @param {string} [message='Token has expired'] - Error message
   */
  constructor(message = 'Token has expired') {
    super(ErrorCode.TOKEN_EXPIRED, message);
  }
}

// ============================================================================
// Permission Errors
// ============================================================================

/**
 * Error thrown when user lacks permission for an action
 * @class PermissionError
 * @extends DomainError
 */
export class PermissionError extends DomainError {
  /**
   * Creates a new PermissionError
   * @param {string} [message='Permission denied'] - Error message
   * @param {string} [action] - The action that was denied
   * @param {string} [resource] - The resource that was being accessed
   */
  constructor(message = 'Permission denied', action?: string, resource?: string) {
    super(ErrorCode.PERMISSION_DENIED, message, { action, resource });
  }
}

// ============================================================================
// Not Found Errors
// ============================================================================

/**
 * Error thrown when a resource is not found
 * @class NotFoundError
 * @extends DomainError
 */
export class NotFoundError extends DomainError {
  /**
   * Creates a new NotFoundError
   * @param {string} resource - The type of resource that was not found
   * @param {string} [identifier] - The identifier used to search
   */
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, { resource, identifier });
  }
}

/**
 * Error thrown when a user is not found
 * @class UserNotFoundError
 * @extends DomainError
 */
export class UserNotFoundError extends DomainError {
  /**
   * Creates a new UserNotFoundError
   * @param {string} [identifier] - The user identifier
   */
  constructor(identifier?: string) {
    const message = identifier ? `User '${identifier}' not found` : 'User not found';
    super(ErrorCode.USER_NOT_FOUND, message, { identifier });
  }
}

/**
 * Error thrown when a group is not found
 * @class GroupNotFoundError
 * @extends DomainError
 */
export class GroupNotFoundError extends DomainError {
  /**
   * Creates a new GroupNotFoundError
   * @param {string} [groupId] - The group ID
   */
  constructor(groupId?: string) {
    const message = groupId ? `Group '${groupId}' not found` : 'Group not found';
    super(ErrorCode.GROUP_NOT_FOUND, message, { groupId });
  }
}

/**
 * Error thrown when a topic is not found
 * @class TopicNotFoundError
 * @extends DomainError
 */
export class TopicNotFoundError extends DomainError {
  /**
   * Creates a new TopicNotFoundError
   * @param {string} [topicId] - The topic ID
   */
  constructor(topicId?: string) {
    const message = topicId ? `Topic '${topicId}' not found` : 'Topic not found';
    super(ErrorCode.TOPIC_NOT_FOUND, message, { topicId });
  }
}

/**
 * Error thrown when a message is not found
 * @class MessageNotFoundError
 * @extends DomainError
 */
export class MessageNotFoundError extends DomainError {
  /**
   * Creates a new MessageNotFoundError
   * @param {string} [messageId] - The message ID
   */
  constructor(messageId?: string) {
    const message = messageId ? `Message '${messageId}' not found` : 'Message not found';
    super(ErrorCode.MESSAGE_NOT_FOUND, message, { messageId });
  }
}

// ============================================================================
// Conflict Errors
// ============================================================================

/**
 * Error thrown when a user already exists
 * @class UserAlreadyExistsError
 * @extends DomainError
 */
export class UserAlreadyExistsError extends DomainError {
  /**
   * Creates a new UserAlreadyExistsError
   * @param {string} field - The field that already exists (email/username)
   * @param {string} value - The value that already exists
   */
  constructor(field: string, value: string) {
    super(ErrorCode.USER_ALREADY_EXISTS, `User with ${field} '${value}' already exists`, {
      field,
      value,
    });
  }
}

/**
 * Error thrown when user is already a group member
 * @class AlreadyMemberError
 * @extends DomainError
 */
export class AlreadyMemberError extends DomainError {
  /**
   * Creates a new AlreadyMemberError
   * @param {string} groupId - The group ID
   * @param {string} userId - The user ID
   */
  constructor(groupId: string, userId: string) {
    super(ErrorCode.ALREADY_MEMBER, 'User is already a member of this group', { groupId, userId });
  }
}

// ============================================================================
// Group Errors
// ============================================================================

/**
 * Error thrown when a group has reached max members
 * @class GroupFullError
 * @extends DomainError
 */
export class GroupFullError extends DomainError {
  /**
   * Creates a new GroupFullError
   * @param {string} groupId - The group ID
   * @param {number} maxMembers - The maximum allowed members
   */
  constructor(groupId: string, maxMembers: number) {
    super(ErrorCode.GROUP_FULL, `Group has reached maximum capacity of ${maxMembers} members`, {
      groupId,
      maxMembers,
    });
  }
}

/**
 * Error thrown when user is not a member of a group
 * @class NotAMemberError
 * @extends DomainError
 */
export class NotAMemberError extends DomainError {
  /**
   * Creates a new NotAMemberError
   * @param {string} groupId - The group ID
   * @param {string} userId - The user ID
   */
  constructor(groupId: string, userId: string) {
    super(ErrorCode.NOT_A_MEMBER, 'User is not a member of this group', { groupId, userId });
  }
}

/**
 * Error thrown when trying to remove the group owner
 * @class CannotRemoveOwnerError
 * @extends DomainError
 */
export class CannotRemoveOwnerError extends DomainError {
  /**
   * Creates a new CannotRemoveOwnerError
   * @param {string} groupId - The group ID
   */
  constructor(groupId: string) {
    super(
      ErrorCode.CANNOT_REMOVE_OWNER,
      'Cannot remove the group owner. Transfer ownership first.',
      { groupId }
    );
  }
}

// ============================================================================
// Media Errors
// ============================================================================

/**
 * Error thrown when media upload fails
 * @class MediaUploadError
 * @extends DomainError
 */
export class MediaUploadError extends DomainError {
  /**
   * Creates a new MediaUploadError
   * @param {string} [message='Failed to upload media'] - Error message
   * @param {string} [reason] - The reason for failure
   */
  constructor(message = 'Failed to upload media', reason?: string) {
    super(ErrorCode.MEDIA_UPLOAD_FAILED, message, { reason });
  }
}

/**
 * Error thrown when file size exceeds limit
 * @class FileTooLargeError
 * @extends DomainError
 */
export class FileTooLargeError extends DomainError {
  /**
   * Creates a new FileTooLargeError
   * @param {number} size - The file size in bytes
   * @param {number} maxSize - The maximum allowed size in bytes
   */
  constructor(size: number, maxSize: number) {
    super(
      ErrorCode.FILE_TOO_LARGE,
      `File size ${formatBytes(size)} exceeds maximum allowed size of ${formatBytes(maxSize)}`,
      { size, maxSize }
    );
  }
}

/**
 * Error thrown when file type is not allowed
 * @class InvalidFileTypeError
 * @extends DomainError
 */
export class InvalidFileTypeError extends DomainError {
  /**
   * Creates a new InvalidFileTypeError
   * @param {string} mimeType - The file's MIME type
   * @param {string[]} [allowedTypes] - Allowed MIME types
   */
  constructor(mimeType: string, allowedTypes?: string[]) {
    super(ErrorCode.INVALID_FILE_TYPE, `File type '${mimeType}' is not allowed`, {
      mimeType,
      allowedTypes,
    });
  }
}

/**
 * Error thrown when media is not found
 * @class MediaNotFoundError
 * @extends DomainError
 */
export class MediaNotFoundError extends DomainError {
  /**
   * Creates a new MediaNotFoundError
   * @param {string} [mediaId] - The media ID
   */
  constructor(mediaId?: string) {
    const message = mediaId ? `Media '${mediaId}' not found` : 'Media not found';
    super(ErrorCode.MEDIA_NOT_FOUND, message, { mediaId });
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * Error thrown when validation fails
 * @class ValidationError
 * @extends DomainError
 */
export class ValidationError extends DomainError {
  /**
   * Creates a new ValidationError
   * @param {string} message - Error message
   * @param {Array<{field: string; message: string}>} [errors] - Field-specific errors
   */
  constructor(message: string, errors?: Array<{ field: string; message: string }>) {
    super(ErrorCode.VALIDATION_ERROR, message, { errors });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats bytes to human-readable string
 * @param {number} bytes - The number of bytes
 * @returns {string} Human-readable size string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
