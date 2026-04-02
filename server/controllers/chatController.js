const chatModel = require('../models/chatModel');

const getSessionMessages = async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const session = await chatModel.getChatSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    if (![session.user_1_id, session.user_2_id].includes(req.dbUser.id)) {
      return res.status(403).json({ message: 'You are not part of this chat session' });
    }

    const messages = await chatModel.getChatSessionMessages(sessionId);
    res.json({ session, messages });
  } catch (error) {
    console.error('Failed to fetch chat messages:', error);
    res.status(500).json({ message: 'Failed to fetch chat messages' });
  }
};

module.exports = {
  getSessionMessages,
};
