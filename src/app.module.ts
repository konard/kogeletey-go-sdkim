/**
 * @fileoverview Main application module
 * @description Root module that imports all feature modules
 * @module app.module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

// Repositories
import {
  UserRepository,
  MessageRepository,
  GroupRepository,
  GroupMemberRepository,
  TopicRepository,
  TopicSettingRepository,
  ReactionRepository,
  MediaRepository,
} from './repositories';

// Services
import {
  AuthService,
  MessageService,
  GroupService,
  MediaService,
  TopicService,
} from './services';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { MessageController } from './controllers/message.controller';
import { GroupController } from './controllers/group.controller';
import { TopicController } from './controllers/topic.controller';
import { MediaController } from './controllers/media.controller';

// WebSocket
import { ChatGateway } from './websocket/chat.gateway';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Config
import { config } from './config/config';

/**
 * Main application module
 * @description Configures and provides all application components
 * @class AppModule
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => config],
    }),

    // JWT
    JwtModule.register({
      global: true,
      secret: config.jwt.secret,
      signOptions: {
        expiresIn: config.jwt.accessTokenExpiration as unknown as number,
      },
    }),
  ],

  controllers: [
    AuthController,
    MessageController,
    GroupController,
    TopicController,
    MediaController,
  ],

  providers: [
    // Repositories
    UserRepository,
    MessageRepository,
    GroupRepository,
    GroupMemberRepository,
    TopicRepository,
    TopicSettingRepository,
    ReactionRepository,
    MediaRepository,

    // Services
    AuthService,
    MessageService,
    GroupService,
    MediaService,
    TopicService,

    // WebSocket Gateway
    ChatGateway,

    // Guards
    JwtAuthGuard,
  ],

  exports: [
    // Export services for use in other modules
    AuthService,
    MessageService,
    GroupService,
    MediaService,
    TopicService,
  ],
})
export class AppModule {}
