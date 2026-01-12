/**
 * @fileoverview Group service
 * @description Handles group CRUD operations and member management
 * @module services/group
 */

import { Injectable } from '@nestjs/common';
import {
  Group,
  GroupType,
  GroupMember,
  GroupMemberRole,
  CreateGroupInput,
  UpdateGroupInput,
  AddGroupMemberInput,
  UpdateGroupMemberInput,
} from '../entities/group.entity';
import { GroupRepository, GroupMemberRepository } from '../repositories/group.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  GroupNotFoundError,
  UserNotFoundError,
  AlreadyMemberError,
  NotAMemberError,
  GroupFullError,
  CannotRemoveOwnerError,
  PermissionError,
} from '../errors/domain.errors';

/**
 * Group service
 * @description Handles all group-related business logic
 * @class GroupService
 */
@Injectable()
export class GroupService {
  private memberRepository: GroupMemberRepository;

  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly userRepository: UserRepository
  ) {
    this.memberRepository = groupRepository.getMemberRepository();
  }

  /**
   * Creates a new group
   * @param {string} ownerId - ID of the group owner/creator
   * @param {CreateGroupInput} input - Group creation data
   * @returns {Promise<Group>} Created group
   * @throws {UserNotFoundError} If owner doesn't exist
   * @side-effect Creates owner as first member with OWNER role
   */
  async createGroup(ownerId: string, input: CreateGroupInput): Promise<Group> {
    // Verify owner exists
    const owner = await this.userRepository.findById(ownerId);
    if (!owner) {
      throw new UserNotFoundError(ownerId);
    }

    // Generate invite code for private groups
    let inviteCode: string | null = null;
    if (input.type === GroupType.PRIVATE) {
      inviteCode = this.generateInviteCode();
    }

    // Create group
    const group = await this.groupRepository.create({
      name: input.name,
      description: input.description ?? null,
      avatarUrl: input.avatarUrl ?? null,
      type: input.type,
      ownerId,
      maxMembers: input.maxMembers ?? null,
      inviteCode,
    });

    // Add owner as first member
    await this.memberRepository.create({
      groupId: group.id,
      userId: ownerId,
      role: GroupMemberRole.OWNER,
      joinedAt: new Date(),
      nickname: null,
      isMuted: false,
    });

    return group;
  }

  /**
   * Gets a group by ID
   * @param {string} groupId - Group ID
   * @returns {Promise<Group>} Group
   * @throws {GroupNotFoundError} If group doesn't exist
   */
  async getGroup(groupId: string): Promise<Group> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new GroupNotFoundError(groupId);
    }
    return group;
  }

  /**
   * Updates a group
   * @param {string} userId - ID of user performing update
   * @param {string} groupId - Group ID
   * @param {UpdateGroupInput} input - Update data
   * @returns {Promise<Group>} Updated group
   * @throws {GroupNotFoundError} If group doesn't exist
   * @throws {PermissionError} If user lacks permission
   */
  async updateGroup(userId: string, groupId: string, input: UpdateGroupInput): Promise<Group> {
    const group = await this.getGroup(groupId);

    // Check permission (owner or admin)
    await this.requireRole(groupId, userId, [GroupMemberRole.OWNER, GroupMemberRole.ADMIN]);

    const updates: Partial<Omit<Group, keyof import('../entities/base.entity').BaseEntity>> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.avatarUrl !== undefined) updates.avatarUrl = input.avatarUrl;
    if (input.type !== undefined) {
      updates.type = input.type;
      // Generate invite code if switching to private
      if (input.type === GroupType.PRIVATE && !group.inviteCode) {
        updates.inviteCode = this.generateInviteCode();
      }
    }
    if (input.maxMembers !== undefined) updates.maxMembers = input.maxMembers;

    return this.groupRepository.update(groupId, updates);
  }

  /**
   * Deletes a group (soft delete)
   * @param {string} userId - ID of user performing delete
   * @param {string} groupId - Group ID
   * @returns {Promise<void>}
   * @throws {GroupNotFoundError} If group doesn't exist
   * @throws {PermissionError} If user is not the owner
   */
  async deleteGroup(userId: string, groupId: string): Promise<void> {
    const group = await this.getGroup(groupId);

    // Only owner can delete the group
    if (group.ownerId !== userId) {
      throw new PermissionError('Only the group owner can delete the group', 'delete', 'group');
    }

    await this.groupRepository.softDelete(groupId);
  }

  /**
   * Adds a member to a group
   * @param {string} adminId - ID of user adding the member
   * @param {string} groupId - Group ID
   * @param {AddGroupMemberInput} input - Member data
   * @returns {Promise<GroupMember>} Created membership
   * @throws {GroupNotFoundError} If group doesn't exist
   * @throws {UserNotFoundError} If user doesn't exist
   * @throws {AlreadyMemberError} If user is already a member
   * @throws {GroupFullError} If group has reached max members
   * @throws {PermissionError} If admin lacks permission
   */
  async addMember(adminId: string, groupId: string, input: AddGroupMemberInput): Promise<GroupMember> {
    const group = await this.getGroup(groupId);

    // Check permission (owner, admin, or moderator can add members)
    await this.requireRole(groupId, adminId, [
      GroupMemberRole.OWNER,
      GroupMemberRole.ADMIN,
      GroupMemberRole.MODERATOR,
    ]);

    // Verify user exists
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    // Check if already a member
    if (await this.memberRepository.isMember(groupId, input.userId)) {
      throw new AlreadyMemberError(groupId, input.userId);
    }

    // Check max members
    if (group.maxMembers) {
      const memberCount = await this.groupRepository.getMemberCount(groupId);
      if (memberCount >= group.maxMembers) {
        throw new GroupFullError(groupId, group.maxMembers);
      }
    }

    // Create membership
    return this.memberRepository.create({
      groupId,
      userId: input.userId,
      role: input.role ?? GroupMemberRole.MEMBER,
      joinedAt: new Date(),
      nickname: input.nickname ?? null,
      isMuted: false,
    });
  }

  /**
   * Removes a member from a group
   * @param {string} adminId - ID of user removing the member
   * @param {string} groupId - Group ID
   * @param {string} userId - ID of user to remove
   * @returns {Promise<void>}
   * @throws {GroupNotFoundError} If group doesn't exist
   * @throws {NotAMemberError} If user is not a member
   * @throws {CannotRemoveOwnerError} If trying to remove the owner
   * @throws {PermissionError} If admin lacks permission
   */
  async removeMember(adminId: string, groupId: string, userId: string): Promise<void> {
    const group = await this.getGroup(groupId);

    // Cannot remove the owner
    if (group.ownerId === userId) {
      throw new CannotRemoveOwnerError(groupId);
    }

    // Check permission (owner or admin can remove members)
    // Users can also remove themselves (leave group)
    if (adminId !== userId) {
      await this.requireRole(groupId, adminId, [GroupMemberRole.OWNER, GroupMemberRole.ADMIN]);
    }

    // Get membership
    const membership = await this.memberRepository.findMembership(groupId, userId);
    if (!membership) {
      throw new NotAMemberError(groupId, userId);
    }

    await this.memberRepository.softDelete(membership.id);
  }

  /**
   * Updates a member's role or settings
   * @param {string} adminId - ID of user performing update
   * @param {string} groupId - Group ID
   * @param {string} userId - ID of member to update
   * @param {UpdateGroupMemberInput} input - Update data
   * @returns {Promise<GroupMember>} Updated membership
   * @throws {GroupNotFoundError} If group doesn't exist
   * @throws {NotAMemberError} If user is not a member
   * @throws {PermissionError} If admin lacks permission
   */
  async updateMember(
    adminId: string,
    groupId: string,
    userId: string,
    input: UpdateGroupMemberInput
  ): Promise<GroupMember> {
    await this.getGroup(groupId);

    // Users can update their own settings (nickname, muted)
    // Role changes require admin permission
    if (input.role !== undefined && adminId !== userId) {
      await this.requireRole(groupId, adminId, [GroupMemberRole.OWNER, GroupMemberRole.ADMIN]);
    }

    const membership = await this.memberRepository.findMembership(groupId, userId);
    if (!membership) {
      throw new NotAMemberError(groupId, userId);
    }

    const updates: Partial<Omit<GroupMember, keyof import('../entities/base.entity').BaseEntity>> = {};

    if (input.role !== undefined) updates.role = input.role;
    if (input.nickname !== undefined) updates.nickname = input.nickname;
    if (input.isMuted !== undefined) updates.isMuted = input.isMuted;

    return this.memberRepository.update(membership.id, updates);
  }

  /**
   * Gets all members of a group
   * @param {string} groupId - Group ID
   * @returns {Promise<GroupMember[]>} Group members
   * @throws {GroupNotFoundError} If group doesn't exist
   */
  async getMembers(groupId: string): Promise<GroupMember[]> {
    await this.getGroup(groupId);
    return this.memberRepository.findGroupMembers(groupId);
  }

  /**
   * Gets groups a user is a member of
   * @param {string} userId - User ID
   * @returns {Promise<Group[]>} User's groups
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    const memberships = await this.memberRepository.findUserGroups(userId);
    const groups: Group[] = [];

    for (const membership of memberships) {
      const group = await this.groupRepository.findById(membership.groupId);
      if (group) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Joins a group using an invite code
   * @param {string} userId - User ID
   * @param {string} inviteCode - Invite code
   * @returns {Promise<GroupMember>} Created membership
   * @throws {GroupNotFoundError} If group with invite code doesn't exist
   * @throws {AlreadyMemberError} If user is already a member
   * @throws {GroupFullError} If group has reached max members
   */
  async joinByInviteCode(userId: string, inviteCode: string): Promise<GroupMember> {
    const group = await this.groupRepository.findByInviteCode(inviteCode);
    if (!group) {
      throw new GroupNotFoundError();
    }

    // Check if already a member
    if (await this.memberRepository.isMember(group.id, userId)) {
      throw new AlreadyMemberError(group.id, userId);
    }

    // Check max members
    if (group.maxMembers) {
      const memberCount = await this.groupRepository.getMemberCount(group.id);
      if (memberCount >= group.maxMembers) {
        throw new GroupFullError(group.id, group.maxMembers);
      }
    }

    return this.memberRepository.create({
      groupId: group.id,
      userId,
      role: GroupMemberRole.MEMBER,
      joinedAt: new Date(),
      nickname: null,
      isMuted: false,
    });
  }

  /**
   * Regenerates the invite code for a group
   * @param {string} userId - ID of user requesting regeneration
   * @param {string} groupId - Group ID
   * @returns {Promise<string>} New invite code
   * @throws {GroupNotFoundError} If group doesn't exist
   * @throws {PermissionError} If user lacks permission
   */
  async regenerateInviteCode(userId: string, groupId: string): Promise<string> {
    await this.getGroup(groupId);
    await this.requireRole(groupId, userId, [GroupMemberRole.OWNER, GroupMemberRole.ADMIN]);

    const newCode = this.generateInviteCode();
    await this.groupRepository.update(groupId, { inviteCode: newCode } as Partial<
      Omit<Group, keyof import('../entities/base.entity').BaseEntity>
    >);

    return newCode;
  }

  /**
   * Transfers group ownership to another member
   * @param {string} currentOwnerId - Current owner ID
   * @param {string} groupId - Group ID
   * @param {string} newOwnerId - New owner ID
   * @returns {Promise<void>}
   * @throws {GroupNotFoundError} If group doesn't exist
   * @throws {PermissionError} If current user is not the owner
   * @throws {NotAMemberError} If new owner is not a member
   */
  async transferOwnership(currentOwnerId: string, groupId: string, newOwnerId: string): Promise<void> {
    const group = await this.getGroup(groupId);

    // Verify current user is the owner
    if (group.ownerId !== currentOwnerId) {
      throw new PermissionError('Only the group owner can transfer ownership', 'transfer', 'group');
    }

    // Verify new owner is a member
    const newOwnerMembership = await this.memberRepository.findMembership(groupId, newOwnerId);
    if (!newOwnerMembership) {
      throw new NotAMemberError(groupId, newOwnerId);
    }

    // Update group owner
    await this.groupRepository.update(groupId, { ownerId: newOwnerId } as Partial<
      Omit<Group, keyof import('../entities/base.entity').BaseEntity>
    >);

    // Update membership roles
    const currentOwnerMembership = await this.memberRepository.findMembership(groupId, currentOwnerId);
    if (currentOwnerMembership) {
      await this.memberRepository.update(currentOwnerMembership.id, {
        role: GroupMemberRole.ADMIN,
      } as Partial<Omit<GroupMember, keyof import('../entities/base.entity').BaseEntity>>);
    }

    await this.memberRepository.update(newOwnerMembership.id, {
      role: GroupMemberRole.OWNER,
    } as Partial<Omit<GroupMember, keyof import('../entities/base.entity').BaseEntity>>);
  }

  /**
   * Checks if a user has a required role in a group
   * @private
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @param {GroupMemberRole[]} allowedRoles - Allowed roles
   * @throws {PermissionError} If user doesn't have required role
   */
  private async requireRole(
    groupId: string,
    userId: string,
    allowedRoles: GroupMemberRole[]
  ): Promise<void> {
    const role = await this.memberRepository.getMemberRole(groupId, userId);
    if (!role || !allowedRoles.includes(role)) {
      throw new PermissionError(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        'access',
        'group'
      );
    }
  }

  /**
   * Generates a random invite code
   * @private
   * @returns {string} Invite code
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
