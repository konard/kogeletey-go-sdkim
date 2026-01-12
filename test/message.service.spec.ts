/**
 * @fileoverview MessageService unit tests
 * @description Tests for message CRUD operations and reactions
 * @module test/message.service.spec
 */

import { MessageService } from '../src/services/message.service';
import { MessageRepository } from '../src/repositories/message.repository';
import { TopicRepository, TopicSettingRepository } from '../src/repositories/topic.repository';
import { ReactionRepository } from '../src/repositories/reaction.repository';
import { UserRepository } from '../src/repositories/user.repository';
import { MessageType, MessageStatus } from '../src/entities/message.entity';
import { TopicType } from '../src/entities/topic.entity';
import { MessageNotFoundError, TopicNotFoundError, ValidationError } from '../src/errors/domain.errors';

describe('MessageService', () => {
  let messageService: MessageService;
  let messageRepository: MessageRepository;
  let topicRepository: TopicRepository;
  let topicSettingRepository: TopicSettingRepository;
  let reactionRepository: ReactionRepository;
  let userRepository: UserRepository;

  // Test data
  const testUserId = 'user-123';
  const testTopicId = 'topic-456';
  const testMessageId = 'message-789';

  beforeEach(() => {
    // Initialize repositories with fresh in-memory stores
    messageRepository = new MessageRepository();
    topicRepository = new TopicRepository();
    topicSettingRepository = new TopicSettingRepository();
    reactionRepository = new ReactionRepository();
    userRepository = new UserRepository();

    // Initialize service with repositories
    messageService = new MessageService(
      messageRepository,
      topicRepository,
      topicSettingRepository,
      reactionRepository,
      userRepository
    );
  });

  describe('sendMessage', () => {
    it('should create a new message successfully', async () => {
      // Arrange: Create a topic first
      const topic = await topicRepository.create({
        title: 'Test Topic',
        type: TopicType.DIRECT,
        groupId: null,
        lastMessageId: null,
        lastMessageAt: null,
        participantIds: [testUserId, 'user-456'],
        isArchived: false,
      });

      // Act: Send a message
      const message = await messageService.sendMessage(testUserId, {
        topicId: topic.id,
        content: 'Hello, world!',
      });

      // Assert
      expect(message).toBeDefined();
      expect(message.content).toBe('Hello, world!');
      expect(message.senderId).toBe(testUserId);
      expect(message.topicId).toBe(topic.id);
      expect(message.type).toBe(MessageType.TEXT);
      expect(message.status).toBe(MessageStatus.SENT);
      expect(message.isPinned).toBe(false);
      expect(message.isEdited).toBe(false);
    });

    it('should throw TopicNotFoundError when topic does not exist', async () => {
      // Act & Assert
      await expect(
        messageService.sendMessage(testUserId, {
          topicId: 'non-existent-topic',
          content: 'Hello!',
        })
      ).rejects.toThrow(TopicNotFoundError);
    });

    it('should throw ValidationError when message content is too long', async () => {
      // Arrange: Create a topic
      const topic = await topicRepository.create({
        title: 'Test Topic',
        type: TopicType.DIRECT,
        groupId: null,
        lastMessageId: null,
        lastMessageAt: null,
        participantIds: [testUserId],
        isArchived: false,
      });

      // Act & Assert: Try to send a message that's too long
      const longContent = 'a'.repeat(5000); // Exceeds 4000 char limit
      await expect(
        messageService.sendMessage(testUserId, {
          topicId: topic.id,
          content: longContent,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should create a reply message when replyToId is provided', async () => {
      // Arrange: Create a topic and original message
      const topic = await topicRepository.create({
        title: 'Test Topic',
        type: TopicType.DIRECT,
        groupId: null,
        lastMessageId: null,
        lastMessageAt: null,
        participantIds: [testUserId, 'user-456'],
        isArchived: false,
      });

      const originalMessage = await messageService.sendMessage(testUserId, {
        topicId: topic.id,
        content: 'Original message',
      });

      // Act: Send a reply
      const reply = await messageService.sendMessage('user-456', {
        topicId: topic.id,
        content: 'This is a reply',
        replyToId: originalMessage.id,
      });

      // Assert
      expect(reply.type).toBe(MessageType.REPLY);
      expect(reply.replyToId).toBe(originalMessage.id);
    });

    it('should update topic lastMessage info after sending', async () => {
      // Arrange
      const topic = await topicRepository.create({
        title: 'Test Topic',
        type: TopicType.DIRECT,
        groupId: null,
        lastMessageId: null,
        lastMessageAt: null,
        participantIds: [testUserId],
        isArchived: false,
      });

      // Act
      const message = await messageService.sendMessage(testUserId, {
        topicId: topic.id,
        content: 'Test message',
      });

      // Assert
      const updatedTopic = await topicRepository.findById(topic.id);
      expect(updatedTopic?.lastMessageId).toBe(message.id);
      expect(updatedTopic?.lastMessageAt).toBeDefined();
    });
  });

  describe('editMessage', () => {
    it('should edit a message successfully', async () => {
      // Arrange: Create topic and message
      const topic = await topicRepository.create({
        title: 'Test Topic',
        type: TopicType.DIRECT,
        groupId: null,
        lastMessageId: null,
        lastMessageAt: null,
        participantIds: [testUserId],
        isArchived: false,
      });

      const message = await messageService.sendMessage(testUserId, {
        topicId: topic.id,
        content: 'Original content',
      });

      // Act: Edit the message
      const edited = await messageService.editMessage(testUserId, message.id, {
        content: 'Edited content',
      });

      // Assert
      expect(edited.content).toBe('Edited content');
      expect(edited.isEdited).toBe(true);
      expect(edited.editedAt).toBeDefined();
    });

    it('should throw MessageNotFoundError when message does not exist', async () => {
      await expect(
        messageService.editMessage(testUserId, 'non-existent', {
          content: 'New content',
        })
      ).rejects.toThrow(MessageNotFoundError);
    });
  });

  describe('addReaction', () => {
    it('should add a reaction to a message', async () => {
      // Arrange
      const topic = await topicRepository.create({
        title: 'Test Topic',
        type: TopicType.DIRECT,
        groupId: null,
        lastMessageId: null,
        lastMessageAt: null,
        participantIds: [testUserId],
        isArchived: false,
      });

      const message = await messageService.sendMessage(testUserId, {
        topicId: topic.id,
        content: 'React to me!',
      });

      // Act
      const updated = await messageService.addReaction(testUserId, message.id, 'like');

      // Assert
      expect(updated.reactionCounts['like']).toBe(1);
    });

    it('should not duplicate reactions from the same user', async () => {
      // Arrange
      const topic = await topicRepository.create({
        title: 'Test Topic',
        type: TopicType.DIRECT,
        groupId: null,
        lastMessageId: null,
        lastMessageAt: null,
        participantIds: [testUserId],
        isArchived: false,
      });

      const message = await messageService.sendMessage(testUserId, {
        topicId: topic.id,
        content: 'React to me!',
      });

      // Act: Add same reaction twice
      await messageService.addReaction(testUserId, message.id, 'like');
      const updated = await messageService.addReaction(testUserId, message.id, 'like');

      // Assert: Should still be 1
      expect(updated.reactionCounts['like']).toBe(1);
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction from a message', async () => {
      // Arrange
      const topic = await topicRepository.create({
        title: 'Test Topic',
        type: TopicType.DIRECT,
        groupId: null,
        lastMessageId: null,
        lastMessageAt: null,
        participantIds: [testUserId],
        isArchived: false,
      });

      const message = await messageService.sendMessage(testUserId, {
        topicId: topic.id,
        content: 'React to me!',
      });

      await messageService.addReaction(testUserId, message.id, 'like');

      // Act
      const updated = await messageService.removeReaction(testUserId, message.id, 'like');

      // Assert
      expect(updated.reactionCounts['like']).toBeUndefined();
    });
  });
});
