import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import axios from '../../api/axios';
import useIsMobile from '../../hooks/useIsMobile';

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
  const isMobile = useIsMobile();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, [isOpen]);

  // Lock body scroll when open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (!isOpen || !sessionId) {
      if (!isOpen) setMessages([]);
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
    return () => { isMounted = false; };
  }, [getToken, isOpen, partner?.id, sessionId, socket]);

  useEffect(() => {
    if (!socket || !isOpen || !sessionId) return undefined;

    const handleIncomingMessage = (incomingMessage) => {
      if (Number(incomingMessage.session_id) !== Number(sessionId)) return;
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
              background: 'rgba(0, 0, 0, 0.55)',
              zIndex: 998,
              backdropFilter: 'blur(10px)',
            }}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              maxWidth: isMobile ? '100vw' : '460px',
              zIndex: 999,
              background: 'linear-gradient(180deg, var(--bg-tertiary), var(--bg-primary))',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isMobile ? 'none' : '-8px 0 40px rgba(0, 0, 0, 0.5)',
              borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(8px)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && (
                  <button onClick={onClose} className="btn-ghost" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px', minWidth: '36px' }}>
                    <ArrowLeft size={18} />
                  </button>
                )}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'linear-gradient(145deg, #fafafa 0%, #d4d4d4 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)', flexShrink: 0,
                }}>
                  {partner?.profile_pic ? (
                    <img src={partner.profile_pic} alt={partner?.name || 'Partner'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#0a0a0a', fontWeight: 700 }}>{partner?.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, color: 'var(--text-primary)' }}>
                    {partner?.name || 'Teammate'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '7px', height: '7px', background: 'var(--accent-teal)', borderRadius: '50%', boxShadow: '0 0 8px var(--accent-teal)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {!isMobile && (
                <button className="btn-ghost" onClick={onClose} style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px' }}>
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} style={{
              flex: 1, padding: '1.25rem', overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: '0.75rem', scrollbarWidth: 'none',
            }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                  <div className="loader-ring" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Retrieving messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', marginTop: 'auto', marginBottom: 'auto' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.06)', width: '64px', height: '64px', borderRadius: '20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.25rem', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <Send size={28} />
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
                    Start the conversation!
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '220px', margin: '0 auto' }}>
                    Send a message to coordinate with {partner?.name?.split(' ')[0] || 'your teammate'}.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, scale: 0.96, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    style={{ alignSelf: msg.isOwn ? 'flex-end' : 'flex-start', maxWidth: '82%' }}
                  >
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: msg.isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.isOwn
                        ? 'linear-gradient(145deg, #fafafa 0%, #e5e5e5 100%)'
                        : 'rgba(255, 255, 255, 0.08)',
                      color: msg.isOwn ? '#0a0a0a' : 'var(--text-primary)',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      boxShadow: msg.isOwn ? '0 4px 16px rgba(0, 0, 0, 0.28)' : 'none',
                      border: msg.isOwn ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                    }}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Input Bar */}
            <div style={{
              padding: '1rem 1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.15)',
              paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
              flexShrink: 0,
            }}>
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Message..."
                  className="glass-input"
                  style={{ borderRadius: '14px', padding: '12px 16px', fontSize: '0.9rem' }}
                />
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  type="submit"
                  className="btn-primary"
                  disabled={!message.trim()}
                  style={{
                    width: '46px', height: '46px', padding: 0, minWidth: '46px',
                    borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Send size={20} />
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
