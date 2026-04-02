import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';
import GlassCard from '../components/common/GlassCard';
import ChatDrawer from '../components/common/ChatDrawer';
import { Search, X, CheckCircle, MessageSquare } from 'lucide-react';
import axios, { API_ORIGIN } from '../api/axios';

const RadarView = () => {
  const [status, setStatus] = useState('idle');
  const [partner, setPartner] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const socketRef = useRef(null);
  const { getToken, isSignedIn } = useAuth();
  const normalizedTopic = 'random';

  useEffect(() => {
    if (!isSignedIn || socketRef.current) {
      return undefined;
    }

    let isMounted = true;

    const connectPresenceSocket = async () => {
      try {
        const token = await getToken();

        if (!isMounted || !token || socketRef.current) {
          return;
        }

        const newSocket = io(API_ORIGIN, {
          auth: { token },
        });

        socketRef.current = newSocket;

        newSocket.on('match_success', ({ sessionId: matchedSessionId, partner: matchedPartner }) => {
          setPartner(matchedPartner);
          setSessionId(matchedSessionId);
          newSocket.emit('chat:join', { sessionId: matchedSessionId });
          setStatus('matched');
        });

        newSocket.on('queue_error', ({ message }) => {
          console.error('Matchmaking queue error:', message);
          setStatus('idle');
          alert(message || 'Unable to join the matchmaking queue right now.');
        });

        newSocket.on('connect_error', (error) => {
          console.error('Presence socket connection error:', error);
        });
      } catch (error) {
        console.error('Failed to connect presence socket:', error);
      }
    };

    connectPresenceSocket();

    return () => {
      isMounted = false;

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) {
      return undefined;
    }

    let isMounted = true;

    const fetchActiveUsers = async () => {
      try {
        const token = await getToken();
        const response = await axios.get('/users/active', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (isMounted) {
          setActiveUsers(response.data.users || []);
        }
      } catch (error) {
        console.error('Failed to fetch active users:', error);
      }
    };

    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (status !== 'waiting') {
      return undefined;
    }

    if (!socketRef.current) {
      return undefined;
    }

    const activeSocket = socketRef.current;
    const handleQueueJoined = () => {
      setStatus('waiting');
    };

    activeSocket.on('queue_joined', handleQueueJoined);
    activeSocket.emit('join_queue', { topicKeywords: normalizedTopic });

    return () => {
      activeSocket.off('queue_joined', handleQueueJoined);
    };
  }, [normalizedTopic, status]);

  const handleJoinQueue = (event) => {
    event.preventDefault();
    setStatus('waiting');
  };

  const handleLeaveQueue = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave_queue');
    }

    setIsChatOpen(false);
    setStatus('idle');
    setPartner(null);
    setSessionId(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '75vh',
        justifyContent: 'center',
        padding: '1rem',
        width: '100%',
      }}
    >
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', maxWidth: '720px' }}
          >
            <GlassCard style={{ padding: '2rem', textAlign: 'center' }}>
              <div
                style={{
                  background: 'rgba(0,229,255,0.08)',
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(0,229,255,0.2)',
                }}
              >
                <Search size={32} />
              </div>

              <h2 style={{ fontSize: '1.8rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>
                Find a <span className="gradient-text">Random Connection</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                Jump into radar and get matched with any active person online right now.
              </p>

              <form onSubmit={handleJoinQueue} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '460px', margin: '0 auto' }}>
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px' }}>
                  Match Me Randomly
                </button>
              </form>

              <div style={{ marginTop: '2rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', gap: '1rem' }}>
                  <div className="section-kicker">Active now</div>
                  <span className="text-badge">{activeUsers.length} online</span>
                </div>

                <div
                  style={{
                    padding: '1rem 1.1rem',
                    borderRadius: '18px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.92rem',
                  }}
                >
                  {activeUsers.length > 0
                    ? `${activeUsers.length} people are online and available to match right now.`
                    : 'No one is active right now. Check back in a bit and new people will appear as they come online.'}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {status === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto 2.5rem' }}>
              <motion.div
                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, border: '2px solid var(--accent-cyan)', borderRadius: '50%' }}
              />
              <motion.div
                animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                transition={{ duration: 2.5, delay: 0.8, repeat: Infinity, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, border: '2px solid var(--accent-purple)', borderRadius: '50%' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '30%',
                  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  boxShadow: '0 0 40px rgba(0,229,255,0.4)',
                  border: '2px solid rgba(255,255,255,0.2)',
                }}
              >
                <Search size={32} color="white" />
              </div>
            </div>

            <h3 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Scanning Network...</h3>
            <p style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginTop: '0.5rem', fontSize: '1rem' }}>Looking for any active person</p>

            <button className="btn-ghost" onClick={handleLeaveQueue} style={{ marginTop: '2.5rem' }}>
              <X size={16} /> Cancel Search
            </button>
          </motion.div>
        )}

        {status === 'matched' && partner && (
          <motion.div key="matched" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', maxWidth: '440px' }}>
            <GlassCard style={{ padding: '2.5rem 2rem', textAlign: 'center', border: '1px solid rgba(200, 80, 192, 0.3)' }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                style={{ color: 'var(--accent-green)', marginBottom: '1.25rem' }}
              >
                <CheckCircle size={56} style={{ margin: '0 auto' }} />
              </motion.div>

              <h2 style={{ fontSize: '2.2rem', marginBottom: '0.25rem', fontFamily: 'var(--font-display)' }}>Matched!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                You found someone active right now
              </p>

              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  padding: '1.75rem',
                  borderRadius: 'var(--radius-xl)',
                  marginBottom: '2rem',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                    margin: '0 auto 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    border: '2px solid var(--glass-border)',
                  }}
                >
                  {partner.profile_pic ? (
                    <img src={partner.profile_pic} alt={partner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    partner.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{partner.name}</h3>
                <p
                  className="chip"
                  style={{
                    marginTop: '0.5rem',
                    background: 'rgba(255, 204, 112, 0.1)',
                    color: 'var(--accent-orange)',
                    border: '1px solid rgba(255, 204, 112, 0.2)',
                  }}
                >
                  {partner.role || 'Student'}
                </p>
                {partner.bio && (
                  <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{partner.bio}</p>
                )}
              </div>

              <button className="btn-primary" onClick={() => setIsChatOpen(true)} style={{ width: '100%', padding: '14px', fontSize: '1rem' }}>
                <MessageSquare size={18} /> Open Chat
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatDrawer
        key={sessionId || partner?.id || 'no-partner'}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        partner={partner}
        sessionId={sessionId}
        socket={socketRef.current}
      />
    </div>
  );
};

export default RadarView;
