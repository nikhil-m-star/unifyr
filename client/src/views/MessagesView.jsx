import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, Loader2, Trash2 } from 'lucide-react';
import axios from '../api/axios';
import GlassCard from '../components/common/GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { toast } from 'react-hot-toast';

const MessagesView = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [onlineIds, setOnlineIds] = useState(new Set());
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

  const fetchOnlineStatus = async () => {
    try {
      const token = await getToken();
      const response = await axios.get('/users/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ids = Array.isArray(response.data?.userIds) ? response.data.userIds : [];
      setOnlineIds(new Set(ids));
    } catch (error) {
      console.error('Failed to fetch online presence:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchOnlineStatus();
    
    const sessionInterval = setInterval(fetchSessions, 10000); 
    const presenceInterval = setInterval(fetchOnlineStatus, 10000);
    
    return () => {
      clearInterval(sessionInterval);
      clearInterval(presenceInterval);
    };
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
      toast.error('Could not delete chat right now. Please try again.');
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
    <div className="market-shell" style={{ paddingBottom: '100px' }}>
      <motion.div
        initial={isMobile ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="messages-header"
      >
        <h1 className="page-title">Messages</h1>
      </motion.div>

      {sessions.length > 0 ? (
        <div className="messages-list">
          {sessions.map((session, index) => {
            const hasUnread = Number(session.unread_count) > 0;
            return (
              <motion.div
                key={session.id}
                initial={isMobile ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <GlassCard
                  className={`message-item ${hasUnread ? 'message-item--unread' : ''}`}
                  role="button"
                  tabIndex={0}
                  style={{ 
                    cursor: 'pointer',
                    position: 'relative',
                    borderLeft: hasUnread ? '3px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.08)'
                  }}
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
                >
                  <div className="msg-avatar-wrap">
                    <div className="msg-avatar" style={{ 
                      border: hasUnread ? '2px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.08)' 
                    }}>
                      {session.partner_profile_pic ? (
                        <img src={session.partner_profile_pic} alt={session.partner_name} />
                      ) : (
                        <span>{session.partner_name?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                    {hasUnread && (
                      <div style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#ff4444',
                        color: '#fff',
                        borderRadius: '10px',
                        minWidth: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        boxShadow: '0 2px 8px rgba(255, 68, 68, 0.4)',
                        padding: '0 6px',
                        zIndex: 2
                      }}>
                        {session.unread_count}
                      </div>
                    )}
                  </div>

                  <div className="msg-content">
                    <div className="msg-top-row">
                      <h3 className="msg-name" style={{ fontWeight: hasUnread ? 800 : 700 }}>
                        {session.partner_name}
                      </h3>
                      <span className="msg-time">
                        <Clock size={11} />
                        {formatTime(session.last_message_at || session.created_at)}
                      </span>
                    </div>

                    <div 
                      className="msg-topic" 
                      style={{ 
                        color: hasUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      <span style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: onlineIds.has(session.partner_id) ? '#10b981' : '#4b5563',
                        boxShadow: onlineIds.has(session.partner_id) ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
                      }} />
                      {onlineIds.has(session.partner_id) ? 'Online' : 'Offline'}
                    </div>

                    <p className="msg-preview" style={{
                      fontWeight: hasUnread ? 600 : 400,
                      color: hasUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
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
            );
          })}
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
