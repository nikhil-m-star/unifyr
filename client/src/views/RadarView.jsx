import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Loader2, Radar, Users, MessageSquare, X } from 'lucide-react';
import axios, { API_ORIGIN } from '../api/axios';
import GlassCard from '../components/common/GlassCard';

const RadarView = () => {
  const [status, setStatus] = useState('idle');
  const [partner, setPartner] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const socketRef = useRef(null);
  const { getToken, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn || socketRef.current) return undefined;

    let mounted = true;

    const connectSocket = async () => {
      try {
        const token = await getToken();
        if (!mounted || !token || socketRef.current) return;

        const socket = io(API_ORIGIN, { auth: { token }, transports: ['websocket'] });
        socketRef.current = socket;

        socket.on('match_success', ({ sessionId: matchedSessionId, partner: matchedPartner }) => {
          setPartner(matchedPartner || null);
          setSessionId(matchedSessionId || null);
          setStatus('matched');
        });

        socket.on('queue_error', ({ message }) => {
          setStatus('idle');
          window.alert(message || 'Unable to join matchmaking queue.');
        });
      } catch (error) {
        console.error('Failed to connect matchmaking socket:', error);
      }
    };

    connectSocket();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) return undefined;

    let mounted = true;
    const fetchActiveUsers = async () => {
      try {
        const token = await getToken();
        const response = await axios.get('/users/active', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (mounted) {
          setActiveUsers(Array.isArray(response.data?.users) ? response.data.users : []);
        }
      } catch (error) {
        console.error('Failed to fetch active users:', error);
      }
    };

    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [getToken, isSignedIn]);

  const startMatch = () => {
    if (!socketRef.current) return;
    setStatus('waiting');
    socketRef.current.emit('join_queue', { topicKeywords: 'random' });
  };

  const cancelMatch = () => {
    socketRef.current?.emit('leave_queue');
    setStatus('idle');
    setPartner(null);
    setSessionId(null);
  };

  const openChat = () => {
    if (!sessionId) return;
    navigate(`/messages/${sessionId}`, {
      state: {
        partner: {
          id: partner?.id,
          name: partner?.name,
          profile_pic: partner?.profile_pic,
          role: partner?.role,
        },
      },
    });
  };

  return (
    <div className="market-shell">
      <div className="feed-section top-section" style={{ maxWidth: '840px', marginInline: 'auto' }}>
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <GlassCard style={{ padding: '1.4rem' }}>
                <div className="section-head">
                  <span className="section-kicker">Social</span>
                </div>
                <h1 className="page-title" style={{ marginBottom: '0.8rem' }}>Meet Someone New</h1>
                <p className="messages-subtitle" style={{ marginBottom: '1rem' }}>
                  Join the queue and connect instantly with an active user for a random chat.
                </p>
                <button type="button" className="btn-primary" onClick={startMatch}>
                  <Radar size={16} /> Start Connecting
                </button>

                <div style={{ marginTop: '1.2rem' }}>
                  <div className="section-kicker" style={{ marginBottom: '0.5rem' }}>
                    <Users size={13} /> Active Users ({activeUsers.length})
                  </div>
                  <div className="event-groups">
                    {activeUsers.slice(0, 6).map((user) => (
                      <div key={user.id} className="surface-card" style={{ padding: '0.85rem 0.95rem' }}>
                        <div className="admin-primary-text">{user.name}</div>
                        <div className="admin-secondary-text">{user.ready_tag || user.role || 'Online'}</div>
                      </div>
                    ))}
                    {activeUsers.length === 0 && <div className="empty-state">No one is active yet.</div>}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {status === 'waiting' && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GlassCard style={{ padding: '2rem', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={28} />
                <h2 style={{ marginTop: '1rem' }}>Finding Someone...</h2>
                <p className="messages-subtitle">Searching for a new connection now.</p>
                <button type="button" className="btn-ghost" onClick={cancelMatch} style={{ marginTop: '1rem' }}>
                  <X size={14} /> Cancel
                </button>
              </GlassCard>
            </motion.div>
          )}

          {status === 'matched' && (
            <motion.div key="matched" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard style={{ padding: '1.6rem', textAlign: 'center' }}>
                <div className="section-kicker" style={{ justifyContent: 'center', marginBottom: '0.55rem' }}>Connected</div>
                <h2 style={{ marginBottom: '0.5rem' }}>{partner?.name || 'Found Someone!'}</h2>
                <p className="messages-subtitle" style={{ marginBottom: '1rem' }}>
                  Your chat session is ready.
                </p>
                <button type="button" className="btn-primary" onClick={openChat}>
                  <MessageSquare size={15} /> Open Chat
                </button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RadarView;
