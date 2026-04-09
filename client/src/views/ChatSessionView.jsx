import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';
import axios from '../api/axios';
import useIsMobile from '../hooks/useIsMobile';

const mapMessage = (entry, myUserId) => ({
  id: entry.id,
  text: entry.content,
  senderId: entry.sender_id,
  senderName: entry.sender_name,
  timestamp: entry.created_at,
  isOwn: Number(entry.sender_id) === Number(myUserId),
  isRead: entry.is_read,
  status: 'sent',
});

const ChatSessionView = ({ socket }) => {
  const { sessionId: sessionIdParam } = useParams();
  const sessionId = Number(sessionIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken, user: clerkUser } = useAuth();
  const isMobile = useIsMobile();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [partner, setPartner] = useState(location.state?.partner || null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isPartnerSeen, setIsPartnerSeen] = useState(false);
  
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);

  // Scroll to bottom helper
  const scrollToBottom = (behavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [loading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;

    const load = async () => {
      try {
        const token = await getToken();

        const [meRes, sessionsRes, chatRes] = await Promise.all([
          axios.get('/users/me', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/chat', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`/chat/${sessionId}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!mounted) return;

        const meId = meRes.data?.user?.id;
        setMyUserId(meId);

        const sessionsList = Array.isArray(sessionsRes.data?.sessions) ? sessionsRes.data.sessions : [];
        const matchingSession = sessionsList.find((session) => Number(session.id) === sessionId);
        
        if (matchingSession) {
          setPartner({
            id: matchingSession.partner_id,
            name: matchingSession.partner_name,
            profile_pic: matchingSession.partner_profile_pic,
            role: matchingSession.partner_role,
          });
        }

        const history = (chatRes.data?.messages || []).map((entry) => mapMessage(entry, meId));
        setMessages(history);
        
        // Check seen status for last own message
        if (history.length > 0) {
          const lastOwn = [...history].reverse().find(m => m.isOwn);
          if (lastOwn?.isRead) setIsPartnerSeen(true);
        }

        // Emit seen event
        socket?.emit('chat:seen', { sessionId });
      } catch (error) {
        console.error('Failed to load chat session:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    socket?.emit('chat:join', { sessionId });

    return () => {
      mounted = false;
    };
  }, [getToken, sessionId, socket]);

  useEffect(() => {
    if (!socket || !sessionId || !myUserId) return undefined;

    const handleIncomingMessage = (incomingMessage) => {
      if (Number(incomingMessage.session_id) !== sessionId) return;
      
      const mapped = mapMessage(incomingMessage, myUserId);
      
      setMessages((current) => {
        if (mapped.isOwn) {
          const exists = current.find(m => m.status === 'pending' && m.text === mapped.text);
          if (exists) {
            return current.map(m => (m === exists ? mapped : m));
          }
        }
        if (current.find(m => m.id === mapped.id)) return current;
        return [...current, mapped];
      });

      // Automatically emit seen for incoming messages if chat is active
      if (!mapped.isOwn) {
        socket.emit('chat:seen', { sessionId });
        setIsPartnerTyping(false);
      } else {
        setIsPartnerSeen(false); // Reset seen for your new message
      }
    };

    const handleTyping = (data) => {
      if (Number(data.sessionId) === sessionId && Number(data.userId) !== myUserId) {
        setIsPartnerTyping(data.isTyping);
      }
    };

    const handleSeen = (data) => {
      if (Number(data.sessionId) === sessionId && Number(data.userId) !== myUserId) {
        setIsPartnerSeen(true);
        setMessages(current => current.map(m => m.isOwn ? { ...m, isRead: true } : m));
      }
    };

    socket.on('chat:message', handleIncomingMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:seen', handleSeen);

    return () => {
      socket.off('chat:message', handleIncomingMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:seen', handleSeen);
    };
  }, [myUserId, sessionId, socket]);

  const handleSend = (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !socket || !sessionId) return;

    // Optimistic Update
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      text: trimmedMessage,
      senderId: myUserId,
      senderName: clerkUser?.fullName || 'Me',
      timestamp: new Date().toISOString(),
      isOwn: true,
      status: 'pending'
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setIsPartnerSeen(false); // New message hasn't been seen yet
    socket.emit('chat:send', { sessionId, content: trimmedMessage });
    
    // Stop typing immediately on send
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit('chat:typing', { sessionId, isTyping: false });
    }
    
    setMessage('');
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessage(val);

    if (!socket || !sessionId) return;

    // Emit typing start if not already emitted recently
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 2000) {
      socket.emit('chat:typing', { sessionId, isTyping: true });
      lastTypingEmitRef.current = now;
    }

    // Debounce typing stop
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', { sessionId, isTyping: false });
      lastTypingEmitRef.current = 0;
    }, 3000);
  };

  const handleDeleteMessage = async (messageId) => {
    if (typeof messageId === 'string' && messageId.startsWith('temp-')) return;
    
    const shouldDelete = window.confirm('Delete this message?');
    if (!shouldDelete) return;

    try {
      setDeletingMessageId(messageId);
      const token = await getToken();
      await axios.delete(`/chat/${sessionId}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((currentMessages) => currentMessages.filter((entry) => entry.id !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Unable to delete the message right now.');
    } finally {
      setDeletingMessageId(null);
    }
  };

  return (
    <div className="market-shell" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div className="chat-page" style={{ flex: 1, height: '100%', borderRadius: isMobile ? '0' : '24px' }}>
        <div className="chat-page__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={() => navigate('/messages')} className="btn-ghost" style={{ width: '38px', height: '38px', padding: 0, borderRadius: '12px', minWidth: '38px' }}>
              <ArrowLeft size={20} />
            </button>
            <div className="chat-page__avatar">
              {partner?.profile_pic ? (
                <img src={partner.profile_pic} alt={partner?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#0a0a0a', fontWeight: 800 }}>{partner?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="chat-page__name" style={{ fontSize: '1rem' }}>{partner?.name || 'Loading...'}</h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{partner?.role || 'Online'}</span>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="chat-page__messages hide-scrollbar" style={{ padding: '1.5rem', gap: '0.6rem' }}>
          {loading ? (
            <div className="messages-loading" style={{ height: '100%' }}>
              <div className="loader-ring" />
              <p>Fetching conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="messages-empty" style={{ padding: '4rem 1rem' }}>
              <h2 style={{ fontSize: '1.4rem' }}>No messages yet</h2>
              <p>Start chatting with {partner?.name?.split(' ')[0] || 'your connection'}!</p>
            </div>
          ) : (
            <>
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                    style={{ 
                      alignSelf: msg.isOwn ? 'flex-end' : 'flex-start',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.isOwn ? 'flex-end' : 'flex-start',
                      maxWidth: '85%'
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        padding: '11px 16px',
                        borderRadius: msg.isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: msg.isOwn
                          ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)'
                          : 'rgba(255, 255, 255, 0.07)',
                        color: msg.isOwn ? '#000' : 'var(--text-primary)',
                        border: msg.isOwn ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: msg.isOwn ? '0 4px 15px rgba(0, 0, 0, 0.2)' : 'none',
                        fontSize: '0.94rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word'
                      }}
                    >
                      {msg.text}

                      {msg.isOwn && !msg.id.toString().startsWith('temp-') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          disabled={deletingMessageId === msg.id}
                          className="msg-delete-hover"
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#ff4444',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--bg-page)',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isPartnerSeen && messages.length > 0 && messages[messages.length - 1].isOwn && (
                <div style={{ alignSelf: 'flex-end', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '-2px', marginRight: '4px' }}>
                  Seen
                </div>
              )}

              {isPartnerTyping && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                  {partner?.name?.split(' ')[0]} is typing...
                </motion.div>
              )}
            </>
          )}
        </div>

        <div className="chat-page__composer" style={{ padding: '1.25rem' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="glass-input"
              style={{ flex: 1, borderRadius: '18px', padding: '14px 20px', fontSize: '0.95rem' }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={!message.trim()}
              style={{
                width: '50px',
                height: '50px',
                padding: 0,
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Send size={22} />
            </button>
          </form>
        </div>
      </div>
      <style>
        {`
          .motion-div:hover .msg-delete-hover { opacity: 1 !important; }
          .typing-indicator { display: flex; gap: 3px; }
          .typing-indicator span { width: 5px; height: 5px; background: currentColor; border-radius: 50%; display: inline-block; animation: typing-bounce 1.4s infinite ease-in-out both; }
          .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
          .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
          @keyframes typing-bounce { 
            0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
            40% { transform: scale(1); opacity: 0.8; }
          }
        `}
      </style>
    </div>
  );
};

export default ChatSessionView;
