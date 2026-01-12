/**
 * @fileoverview Topic controller
 * @description REST API endpoints for topic operations
 * @module controllers/topic
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TopicService } from '../services/topic.service';
import { Topic, TopicSetting } from '../entities/topic.entity';
import { CreateTopicDto, CreateDmTopicDto, UpdateTopicSettingsDto, MarkAsReadDto } from './dto/topic.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Topic controller
 * @description Handles topic CRUD and settings operations
 * @class TopicController
 */
@Controller('topics')
@UseGuards(JwtAuthGuard)
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  /**
   * Creates a new topic
   * @route POST /topics
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {CreateTopicDto} body - Topic data
   * @returns {Promise<Topic>} Created topic
   * @throws {400} If validation fails
   */
  @Post()
  async createTopic(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateTopicDto
  ): Promise<Topic> {
    return this.topicService.createTopic(req.user.id, body);
  }

  /**
   * Creates or gets a direct message topic with another user
   * @route POST /topics/dm
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {CreateDmTopicDto} body - Other user ID
   * @returns {Promise<Topic>} DM topic
   * @throws {404} If other user not found
   */
  @Post('dm')
  async createDmTopic(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateDmTopicDto
  ): Promise<Topic> {
    return this.topicService.getOrCreateDirectMessageTopic(req.user.id, body.userId);
  }

  /**
   * Gets a topic by ID
   * @route GET /topics/:id
   * @param {string} id - Topic ID
   * @returns {Promise<Topic>} Topic
   * @throws {404} If topic not found
   */
  @Get(':id')
  async getTopic(@Param('id') id: string): Promise<Topic> {
    return this.topicService.getTopic(id);
  }

  /**
   * Gets topics for the current user
   * @route GET /topics/user/me
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @returns {Promise<Topic[]>} User's topics
   */
  @Get('user/me')
  async getMyTopics(@Req() req: AuthenticatedRequest): Promise<Topic[]> {
    return this.topicService.getUserTopics(req.user.id);
  }

  /**
   * Gets topics for a group
   * @route GET /topics/group/:groupId
   * @param {string} groupId - Group ID
   * @returns {Promise<Topic[]>} Group's topics
   * @throws {404} If group not found
   */
  @Get('group/:groupId')
  async getGroupTopics(@Param('groupId') groupId: string): Promise<Topic[]> {
    return this.topicService.getGroupTopics(groupId);
  }

  /**
   * Gets pinned topics for the current user
   * @route GET /topics/pinned
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @returns {Promise<Topic[]>} Pinned topics
   */
  @Get('pinned')
  async getPinnedTopics(@Req() req: AuthenticatedRequest): Promise<Topic[]> {
    return this.topicService.getPinnedTopics(req.user.id);
  }

  /**
   * Gets topic settings for the current user
   * @route GET /topics/:id/settings
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Topic ID
   * @returns {Promise<TopicSetting>} Topic settings
   * @throws {404} If topic not found
   */
  @Get(':id/settings')
  async getTopicSettings(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<TopicSetting> {
    return this.topicService.getTopicSettings(id, req.user.id);
  }

  /**
   * Updates topic settings for the current user
   * @route PATCH /topics/:id/settings
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Topic ID
   * @param {UpdateTopicSettingsDto} body - Settings update data
   * @returns {Promise<TopicSetting>} Updated settings
   * @throws {404} If topic not found
   */
  @Patch(':id/settings')
  async updateTopicSettings(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateTopicSettingsDto
  ): Promise<TopicSetting> {
    return this.topicService.updateTopicSettings(req.user.id, id, body);
  }

  /**
   * Pins a topic for the current user
   * @route POST /topics/:id/pin
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Topic ID
   * @returns {Promise<TopicSetting>} Updated settings
   * @throws {404} If topic not found
   */
  @Post(':id/pin')
  async pinTopic(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<TopicSetting> {
    return this.topicService.pinTopic(req.user.id, id);
  }

  /**
   * Unpins a topic for the current user
   * @route POST /topics/:id/unpin
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Topic ID
   * @returns {Promise<TopicSetting>} Updated settings
   * @throws {404} If topic not found
   */
  @Post(':id/unpin')
  async unpinTopic(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<TopicSetting> {
    return this.topicService.unpinTopic(req.user.id, id);
  }

  /**
   * Mutes a topic for the current user
   * @route POST /topics/:id/mute
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Topic ID
   * @returns {Promise<TopicSetting>} Updated settings
   * @throws {404} If topic not found
   */
  @Post(':id/mute')
  async muteTopic(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<TopicSetting> {
    return this.topicService.muteTopic(req.user.id, id);
  }

  /**
   * Unmutes a topic for the current user
   * @route POST /topics/:id/unmute
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Topic ID
   * @returns {Promise<TopicSetting>} Updated settings
   * @throws {404} If topic not found
   */
  @Post(':id/unmute')
  async unmuteTopic(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<TopicSetting> {
    return this.topicService.unmuteTopic(req.user.id, id);
  }

  /**
   * Marks a topic as read
   * @route POST /topics/:id/read
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Topic ID
   * @param {MarkAsReadDto} body - Optional last message ID
   * @returns {Promise<void>}
   * @throws {404} If topic not found
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: MarkAsReadDto
  ): Promise<void> {
    await this.topicService.markTopicAsRead(req.user.id, id);
  }

  /**
   * Gets unread counts for the current user across all topics
   * @route GET /topics/unread/counts
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @returns {Promise<Record<string, number>>} Topic ID to unread count map
   */
  @Get('unread/counts')
  async getUnreadCounts(@Req() req: AuthenticatedRequest): Promise<Record<string, number>> {
    return this.topicService.getUnreadCounts(req.user.id);
  }

  /**
   * Archives a topic
   * @route POST /topics/:id/archive
   * @param {string} id - Topic ID
   * @returns {Promise<Topic>} Archived topic
   * @throws {404} If topic not found
   */
  @Post(':id/archive')
  async archiveTopic(@Param('id') id: string): Promise<Topic> {
    return this.topicService.archiveTopic(id);
  }

  /**
   * Unarchives a topic
   * @route POST /topics/:id/unarchive
   * @param {string} id - Topic ID
   * @returns {Promise<Topic>} Unarchived topic
   * @throws {404} If topic not found
   */
  @Post(':id/unarchive')
  async unarchiveTopic(@Param('id') id: string): Promise<Topic> {
    return this.topicService.unarchiveTopic(id);
  }
}
