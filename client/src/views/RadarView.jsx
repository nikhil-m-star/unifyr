import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import GlassCard from '../components/common/GlassCard';
import { Search, X, CheckCircle, MessageSquare, Zap } from 'lucide-react';
import axios from '../api/axios';
import { useChat } from '../context/ChatContext';

const RadarView = ({ globalSocket }) => {
  const [status, setStatus] = useState('idle');
  const [partner, setPartner] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const { getToken, isSignedIn } = useAuth();
  const { openChat } = useChat();
  const normalizedTopic = 'random';

  useEffect(() => {
    if (!isSignedIn || !globalSocket) return undefined;

    const handleMatchSuccess = ({ sessionId: matchedSessionId, partner: matchedPartner }) => {
      setPartner(matchedPartner);
      setSessionId(matchedSessionId);
      setStatus('matched');
    };

    const handleQueueError = ({ message }) => {
      console.error('Matchmaking queue error:', message);
      setStatus('idle');
      alert(message || 'Unable to join the matchmaking queue right now.');
    };

    globalSocket.on('match_success', handleMatchSuccess);
    globalSocket.on('queue_error', handleQueueError);

    return () => {
      globalSocket.off('match_success', handleMatchSuccess);
      globalSocket.off('queue_error', handleQueueError);
    };
  }, [isSignedIn, globalSocket]);

  useEffect(() => {
    if (!isSignedIn) return undefined;

    let isMounted = true;
    const fetchActiveUsers = async () => {
      try {
        const token = await getToken();
        const response = await axios.get('/users/active', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isMounted) setActiveUsers(response.data.users || []);
      } catch (error) {
        console.error('Failed to fetch active users:', error);
      }
    };

    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (status !== 'waiting' || !globalSocket) return undefined;
    globalSocket.emit('join_queue', { topicKeywords: normalizedTopic });
    return () => {};
  }, [normalizedTopic, status, globalSocket]);

  const handleJoinQueue = (event) => {
    event.preventDefault();
    setStatus('waiting');
  };

  const handleLeaveQueue = () => {
    if (globalSocket) globalSocket.emit('leave_queue');
    setStatus('idle');
    setPartner(null);
    setSessionId(null);
  };

  const handleOpenChat = () => {
    if (sessionId && partner) openChat(sessionId, partner);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: '75vh', justifyContent: 'center', padding: '1rem', width: '100%',
    }}>
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', maxWidth: '640px' }}
          >
            <GlassCard style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
              <div style={{
                background: 'rgba(255,255,255,0.08)', width: '68px', height: '68px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem', color: 'var(--text-primary)',
                border: '1px solid rgba(255,255,255,0.14)',
                boxShadow: '0 0 30px rgba(255,255,255,0.06)',
              }}>
                <Zap size={28} />
              </div>

              <h2 style={{ fontSize: '1.6rem', marginBottom: '0.6rem', fontFamily: 'var(--font-display)' }}>
                Find a <span className="gradient-text">Random Match</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
                Get instantly paired with someone active right now for collaboration or networking.
              </p>

              <form onSubmit={handleJoinQueue} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '360px', margin: '0 auto' }}>
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}>
                  <Zap size={18} /> Match Me Now
                </button>
              </form>

              <div style={{ marginTop: '2rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div className="section-kicker">Active now</div>
                  <span className="text-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-teal)', boxShadow: '0 0 6px var(--accent-teal)' }} />
                    {activeUsers.length} online
                  </span>
                </div>

                <div style={{
                  padding: '0.9rem 1rem', borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5,
                }}>
                  {activeUsers.length > 0
                    ? `${activeUsers.length} people are online and available to match right now.`
                    : 'No one is active right now. Check back later — new people join frequently.'}
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
            exit={{ opacity: 0, scale: 1.04 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 2.5rem' }}>
              <motion.div
                animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, border: '2px solid var(--accent-secondary)', borderRadius: '50%' }}
              />
              <motion.div
                animate={{ scale: [1, 1.7], opacity: [0.3, 0] }}
                transition={{ duration: 2.2, delay: 0.7, repeat: Infinity, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.35)', borderRadius: '50%' }}
              />
              <div style={{
                position: 'absolute', inset: '28%',
                background: 'linear-gradient(145deg, #fafafa 0%, #d4d4d4 100%)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10, boxShadow: '0 0 40px rgba(255,255,255,0.12)',
                border: '2px solid rgba(255,255,255,0.15)',
              }}>
                <Search size={28} color="#0a0a0a" />
              </div>
            </div>

            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Scanning Network...</h3>
            <p style={{ color: 'var(--accent-secondary)', fontWeight: 600, marginTop: '0.4rem', fontSize: '0.92rem' }}>Looking for any active person</p>

            <button className="btn-ghost" onClick={handleLeaveQueue} style={{ marginTop: '2rem' }}>
              <X size={16} /> Cancel Search
            </button>
          </motion.div>
        )}

        {status === 'matched' && partner && (
          <motion.div key="matched" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', maxWidth: '420px' }}>
            <GlassCard style={{ padding: '2.5rem 2rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.14)' }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}
              >
                <CheckCircle size={52} style={{ margin: '0 auto' }} />
              </motion.div>

              <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem', fontFamily: 'var(--font-display)' }}>Matched!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
                You found someone active right now
              </p>

              <div style={{
                background: 'rgba(255,255,255,0.04)', padding: '1.5rem',
                borderRadius: 'var(--radius-xl)', marginBottom: '1.75rem',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{
                  width: '76px', height: '76px', borderRadius: '50%',
                  background: 'linear-gradient(145deg, #fafafa 0%, #d4d4d4 100%)',
                  margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.8rem', fontWeight: 'bold', overflow: 'hidden',
                  color: '#0a0a0a',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)', border: '2px solid rgba(255,255,255,0.12)',
                }}>
                  {partner.profile_pic ? (
                    <img src={partner.profile_pic} alt={partner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    partner.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{partner.name}</h3>
                <p className="chip" style={{
                  marginTop: '0.5rem', background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.12)',
                }}>
                  {partner.role || 'Student'}
                </p>
                {partner.bio && (
                  <p style={{ marginTop: '0.75rem', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{partner.bio}</p>
                )}
              </div>

              <button className="btn-primary" onClick={handleOpenChat} style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}>
                <MessageSquare size={18} /> Open Chat
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RadarView;
