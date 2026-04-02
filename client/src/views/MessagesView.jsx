import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { MessageSquare, Clock, User, ChevronRight, Loader2, Search } from 'lucide-react';
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
    // Refresh every 30 seconds for snippets
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" />
        <p style={{ color: 'var(--text-secondary)' }}>Syncing your conversations...</p>
      </div>
    );
  }

  return (
    <div className="market-shell">
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div className="section-head">
          <span className="section-kicker">Communication</span>
          <h1 className="page-title">Messages</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Coordinate with your matched partners and teammate recruits.
          </p>
        </div>
      </div>

      {sessions.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={isMobile ? false : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => openChat(session.id, { 
                id: session.partner_id, 
                name: session.partner_name, 
                profile_pic: session.partner_profile_pic,
                role: session.partner_role
              })}
            >
              <GlassCard 
                className="message-item"
                style={{ 
                  padding: '1.25rem 1.5rem', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.25rem',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '18px', 
                    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {session.partner_profile_pic ? (
                      <img src={session.partner_profile_pic} alt={session.partner_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'white', fontWeight: 700, fontSize: '1.2rem' }}>{session.partner_name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  <span style={{ 
                    position: 'absolute', 
                    bottom: '-2px', 
                    right: '-2px', 
                    width: '14px', 
                    height: '14px', 
                    background: 'var(--accent-teal)', 
                    borderRadius: '50%', 
                    border: '2px solid var(--bg-primary)',
                    boxShadow: '0 0 8px var(--accent-teal)'
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {session.partner_name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatTime(session.last_message_at || session.created_at)}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {session.topic}
                  </div>

                  <p style={{ 
                    fontSize: '0.92rem', 
                    color: 'var(--text-secondary)', 
                    margin: 0, 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    fontWeight: session.last_message_content ? 500 : 400,
                    fontStyle: session.last_message_content ? 'normal' : 'italic'
                  }}>
                    {session.last_message_content || 'No messages yet. Start coordinates!'}
                  </p>
                </div>

                <div style={{ color: 'var(--text-muted)' }}>
                  <ChevronRight size={20} />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            width: '80px', 
            height: '80px', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 2rem',
            color: 'var(--text-muted)',
            border: '1px solid var(--glass-border)'
          }}>
            <MessageSquare size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>No Conversations Yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '400px', margin: '0 auto 2.5rem' }}>
            Start discovering teammates or finding random matches to begin your first conversation.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="/teammates" className="btn-primary">Find Teammates</a>
            <a href="/ready" className="btn-secondary">Random Match</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesView;
