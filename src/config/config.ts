/**
 * @fileoverview Application configuration
 * @description Centralized configuration management using environment variables
 * @module config
 */

/**
 * Application configuration interface
 * @interface AppConfig
 */
export interface AppConfig {
  /** Application environment */
  env: 'development' | 'production' | 'test';
  /** Server port */
  port: number;
  /** API version prefix */
  apiPrefix: string;
}

/**
 * JWT configuration interface
 * @interface JwtConfig
 */
export interface JwtConfig {
  /** JWT secret key for signing tokens */
  secret: string;
  /** Access token expiration time (e.g., '15m', '1h') */
  accessTokenExpiration: string;
  /** Refresh token expiration time (e.g., '7d') */
  refreshTokenExpiration: string;
}

/**
 * S3 configuration interface for media storage
 * @interface S3Config
 */
export interface S3Config {
  /** AWS region */
  region: string;
  /** S3 bucket name */
  bucket: string;
  /** AWS access key ID */
  accessKeyId: string;
  /** AWS secret access key */
  secretAccessKey: string;
  /** S3 endpoint (for custom endpoints like MinIO) */
  endpoint?: string;
  /** Presigned URL expiration in seconds */
  presignedUrlExpiration: number;
}

/**
 * WebSocket configuration interface
 * @interface WebSocketConfig
 */
export interface WebSocketConfig {
  /** WebSocket server port (can be same as HTTP) */
  port: number;
  /** Ping interval in milliseconds */
  pingInterval: number;
  /** Ping timeout in milliseconds */
  pingTimeout: number;
  /** CORS origin for WebSocket */
  corsOrigin: string | string[];
}

/**
 * Database configuration interface
 * @interface DatabaseConfig
 * @description Abstract interface - implementation depends on chosen database
 */
export interface DatabaseConfig {
  /** Database connection URL */
  url: string;
  /** Enable query logging */
  logging: boolean;
}

/**
 * Complete configuration interface
 * @interface Config
 */
export interface Config {
  app: AppConfig;
  jwt: JwtConfig;
  s3: S3Config;
  websocket: WebSocketConfig;
  database: DatabaseConfig;
}

/**
 * Loads configuration from environment variables
 * @returns {Config} The complete configuration object
 * @throws {Error} If required environment variables are missing
 */
export function loadConfig(): Config {
  const requiredEnvVars = ['JWT_SECRET'];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`Warning: Environment variable ${envVar} is not set. Using default value.`);
    }
  }

  return {
    app: {
      env: (process.env.NODE_ENV as AppConfig['env']) || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      apiPrefix: process.env.API_PREFIX || '/api/v1',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      accessTokenExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
      refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    },
    s3: {
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'chat-media',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      endpoint: process.env.S3_ENDPOINT,
      presignedUrlExpiration: parseInt(process.env.S3_URL_EXPIRATION || '3600', 10),
    },
    websocket: {
      port: parseInt(process.env.WS_PORT || process.env.PORT || '3000', 10),
      pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
      pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000', 10),
      corsOrigin: process.env.WS_CORS_ORIGIN || '*',
    },
    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/chat',
      logging: process.env.DB_LOGGING === 'true',
    },
  };
}

/**
 * Configuration singleton
 * @constant
 */
export const config = loadConfig();
