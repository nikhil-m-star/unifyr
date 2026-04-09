import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Trash2, Clock, CheckCheck } from 'lucide-react';
import axios from '../api/axios';
import useIsMobile from '../hooks/useIsMobile';

const mapMessage = (entry, myUserId) => ({
  id: entry.id,
  text: entry.content,
  senderId: entry.sender_id,
  senderName: entry.sender_name,
  timestamp: entry.created_at,
  isOwn: Number(entry.sender_id) === Number(myUserId),
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
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

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
  }, [messages]);

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
        // If this is our own message coming back, we update the optimistic one if it exists
        if (mapped.isOwn) {
          const exists = current.find(m => m.status === 'pending' && m.text === mapped.text);
          if (exists) {
            return current.map(m => (m === exists ? mapped : m));
          }
        }
        
        // Avoid duplicates
        if (current.find(m => m.id === mapped.id)) return current;
        
        return [...current, mapped];
      });
    };

    socket.on('chat:message', handleIncomingMessage);
    return () => socket.off('chat:message', handleIncomingMessage);
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
    socket.emit('chat:send', { sessionId, content: trimmedMessage });
    setMessage('');
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
                    
                    {msg.isOwn && (
                      <div style={{ 
                        position: 'absolute', 
                        bottom: '4px', 
                        right: '8px', 
                        display: 'flex', 
                        gap: '2px', 
                        opacity: 0.6
                      }}>
                        {msg.status === 'pending' ? (
                          <Clock size={10} style={{ color: '#000' }} />
                        ) : (
                          <CheckCheck size={10} style={{ color: '#0a0a0a' }} />
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="chat-page__composer" style={{ padding: '1.25rem' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
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
    </div>
  );
};

export default ChatSessionView;
