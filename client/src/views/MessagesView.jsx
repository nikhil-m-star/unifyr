import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageSquare, Clock, ChevronRight, Loader2 } from 'lucide-react';
import axios from '../api/axios';
import GlassCard from '../components/common/GlassCard';
import { useChat } from '../context/ChatContext';
import useIsMobile from '../hooks/useIsMobile';

const MessagesView = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const { openChat } = useChat();
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
        <span className="section-kicker">Communication</span>
        <h1 className="page-title">Messages</h1>
        <p className="messages-subtitle">
          Coordinate with your matched partners and teammate recruits.
        </p>
      </motion.div>

      {sessions.length > 0 ? (
        <div className="messages-list">
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={isMobile ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => openChat(session.id, { 
                id: session.partner_id, 
                name: session.partner_name, 
                profile_pic: session.partner_profile_pic,
                role: session.partner_role
              })}
            >
              <GlassCard className="message-item" style={{ cursor: 'pointer' }}>
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
                  
                  <div className="msg-topic">{session.topic}</div>

                  <p className="msg-preview" style={{ 
                    fontWeight: session.last_message_content ? 500 : 400,
                    fontStyle: session.last_message_content ? 'normal' : 'italic'
                  }}>
                    {session.last_message_content || 'No messages yet — start the conversation!'}
                  </p>
                </div>

                <div className="msg-chevron">
                  <ChevronRight size={18} />
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
            Start discovering teammates or finding random matches to begin your first conversation.
          </p>
          <div className="messages-empty__actions">
            <Link to="/teammates" className="btn-primary">Find Teammates</Link>
            <Link to="/ready" className="btn-secondary">Random Match</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesView;
