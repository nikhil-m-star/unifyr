import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
});

const ChatSessionView = ({ socket }) => {
  const { sessionId: sessionIdParam } = useParams();
  const sessionId = Number(sessionIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();
  const isMobile = useIsMobile();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [partner, setPartner] = useState(location.state?.partner || null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
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

        const meId = meRes.data?.id;
        setMyUserId(meId);

        const matchingSession = (sessionsRes.data?.sessions || []).find((session) => Number(session.id) === sessionId);
        if (matchingSession) {
          setPartner({
            id: matchingSession.partner_id,
            name: matchingSession.partner_name,
            profile_pic: matchingSession.partner_profile_pic,
            role: matchingSession.partner_role,
          });
        }

        setMessages((chatRes.data?.messages || []).map((entry) => mapMessage(entry, meId)));
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
      setMessages((currentMessages) => [...currentMessages, mapMessage(incomingMessage, myUserId)]);
    };

    socket.on('chat:message', handleIncomingMessage);
    return () => socket.off('chat:message', handleIncomingMessage);
  }, [myUserId, sessionId, socket]);

  const handleSend = (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !socket || !sessionId) return;
    socket.emit('chat:send', { sessionId, content: trimmedMessage });
    setMessage('');
  };

  const handleDeleteMessage = async (messageId) => {
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
    <div className="market-shell">
      <div className="chat-page">
        <div className="chat-page__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate('/messages')} className="btn-ghost" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px', minWidth: '36px' }}>
              <ArrowLeft size={18} />
            </button>
            <div className="chat-page__avatar">
              {partner?.profile_pic ? (
                <img src={partner.profile_pic} alt={partner?.name || 'Partner'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#0a0a0a', fontWeight: 700 }}>{partner?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div>
              <h3 className="chat-page__name">{partner?.name || 'Teammate'}</h3>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="chat-page__messages hide-scrollbar">
          {loading ? (
            <div className="messages-loading" style={{ height: '100%' }}>
              <div className="loader-ring" />
              <p>Retrieving messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="messages-empty" style={{ padding: isMobile ? '2rem 1rem' : '3rem 1rem' }}>
              <h2>Start the conversation!</h2>
              <p>Send a message to coordinate with {partner?.name?.split(' ')[0] || 'your teammate'}.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, scale: 0.96, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{ alignSelf: msg.isOwn ? 'flex-end' : 'flex-start', maxWidth: '82%' }}
              >
                <div
                  style={{
                    position: 'relative',
                    padding: '10px 14px',
                    paddingRight: msg.isOwn ? '34px' : '14px',
                    borderRadius: msg.isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.isOwn
                      ? 'linear-gradient(145deg, #fafafa 0%, #e5e5e5 100%)'
                      : 'rgba(255, 255, 255, 0.08)',
                    color: msg.isOwn ? '#0a0a0a' : 'var(--text-primary)',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    boxShadow: msg.isOwn ? '0 4px 16px rgba(0, 0, 0, 0.28)' : 'none',
                    border: msg.isOwn ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {msg.text}
                  {msg.isOwn && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(msg.id)}
                      disabled={deletingMessageId === msg.id}
                      aria-label="Delete message"
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '6px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(0,0,0,0.65)',
                        background: 'rgba(0,0,0,0.08)',
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="chat-page__composer">
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
            <button
              type="submit"
              className="btn-primary"
              disabled={!message.trim()}
              style={{
                width: '46px',
                height: '46px',
                padding: 0,
                minWidth: '46px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatSessionView;
