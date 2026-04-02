import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, User } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import axios from '../../api/axios';

const mapMessage = (entry, partnerId) => ({
  id: entry.id,
  text: entry.content,
  senderId: entry.sender_id,
  senderName: entry.sender_name,
  timestamp: entry.created_at,
  isOwn: entry.sender_id !== partnerId,
});

const ChatDrawer = ({ isOpen, onClose, partner, sessionId, socket }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const { getToken } = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !sessionId) {
      if (!isOpen) setMessages([]); // Clear on close
      return undefined;
    }

    let isMounted = true;
    const loadMessages = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const response = await axios.get(`/chat/${sessionId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isMounted) return;
        setMessages(response.data.messages.map((entry) => mapMessage(entry, partner?.id)));
      } catch (error) {
        console.error('Failed to load chat messages:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMessages();
    socket?.emit('chat:join', { sessionId });

    return () => {
      isMounted = false;
    };
  }, [getToken, isOpen, partner?.id, sessionId, socket]);

  useEffect(() => {
    if (!socket || !isOpen || !sessionId) return undefined;

    const handleIncomingMessage = (incomingMessage) => {
      if (Number(incomingMessage.session_id) !== Number(sessionId)) {
        return;
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        mapMessage(incomingMessage, partner?.id),
      ]);
    };

    socket.on('chat:message', handleIncomingMessage);
    return () => socket.off('chat:message', handleIncomingMessage);
  }, [isOpen, partner?.id, sessionId, socket]);

  const handleSend = (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !socket || !sessionId) return;

    socket.emit('chat:send', { sessionId, content: trimmedMessage });
    setMessage('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 998,
              backdropFilter: 'blur(8px)',
            }}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              maxWidth: '480px',
              zIndex: 999,
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 40px rgba(0,0,0,0.6)',
              borderLeft: '1px solid var(--glass-border)',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {partner?.profile_pic ? (
                    <img src={partner.profile_pic} alt={partner?.name || 'Partner'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'white', fontWeight: 700 }}>{partner?.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, color: 'var(--text-primary)' }}>
                    {partner?.name || 'Teammate'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        background: 'var(--accent-teal)',
                        borderRadius: '50%',
                        boxShadow: '0 0 8px var(--accent-teal)',
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Active Chat
                    </span>
                  </div>
                </div>
              </div>

              <button 
                className="btn-ghost" 
                onClick={onClose} 
                style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              ref={scrollRef}
              style={{
                flex: 1,
                padding: '1.5rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                scrollbarWidth: 'none',
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                  <div className="loader-ring" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Retrieving messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', marginTop: 'auto', marginBottom: 'auto' }}>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      width: '72px',
                      height: '72px',
                      borderRadius: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1.5rem',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <Send size={32} />
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                    Start the conversation!
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '240px', margin: '0 auto' }}>
                    Send a message to coordinate with {partner?.name?.split(' ')[0] || 'your teammate'}.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    style={{ alignSelf: msg.isOwn ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
                  >
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '20px',
                        background: msg.isOwn ? 'linear-gradient(135deg, var(--accent-blue) 0%, #2575fc 100%)' : 'rgba(255,255,255,0.08)',
                        color: msg.isOwn ? 'white' : 'var(--text-primary)',
                        borderBottomRightRadius: msg.isOwn ? '4px' : '20px',
                        borderBottomLeftRadius: msg.isOwn ? '20px' : '4px',
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        boxShadow: msg.isOwn ? '0 4px 15px rgba(37, 117, 252, 0.3)' : 'none',
                        border: msg.isOwn ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div
              style={{
                padding: '1.5rem',
                borderTop: '1px solid var(--glass-border)',
                background: 'rgba(0,0,0,0.2)',
                paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
              }}
            >
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Message..."
                  className="glass-input"
                  style={{
                    borderRadius: '16px',
                    padding: '14px 20px',
                    fontSize: '0.95rem',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="btn-primary"
                  disabled={!message.trim()}
                  style={{
                    width: '50px',
                    height: '50px',
                    padding: 0,
                    minWidth: '50px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(37, 117, 252, 0.4)',
                  }}
                >
                  <Send size={22} />
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatDrawer;
