import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Loader2, Radar as RadarIcon, Users, MessageSquare, X, Zap } from 'lucide-react';
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
    <div className="market-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBlock: '2rem' }}>
      <div style={{ maxWidth: '800px', width: '100%', marginInline: 'auto' }}>
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <GlassCard style={{ padding: '2.5rem', textAlign: 'center', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  top: '-100px',
                  right: '-100px',
                  width: '300px',
                  height: '300px',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
                  zIndex: 0
                }} />
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div className="section-head" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
                    <span className="section-kicker" style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '10px' }}>
                      <Zap size={12} style={{ color: '#fbbf24' }} /> SOCIAL RADAR
                    </span>
                  </div>
                  
                  <h1 className="page-title" style={{ fontSize: isMobile ? '2.2rem' : '3.2rem', marginBottom: '1.2rem', letterSpacing: '-0.03em' }}>
                    Meet Someone <span style={{ color: 'var(--accent-primary)' }}>New.</span>
                  </h1>
                  
                  <p className="messages-subtitle" style={{ fontSize: '1.1rem', marginInline: 'auto', marginBottom: '2.5rem', maxWidth: '500px' }}>
                    Connect instantly with fellow students active on campus right now. No swipes, no waiting—just real talk.
                  </p>

                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button" 
                    className="btn-primary" 
                    onClick={startMatch} 
                    style={{ padding: '16px 36px', fontSize: '1.1rem', borderRadius: '18px', boxShadow: '0 10px 25px rgba(255,255,255,0.15)' }}
                  >
                    <RadarIcon size={20} className="pulse-icon" /> Start Scanning
                  </motion.button>

                  <div style={{ marginTop: '4rem' }}>
                    <div className="section-kicker" style={{ justifyContent: 'center', marginBottom: '1.5rem', opacity: 0.8 }}>
                      <Users size={14} /> {activeUsers.length} Students Currently Active
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                      {activeUsers.length > 0 ? (
                        activeUsers.slice(0, 8).map((user, i) => (
                          <motion.div 
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              padding: '8px 16px',
                              borderRadius: '999px',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              border: '1px solid rgba(255,255,255,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                            {user.name.split(' ')[0]}
                          </motion.div>
                        ))
                      ) : (
                        <div style={{ opacity: 0.5, fontSize: '0.9rem' }}>Waiting for more students to join...</div>
                      )}
                      {activeUsers.length > 8 && (
                        <div style={{ opacity: 0.6, fontSize: '0.85rem', alignSelf: 'center' }}>+{activeUsers.length - 8} others</div>
                      )}
                    </div>
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
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div className="radar-container">
                <div className="radar-scanner"></div>
                <div className="radar-circles">
                  <span></span><span></span><span></span>
                </div>
                <div className="radar-icon-wrap">
                  <RadarIcon size={48} color="white" />
                </div>
              </div>
              
              <h2 style={{ marginTop: '2.5rem', fontSize: '1.8rem', fontWeight: 800 }}>Scanning Radar...</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1rem' }}>Found {activeUsers.length} potential connections.</p>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button" 
                className="btn-ghost" 
                onClick={cancelMatch} 
                style={{ marginTop: '2rem', padding: '10px 24px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)' }}
              >
                <X size={14} /> Cancel Search
              </motion.button>
            </motion.div>
          )}

          {status === 'matched' && (
            <motion.div 
              key="matched" 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 350 }}
            >
              <GlassCard style={{ padding: '3rem', textAlign: 'center', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fff 0%, #d4d4d4 100%)',
                  margin: '0 auto 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}>
                  {partner?.profile_pic ? (
                    <img src={partner.profile_pic} alt={partner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#000' }}>{partner?.name?.charAt(0) || '!'}</span>
                  )}
                </div>
                
                <div className="section-kicker" style={{ justifyContent: 'center', marginBottom: '0.6rem', color: '#10b981', fontWeight: 800 }}>CONNECTION FOUND</div>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.8rem' }}>{partner?.name || 'Anonymous'}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.1rem' }}>
                  {partner?.role || 'A fellow student'} is ready to chat with you!
                </p>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button type="button" className="btn-primary" onClick={openChat} style={{ padding: '14px 28px', borderRadius: '14px', fontSize: '1rem' }}>
                    <MessageSquare size={18} /> Send Message
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setStatus('idle')} style={{ padding: '14px 24px', borderRadius: '14px' }}>
                    Go Back
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>
        {`
          .radar-container { position: relative; width: 220px; height: 220px; display: flex; alignItems: center; justifyContent: center; }
          .radar-scanner { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; border: 2px solid rgba(255,255,255,0.1); background: conic-gradient(from 0deg, rgba(255,255,255,0.2) 0deg, transparent 90deg); animation: rotate-radar 2.5s linear infinite; }
          .radar-circles span { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 1px solid rgba(255,255,255,0.15); border-radius: 50%; animation: pulse-radar 2.5s infinite ease-out; opacity: 0; }
          .radar-circles span:nth-child(1) { width: 40px; height: 40px; animation-delay: 0s; }
          .radar-circles span:nth-child(2) { width: 100px; height: 100px; animation-delay: 0.8s; }
          .radar-circles span:nth-child(3) { width: 180px; height: 180px; animation-delay: 1.6s; }
          .radar-icon-wrap { position: relative; z-index: 2; background: rgba(255,255,255,0.1); padding: 25px; border-radius: 50%; backdrop-filter: blur(5px); box-shadow: 0 0 30px rgba(255,255,255,0.05); }
          .pulse-icon { animation: icon-pulse 2s infinite; }
          
          @keyframes rotate-radar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse-radar { 0% { width: 20px; height: 20px; opacity: 0.8; } 100% { width: 240px; height: 240px; opacity: 0; } }
          @keyframes icon-pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
        `}
      </style>
    </div>
  );
};

export default RadarView;
