const chatModel = require('../models/chatModel');
const notificationService = require('../services/notificationService');

const getSessionMessages = async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);
    
    if (isNaN(sessionId)) {
      console.warn(`[Chat] Invalid session ID requested: ${req.params.sessionId} by user ${req.dbUser.id}`);
      return res.status(400).json({ message: 'Invalid session ID' });
    }

    const session = await chatModel.getChatSessionById(sessionId, req.dbUser.id);

    if (!session) {
      console.warn(`[Chat] Session ${sessionId} not found by user ${req.dbUser.id}`);
      return res.status(404).json({ message: 'Chat session not found' });
    }

    if (![session.user_1_id, session.user_2_id].includes(req.dbUser.id)) {
      console.warn(`[Chat] Unauthorized access attempt for session ${sessionId} by user ${req.dbUser.id}`);
      return res.status(403).json({ message: 'You are not part of this chat session' });
    }

    const messages = await chatModel.getChatSessionMessages(sessionId);
    res.json({ session, messages });
  } catch (error) {
    console.error('Failed to fetch chat messages:', error);
    res.status(500).json({ message: 'Failed to fetch chat messages' });
  }
};

const getUserSessions = async (req, res) => {
  try {
    const sessions = await chatModel.getUserChatSessions(req.dbUser.id);
    res.json({ sessions });
  } catch (error) {
    console.error('Failed to fetch user sessions:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

const deleteSession = async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const session = await chatModel.getChatSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    if (![session.user_1_id, session.user_2_id].includes(req.dbUser.id)) {
      return res.status(403).json({ message: 'You are not part of this chat session' });
    }

    await chatModel.deleteChatSessionById(sessionId);
    return res.status(200).json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Failed to delete chat session:', error);
    return res.status(500).json({ message: 'Failed to delete chat session' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const messageId = Number(req.params.messageId);
    const session = await chatModel.getChatSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    if (![session.user_1_id, session.user_2_id].includes(req.dbUser.id)) {
      return res.status(403).json({ message: 'You are not part of this chat session' });
    }

    const message = await chatModel.getMessageById(messageId);
    if (!message || message.session_id !== sessionId) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender_id !== req.dbUser.id) {
      return res.status(403).json({ message: 'You can delete only your own messages' });
    }

    await chatModel.deleteMessageById(messageId);
    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Failed to delete message:', error);
    return res.status(500).json({ message: 'Failed to delete message' });
  }
};

const getPendingOfflineMessages = async (req, res) => {
  try {
    const pendingMessages = await notificationService.getOfflineMessages(req.dbUser.id);
    
    if (pendingMessages.length > 0) {
      // Mark as delivered
      const messageIds = pendingMessages.map(m => m.id);
      await notificationService.markOfflineMessagesDelivered(messageIds);
    }
    
    res.json({ messages: pendingMessages });
  } catch (error) {
    console.error('Failed to fetch pending offline messages:', error);
    res.status(500).json({ message: 'Failed to fetch pending messages' });
  }
};

module.exports = {
  getSessionMessages,
  getUserSessions,
  deleteSession,
  deleteMessage,
  getPendingOfflineMessages,
};
