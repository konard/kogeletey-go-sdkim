/**
 * @fileoverview GroupService unit tests
 * @description Tests for group CRUD operations and member management
 * @module test/group.service.spec
 */

import { GroupService } from '../src/services/group.service';
import { GroupRepository } from '../src/repositories/group.repository';
import { UserRepository } from '../src/repositories/user.repository';
import { GroupType, GroupMemberRole } from '../src/entities/group.entity';
import { UserRole, UserStatus } from '../src/entities/user.entity';
import {
  GroupNotFoundError,
  UserNotFoundError,
  AlreadyMemberError,
  GroupFullError,
  CannotRemoveOwnerError,
  PermissionError,
} from '../src/errors/domain.errors';

describe('GroupService', () => {
  let groupService: GroupService;
  let groupRepository: GroupRepository;
  let userRepository: UserRepository;

  // Test data
  const testOwnerId = 'owner-123';
  const testMemberId = 'member-456';

  beforeEach(async () => {
    // Initialize repositories with fresh in-memory stores
    groupRepository = new GroupRepository();
    userRepository = new UserRepository();

    // Initialize service with repositories
    groupService = new GroupService(groupRepository, userRepository);

    // Create test users
    await userRepository.create({
      email: 'owner@test.com',
      displayName: 'Test Owner',
      username: 'testowner',
      passwordHash: 'hash',
      avatarUrl: null,
      bio: null,
      role: UserRole.USER,
      status: UserStatus.ONLINE,
      lastSeenAt: new Date(),
      emailVerified: true,
    });

    await userRepository.create({
      email: 'member@test.com',
      displayName: 'Test Member',
      username: 'testmember',
      passwordHash: 'hash',
      avatarUrl: null,
      bio: null,
      role: UserRole.USER,
      status: UserStatus.ONLINE,
      lastSeenAt: new Date(),
      emailVerified: true,
    });
  });

  describe('createGroup', () => {
    it('should create a new group successfully', async () => {
      // Arrange: Get owner user
      const owner = await userRepository.findByEmail('owner@test.com');

      // Act: Create group
      const group = await groupService.createGroup(owner!.id, {
        name: 'Test Group',
        description: 'A test group',
        type: GroupType.PUBLIC,
      });

      // Assert
      expect(group).toBeDefined();
      expect(group.name).toBe('Test Group');
      expect(group.description).toBe('A test group');
      expect(group.type).toBe(GroupType.PUBLIC);
      expect(group.ownerId).toBe(owner!.id);
    });

    it('should create owner as first member with OWNER role', async () => {
      // Arrange
      const owner = await userRepository.findByEmail('owner@test.com');

      // Act
      const group = await groupService.createGroup(owner!.id, {
        name: 'Test Group',
        type: GroupType.PUBLIC,
      });

      // Assert
      const members = await groupService.getMembers(group.id);
      expect(members.length).toBe(1);
      expect(members[0].userId).toBe(owner!.id);
      expect(members[0].role).toBe(GroupMemberRole.OWNER);
    });

    it('should generate invite code for private groups', async () => {
      // Arrange
      const owner = await userRepository.findByEmail('owner@test.com');

      // Act
      const group = await groupService.createGroup(owner!.id, {
        name: 'Private Group',
        type: GroupType.PRIVATE,
      });

      // Assert
      expect(group.inviteCode).toBeDefined();
      expect(group.inviteCode!.length).toBe(8);
    });

    it('should throw UserNotFoundError when owner does not exist', async () => {
      await expect(
        groupService.createGroup('non-existent-user', {
          name: 'Test Group',
          type: GroupType.PUBLIC,
        })
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('addMember', () => {
    it('should add a member to a group', async () => {
      // Arrange
      const owner = await userRepository.findByEmail('owner@test.com');
      const member = await userRepository.findByEmail('member@test.com');
      const group = await groupService.createGroup(owner!.id, {
        name: 'Test Group',
        type: GroupType.PUBLIC,
      });

      // Act
      const membership = await groupService.addMember(owner!.id, group.id, {
        userId: member!.id,
        role: GroupMemberRole.MEMBER,
      });

      // Assert
      expect(membership).toBeDefined();
      expect(membership.userId).toBe(member!.id);
      expect(membership.role).toBe(GroupMemberRole.MEMBER);
    });

    it('should throw AlreadyMemberError when user is already a member', async () => {
      // Arrange
      const owner = await userRepository.findByEmail('owner@test.com');
      const member = await userRepository.findByEmail('member@test.com');
      const group = await groupService.createGroup(owner!.id, {
        name: 'Test Group',
        type: GroupType.PUBLIC,
      });

      await groupService.addMember(owner!.id, group.id, { userId: member!.id });

      // Act & Assert
      await expect(
        groupService.addMember(owner!.id, group.id, { userId: member!.id })
      ).rejects.toThrow(AlreadyMemberError);
    });

    it('should throw GroupFullError when group has reached max members', async () => {
      // Arrange
      const owner = await userRepository.findByEmail('owner@test.com');
      const member = await userRepository.findByEmail('member@test.com');
      const group = await groupService.createGroup(owner!.id, {
        name: 'Small Group',
        type: GroupType.PUBLIC,
        maxMembers: 1, // Only owner allowed
      });

      // Act & Assert
      await expect(
        groupService.addMember(owner!.id, group.id, { userId: member!.id })
      ).rejects.toThrow(GroupFullError);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from a group', async () => {
      // Arrange
      const owner = await userRepository.findByEmail('owner@test.com');
      const member = await userRepository.findByEmail('member@test.com');
      const group = await groupService.createGroup(owner!.id, {
        name: 'Test Group',
        type: GroupType.PUBLIC,
      });

      await groupService.addMember(owner!.id, group.id, { userId: member!.id });

      // Act
      await groupService.removeMember(owner!.id, group.id, member!.id);

      // Assert
      const members = await groupService.getMembers(group.id);
      expect(members.length).toBe(1); // Only owner remains
    });

    it('should throw CannotRemoveOwnerError when trying to remove owner', async () => {
      // Arrange
      const owner = await userRepository.findByEmail('owner@test.com');
      const group = await groupService.createGroup(owner!.id, {
        name: 'Test Group',
        type: GroupType.PUBLIC,
      });

      // Act & Assert
      await expect(
        groupService.removeMember(owner!.id, group.id, owner!.id)
      ).rejects.toThrow(CannotRemoveOwnerError);
    });

    it('should allow members to leave (remove themselves)', async () => {
      // Arrange
      const owner = await userRepository.findByEmail('owner@test.com');
      const member = await userRepository.findByEmail('member@test.com');
      const group = await groupService.createGroup(owner!.id, {
        name: 'Test Group',
        type: GroupType.PUBLIC,
      });

      await groupService.addMember(owner!.id, group.id, { userId: member!.id });

      // Act: Member removes themselves (leaves)
      await groupService.removeMember(member!.id, group.id, member!.id);

      // Assert
      const members = await groupService.getMembers(group.id);
      expect(members.length).toBe(1);
      expect(members[0].userId).toBe(owner!.id);
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership to another member', async () => {
      // Arrange
      const owner = await userRepository.findByEmail('owner@test.com');
      const member = await userRepository.findByEmail('member@test.com');
      const group = await groupService.createGroup(owner!.id, {
        name: 'Test Group',
        type: GroupType.PUBLIC,
      });

      await groupService.addMember(owner!.id, group.id, { userId: member!.id });

      // Act
      await groupService.transferOwnership(owner!.id, group.id, member!.id);

      // Assert
      const updatedGroup = await groupService.getGroup(group.id);
      expect(updatedGroup.ownerId).toBe(member!.id);
    });

    it('should throw PermissionError when non-owner tries to transfer', async () => {
      // Arrange
      const owner = await userRepository.findByEmail('owner@test.com');
      const member = await userRepository.findByEmail('member@test.com');
      const group = await groupService.createGroup(owner!.id, {
        name: 'Test Group',
        type: GroupType.PUBLIC,
      });

      await groupService.addMember(owner!.id, group.id, { userId: member!.id });

      // Act & Assert
      await expect(
        groupService.transferOwnership(member!.id, group.id, owner!.id)
      ).rejects.toThrow(PermissionError);
    });
  });

  describe('joinByInviteCode', () => {
    it('should allow joining a group by invite code', async () => {
      // Arrange
      const owner = await userRepository.findByEmail('owner@test.com');
      const member = await userRepository.findByEmail('member@test.com');
      const group = await groupService.createGroup(owner!.id, {
        name: 'Private Group',
        type: GroupType.PRIVATE,
      });

      // Act
      const membership = await groupService.joinByInviteCode(member!.id, group.inviteCode!);

      // Assert
      expect(membership).toBeDefined();
      expect(membership.userId).toBe(member!.id);
      expect(membership.role).toBe(GroupMemberRole.MEMBER);
    });

    it('should throw GroupNotFoundError for invalid invite code', async () => {
      // Arrange
      const member = await userRepository.findByEmail('member@test.com');

      // Act & Assert
      await expect(
        groupService.joinByInviteCode(member!.id, 'invalid-code')
      ).rejects.toThrow(GroupNotFoundError);
    });
  });
});
