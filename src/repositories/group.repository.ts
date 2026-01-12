/**
 * @fileoverview Group repository for data access
 * @description Handles group and group member persistence operations
 * @module repositories/group
 */

import { Injectable } from '@nestjs/common';
import { Group, GroupMember, GroupMemberRole } from '../entities/group.entity';
import { InMemoryRepository, IRepository } from './base.repository';

/**
 * Group repository interface with group-specific methods
 * @interface IGroupRepository
 * @extends IRepository<Group>
 */
export interface IGroupRepository extends IRepository<Group> {
  /**
   * Finds groups owned by a user
   * @param {string} userId - User ID
   * @returns {Promise<Group[]>} Groups owned by user
   */
  findByOwner(userId: string): Promise<Group[]>;

  /**
   * Finds a group by invite code
   * @param {string} inviteCode - Invite code
   * @returns {Promise<Group | null>} Group or null if not found
   */
  findByInviteCode(inviteCode: string): Promise<Group | null>;

  /**
   * Gets member count for a group
   * @param {string} groupId - Group ID
   * @returns {Promise<number>} Member count
   */
  getMemberCount(groupId: string): Promise<number>;
}

/**
 * Group member repository interface
 * @interface IGroupMemberRepository
 * @extends IRepository<GroupMember>
 */
export interface IGroupMemberRepository extends IRepository<GroupMember> {
  /**
   * Finds a membership record
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @returns {Promise<GroupMember | null>} Membership or null
   */
  findMembership(groupId: string, userId: string): Promise<GroupMember | null>;

  /**
   * Finds all members of a group
   * @param {string} groupId - Group ID
   * @returns {Promise<GroupMember[]>} Group members
   */
  findGroupMembers(groupId: string): Promise<GroupMember[]>;

  /**
   * Finds all groups a user is a member of
   * @param {string} userId - User ID
   * @returns {Promise<GroupMember[]>} User's group memberships
   */
  findUserGroups(userId: string): Promise<GroupMember[]>;

  /**
   * Checks if a user is a member of a group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether user is a member
   */
  isMember(groupId: string, userId: string): Promise<boolean>;

  /**
   * Gets member's role in a group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @returns {Promise<GroupMemberRole | null>} Member's role or null if not a member
   */
  getMemberRole(groupId: string, userId: string): Promise<GroupMemberRole | null>;

  /**
   * Finds members with a specific role
   * @param {string} groupId - Group ID
   * @param {GroupMemberRole} role - Role to filter by
   * @returns {Promise<GroupMember[]>} Members with the role
   */
  findByRole(groupId: string, role: GroupMemberRole): Promise<GroupMember[]>;
}

/**
 * In-memory group repository implementation
 * @class GroupRepository
 * @extends InMemoryRepository<Group>
 * @implements {IGroupRepository}
 */
@Injectable()
export class GroupRepository extends InMemoryRepository<Group> implements IGroupRepository {
  private memberRepository: GroupMemberRepository;

  constructor() {
    super();
    this.memberRepository = new GroupMemberRepository();
  }

  async findByOwner(userId: string): Promise<Group[]> {
    return this.findMany({
      where: { ownerId: userId } as Partial<Group>,
    });
  }

  async findByInviteCode(inviteCode: string): Promise<Group | null> {
    return this.findOne({
      where: { inviteCode } as Partial<Group>,
    });
  }

  async getMemberCount(groupId: string): Promise<number> {
    const members = await this.memberRepository.findGroupMembers(groupId);
    return members.length;
  }

  /**
   * Gets the member repository instance
   * @returns {GroupMemberRepository} Member repository
   */
  getMemberRepository(): GroupMemberRepository {
    return this.memberRepository;
  }
}

/**
 * In-memory group member repository implementation
 * @class GroupMemberRepository
 * @extends InMemoryRepository<GroupMember>
 * @implements {IGroupMemberRepository}
 */
@Injectable()
export class GroupMemberRepository
  extends InMemoryRepository<GroupMember>
  implements IGroupMemberRepository
{
  async findMembership(groupId: string, userId: string): Promise<GroupMember | null> {
    return this.findOne({
      where: { groupId, userId } as Partial<GroupMember>,
    });
  }

  async findGroupMembers(groupId: string): Promise<GroupMember[]> {
    return this.findMany({
      where: { groupId } as Partial<GroupMember>,
      orderBy: [{ field: 'joinedAt', direction: 'asc' }],
    });
  }

  async findUserGroups(userId: string): Promise<GroupMember[]> {
    return this.findMany({
      where: { userId } as Partial<GroupMember>,
      orderBy: [{ field: 'joinedAt', direction: 'desc' }],
    });
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const membership = await this.findMembership(groupId, userId);
    return membership !== null;
  }

  async getMemberRole(groupId: string, userId: string): Promise<GroupMemberRole | null> {
    const membership = await this.findMembership(groupId, userId);
    return membership?.role ?? null;
  }

  async findByRole(groupId: string, role: GroupMemberRole): Promise<GroupMember[]> {
    return this.findMany({
      where: { groupId, role } as Partial<GroupMember>,
    });
  }
}
