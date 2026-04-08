import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, Loader2, Trash2 } from 'lucide-react';
import axios from '../api/axios';
import GlassCard from '../components/common/GlassCard';
import useIsMobile from '../hooks/useIsMobile';

const MessagesView = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const fetchSessions = async () => {
    try {
      const token = await getToken();
      const response = await axios.get('/chat', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [getToken]);

  const handleDeleteSession = async (event, sessionId) => {
    event.stopPropagation();
    const shouldDelete = window.confirm('Delete this chat and all its messages?');
    if (!shouldDelete) return;

    try {
      setDeletingSessionId(sessionId);
      const token = await getToken();
      await axios.delete(`/chat/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchSessions();
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      alert('Could not delete chat right now. Please try again.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="messages-loading">
        <Loader2 className="animate-spin" size={28} color="var(--accent-primary)" />
        <p>Syncing your conversations...</p>
      </div>
    );
  }

  return (
    <div className="market-shell">
      <motion.div
        initial={isMobile ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="messages-header"
      >
        <h1 className="page-title">Messages</h1>
      </motion.div>

      {sessions.length > 0 ? (
        <div className="messages-list">
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={isMobile ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <GlassCard
                className="message-item"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/messages/${session.id}`, {
                  state: {
                    partner: {
                      id: session.partner_id,
                      name: session.partner_name,
                      profile_pic: session.partner_profile_pic,
                      role: session.partner_role,
                    },
                  },
                })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/messages/${session.id}`, {
                      state: {
                        partner: {
                          id: session.partner_id,
                          name: session.partner_name,
                          profile_pic: session.partner_profile_pic,
                          role: session.partner_role,
                        },
                      },
                    });
                  }
                }}
              >
                <div className="msg-avatar-wrap">
                  <div className="msg-avatar">
                    {session.partner_profile_pic ? (
                      <img src={session.partner_profile_pic} alt={session.partner_name} />
                    ) : (
                      <span>{session.partner_name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  <span className="msg-status-dot" />
                </div>

                <div className="msg-content">
                  <div className="msg-top-row">
                    <h3 className="msg-name">{session.partner_name}</h3>
                    <span className="msg-time">
                      <Clock size={11} />
                      {formatTime(session.last_message_at || session.created_at)}
                    </span>
                  </div>

                  <div className="msg-topic">{session.topic || 'Chat'}</div>

                  <p className="msg-preview" style={{
                    fontWeight: session.last_message_content ? 500 : 400,
                    fontStyle: session.last_message_content ? 'normal' : 'italic',
                  }}>
                    {session.last_message_content || 'No messages yet — start the conversation!'}
                  </p>
                </div>

                <div className="msg-thread-item__actions">
                  <button
                    type="button"
                    className="msg-delete-btn"
                    onClick={(event) => handleDeleteSession(event, session.id)}
                    disabled={deletingSessionId === session.id}
                    aria-label="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="messages-empty">
          <div className="messages-empty__icon">
            <MessageSquare size={28} />
          </div>
          <h2>No Conversations Yet</h2>
          <p>
            Start discovering teammates to begin your first conversation.
          </p>
          <div className="messages-empty__actions">
            <Link to="/" className="btn-primary">Find Events</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesView;
