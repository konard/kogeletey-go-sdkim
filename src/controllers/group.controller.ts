/**
 * @fileoverview Group controller
 * @description REST API endpoints for group operations
 * @module controllers/group
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GroupService } from '../services/group.service';
import { Group, GroupMember } from '../entities/group.entity';
import {
  CreateGroupDto,
  UpdateGroupDto,
  AddMemberDto,
  UpdateMemberDto,
  JoinByInviteDto,
  TransferOwnershipDto,
} from './dto/group.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Group controller
 * @description Handles group CRUD and member management
 * @class GroupController
 */
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  /**
   * Creates a new group
   * @route POST /groups
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {CreateGroupDto} body - Group data
   * @returns {Promise<Group>} Created group
   * @throws {400} If validation fails
   */
  @Post()
  async createGroup(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateGroupDto
  ): Promise<Group> {
    return this.groupService.createGroup(req.user.id, body);
  }

  /**
   * Gets a group by ID
   * @route GET /groups/:id
   * @param {string} id - Group ID
   * @returns {Promise<Group>} Group
   * @throws {404} If group not found
   */
  @Get(':id')
  async getGroup(@Param('id') id: string): Promise<Group> {
    return this.groupService.getGroup(id);
  }

  /**
   * Gets groups the current user is a member of
   * @route GET /groups/user/me
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @returns {Promise<Group[]>} User's groups
   */
  @Get('user/me')
  async getMyGroups(@Req() req: AuthenticatedRequest): Promise<Group[]> {
    return this.groupService.getUserGroups(req.user.id);
  }

  /**
   * Updates a group
   * @route PATCH /groups/:id
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Group ID
   * @param {UpdateGroupDto} body - Update data
   * @returns {Promise<Group>} Updated group
   * @throws {404} If group not found
   * @throws {403} If user lacks permission
   */
  @Patch(':id')
  async updateGroup(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateGroupDto
  ): Promise<Group> {
    return this.groupService.updateGroup(req.user.id, id, body);
  }

  /**
   * Deletes a group
   * @route DELETE /groups/:id
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Group ID
   * @returns {Promise<void>}
   * @throws {404} If group not found
   * @throws {403} If user is not the owner
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<void> {
    await this.groupService.deleteGroup(req.user.id, id);
  }

  /**
   * Gets group members
   * @route GET /groups/:id/members
   * @param {string} id - Group ID
   * @returns {Promise<GroupMember[]>} Group members
   * @throws {404} If group not found
   */
  @Get(':id/members')
  async getMembers(@Param('id') id: string): Promise<GroupMember[]> {
    return this.groupService.getMembers(id);
  }

  /**
   * Adds a member to a group
   * @route POST /groups/:id/members
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Group ID
   * @param {AddMemberDto} body - Member data
   * @returns {Promise<GroupMember>} Created membership
   * @throws {404} If group or user not found
   * @throws {409} If user is already a member
   * @throws {400} If group is full
   * @throws {403} If user lacks permission
   */
  @Post(':id/members')
  async addMember(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AddMemberDto
  ): Promise<GroupMember> {
    return this.groupService.addMember(req.user.id, id, body);
  }

  /**
   * Updates a group member
   * @route PATCH /groups/:groupId/members/:userId
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} groupId - Group ID
   * @param {string} userId - Member user ID
   * @param {UpdateMemberDto} body - Update data
   * @returns {Promise<GroupMember>} Updated membership
   * @throws {404} If group not found or user is not a member
   * @throws {403} If user lacks permission
   */
  @Patch(':groupId/members/:userId')
  async updateMember(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body() body: UpdateMemberDto
  ): Promise<GroupMember> {
    return this.groupService.updateMember(req.user.id, groupId, userId, body);
  }

  /**
   * Removes a member from a group
   * @route DELETE /groups/:groupId/members/:userId
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} groupId - Group ID
   * @param {string} userId - Member user ID
   * @returns {Promise<void>}
   * @throws {404} If group not found or user is not a member
   * @throws {400} If trying to remove the owner
   * @throws {403} If user lacks permission
   */
  @Delete(':groupId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string
  ): Promise<void> {
    await this.groupService.removeMember(req.user.id, groupId, userId);
  }

  /**
   * Leaves a group (removes self)
   * @route POST /groups/:id/leave
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Group ID
   * @returns {Promise<void>}
   * @throws {404} If group not found or user is not a member
   * @throws {400} If user is the owner
   */
  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveGroup(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<void> {
    await this.groupService.removeMember(req.user.id, id, req.user.id);
  }

  /**
   * Joins a group using an invite code
   * @route POST /groups/join
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {JoinByInviteDto} body - Invite code
   * @returns {Promise<GroupMember>} Created membership
   * @throws {404} If group with invite code not found
   * @throws {409} If user is already a member
   * @throws {400} If group is full
   */
  @Post('join')
  async joinByInviteCode(
    @Req() req: AuthenticatedRequest,
    @Body() body: JoinByInviteDto
  ): Promise<GroupMember> {
    return this.groupService.joinByInviteCode(req.user.id, body.inviteCode);
  }

  /**
   * Regenerates a group's invite code
   * @route POST /groups/:id/invite-code
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Group ID
   * @returns {Promise<{ inviteCode: string }>} New invite code
   * @throws {404} If group not found
   * @throws {403} If user lacks permission
   */
  @Post(':id/invite-code')
  async regenerateInviteCode(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<{ inviteCode: string }> {
    const inviteCode = await this.groupService.regenerateInviteCode(req.user.id, id);
    return { inviteCode };
  }

  /**
   * Transfers group ownership
   * @route POST /groups/:id/transfer-ownership
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {string} id - Group ID
   * @param {TransferOwnershipDto} body - New owner ID
   * @returns {Promise<void>}
   * @throws {404} If group not found or new owner is not a member
   * @throws {403} If user is not the owner
   */
  @Post(':id/transfer-ownership')
  @HttpCode(HttpStatus.NO_CONTENT)
  async transferOwnership(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: TransferOwnershipDto
  ): Promise<void> {
    await this.groupService.transferOwnership(req.user.id, id, body.newOwnerId);
  }
}
