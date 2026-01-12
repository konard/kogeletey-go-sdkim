/**
 * @fileoverview Message controller
 * @description REST API endpoints for message operations
 * @module controllers/message
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessageService } from '../services/message.service';
import { Message, PaginatedMessages } from '../entities/message.entity';
import {
  CreateMessageDto,
  UpdateMessageDto,
  GetMessagesQueryDto,
  AddReactionDto,
  SearchMessagesQueryDto,
} from './dto/message.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Message controller
 * @description Handles message CRUD operations and reactions
 * @class MessageController
 */
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  /**
   * Sends a new message
   * @route POST /messages
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {CreateMessageDto} body - Message data
   * @returns {Promise<Message>} Created message
   * @throws {404} If topic not found
   * @throws {400} If validation fails
   */
  @Post()
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateMessageDto
  ): Promise<Message> {
    return this.messageService.sendMessage(req.user.id, {
      topicId: body.topicId,
      content: body.content,
      replyToId: body.replyToId,
      mediaIds: body.mediaIds,
      mentionedUserIds: body.mentionedUserIds,
    });
  }

  /**
   * Gets messages from a topic
   * @route GET /messages/topic/:topicId
   * @param {string} topicId - Topic ID
   * @param {GetMessagesQueryDto} query - Pagination options
   * @returns {Promise<PaginatedMessages>} Paginated messages
   * @throws {404} If topic not found
   */
  @Get('topic/:topicId')
  async getMessages(
    @Param('topicId') topicId: string,
    @Query() query: GetMessagesQueryDto
  ): Promise<PaginatedMessages> {
    return this.messageService.getMessages(topicId, {
      limit: query.limit,
      cursor: query.cursor,
      direction: query.direction,
    });
  }

  /**
   * Gets a single message
   * @route GET /messages/:id
   * @param {string} id - Message ID
   * @returns {Promise<Message>} Message
   * @throws {404} If message not found
   */
  @Get(':id')
  async getMessage(@Param('id') id: string): Promise<Message> {
    return this.messageService.getMessage(id);
  }

  /**
   * Edits a message
   * @route PATCH /messages/:id
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Message ID
   * @param {UpdateMessageDto} body - Update data
   * @returns {Promise<Message>} Updated message
   * @throws {404} If message not found
   * @throws {403} If user is not the message author
   */
  @Patch(':id')
  async editMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateMessageDto
  ): Promise<Message> {
    return this.messageService.editMessage(req.user.id, id, body);
  }

  /**
   * Deletes a message
   * @route DELETE /messages/:id
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Message ID
   * @returns {Promise<void>}
   * @throws {404} If message not found
   * @throws {403} If user is not the message author
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<void> {
    await this.messageService.deleteMessage(req.user.id, id);
  }

  /**
   * Pins a message
   * @route POST /messages/:id/pin
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Message ID
   * @returns {Promise<Message>} Updated message
   * @throws {404} If message not found
   */
  @Post(':id/pin')
  async pinMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<Message> {
    return this.messageService.pinMessage(req.user.id, id);
  }

  /**
   * Unpins a message
   * @route Delete /messages/:id/pin
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Message ID
   * @returns {Promise<Message>} Updated message
   * @throws {404} If message not found
   */
  @Delete(':id/pin')
  async unpinMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<Message> {
    return this.messageService.unpinMessage(req.user.id, id);
  }

  /**
   * Gets pinned messages in a topic
   * @route GET /messages/topic/:topicId/pinned
   * @param {string} topicId - Topic ID
   * @returns {Promise<Message[]>} Pinned messages
   * @throws {404} If topic not found
   */
  @Get('topic/:topicId/pinned')
  async getPinnedMessages(@Param('topicId') topicId: string): Promise<Message[]> {
    return this.messageService.getPinnedMessages(topicId);
  }

  /**
   * Adds a reaction to a message
   * @route POST /messages/:id/reactions
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Message ID
   * @param {AddReactionDto} body - Reaction data
   * @returns {Promise<Message>} Updated message with reactions
   * @throws {404} If message not found
   */
  @Post(':id/reactions')
  async addReaction(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AddReactionDto
  ): Promise<Message> {
    return this.messageService.addReaction(req.user.id, id, body.type);
  }

  /**
   * Removes a reaction from a message
   * @route DELETE /messages/:id/reactions/:type
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Message ID
   * @param {string} type - Reaction type
   * @returns {Promise<Message>} Updated message with reactions
   * @throws {404} If message not found
   */
  @Delete(':id/reactions/:type')
  async removeReaction(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('type') type: string
  ): Promise<Message> {
    return this.messageService.removeReaction(req.user.id, id, type);
  }

  /**
   * Searches messages
   * @route GET /messages/search
   * @param {SearchMessagesQueryDto} query - Search parameters
   * @returns {Promise<Message[]>} Matching messages
   */
  @Get('search')
  async searchMessages(@Query() query: SearchMessagesQueryDto): Promise<Message[]> {
    return this.messageService.searchMessages(query.topicId || null, query.query, query.limit);
  }
}
