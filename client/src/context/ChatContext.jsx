import React, { createContext, useContext, useState, useCallback } from 'react';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [partner, setPartner] = useState(null);

  const openChat = useCallback((sessionId, chatPartner = null) => {
    setActiveSessionId(sessionId);
    if (chatPartner) {
      setPartner(chatPartner);
    }
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    // We keep the sessionId so the drawer can show current chat while closing
  }, []);

  const value = {
    isOpen,
    activeSessionId,
    partner,
    openChat,
    closeChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
