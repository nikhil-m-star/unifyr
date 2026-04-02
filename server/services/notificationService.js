let ioInstance = null;

const init = (io) => {
  ioInstance = io;
};

const notifyRequestAccepted = (applicantId, teamName) => {
  if (!ioInstance) {
    console.error('Notification Service: ioInstance not initialized');
    return;
  }

  ioInstance.to(`user:${applicantId}`).emit('notification:acceptance', {
    type: 'request_accepted',
    title: 'Pitch Accepted! 🎉',
    message: `Your pitch to join "${teamName}" was accepted. You can now chat!`,
    timestamp: new Date().toISOString()
  });
};

const notifyNewMessage = (recipientId, senderName, content, sessionId) => {
  if (!ioInstance) return;

  ioInstance.to(`user:${recipientId}`).emit('notification:message', {
    type: 'new_message',
    title: `New Message from ${senderName}`,
    message: content.length > 60 ? `${content.substring(0, 57)}...` : content,
    sessionId: sessionId,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  init,
  notifyRequestAccepted,
  notifyNewMessage
};
