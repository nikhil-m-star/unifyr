import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Loader2, Radar as RadarIcon, Users, MessageSquare, X, Zap } from 'lucide-react';
import axios, { API_ORIGIN } from '../api/axios';
import GlassCard from '../components/common/GlassCard';
import useIsMobile from '../hooks/useIsMobile';

const RadarView = () => {
  const [status, setStatus] = useState('idle');
  const [partner, setPartner] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [totalActiveCount, setTotalActiveCount] = useState(0);
  const socketRef = useRef(null);
  const { getToken, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
          const u = Array.isArray(response.data?.users) ? response.data.users : [];
          setActiveUsers(u);
          // count is length of other users, so +1 for current user
          setTotalActiveCount((response.data?.count || 0) + 1);
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
    <div className="market-shell" style={{ 
      minHeight: 'calc(100vh - 80px)', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: isMobile ? '1rem' : '2rem',
      overflow: 'hidden'
    }}>
      <div style={{ maxWidth: '800px', width: '100%', margin: 'auto', position: 'relative', zIndex: 10 }}>
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <GlassCard style={{ padding: isMobile ? '1.5rem' : '3rem', textAlign: 'center', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  top: '-100px',
                  right: '-100px',
                  width: '300px',
                  height: '300px',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
                  zIndex: -1
                }} />
                
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div className="section-head" style={{ justifyContent: 'center', marginBottom: '1.2rem' }}>
                    <span className="section-kicker" style={{ background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <Zap size={14} style={{ color: '#fbbf24', fill: '#fbbf24' }} /> SOCIAL RADAR
                    </span>
                  </div>
                  
                  <h1 className="page-title" style={{ fontSize: isMobile ? '2rem' : '3.5rem', marginBottom: '1rem', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    Meet Someone <span style={{ color: 'var(--accent-primary)' }}>New.</span>
                  </h1>
                  
                  <p className="messages-subtitle" style={{ fontSize: '1.05rem', marginInline: 'auto', marginBottom: '2.5rem', maxWidth: '520px', opacity: 0.9 }}>
                    Connect instantly with fellow students active across the campus right now. No swipes, just real talk.
                  </p>

                  <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(255,255,255,0.15)' }}
                    whileTap={{ scale: 0.95 }}
                    type="button" 
                    className="btn-primary" 
                    onClick={startMatch} 
                    style={{ padding: '18px 42px', fontSize: '1.15rem', borderRadius: '20px', fontWeight: 700 }}
                  >
                    <RadarIcon size={22} className="pulse-icon" style={{ marginRight: '10px' }} /> Start Scanning
                  </motion.button>

                  <div style={{ marginTop: '4rem' }}>
                    <div className="section-kicker" style={{ justifyContent: 'center', marginBottom: '1.5rem', opacity: 0.8, fontSize: '0.9rem' }}>
                      <Users size={14} /> <strong>{totalActiveCount}</strong> Students Online Website-Wide
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
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
                        <div style={{ opacity: 0.6, fontSize: '0.85rem', alignSelf: 'center', fontWeight: 600 }}>+{activeUsers.length - 8} more</div>
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
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
            >
              <div className="radar-view-container">
                <div className="radar-view-scanner"></div>
                <div className="radar-view-circles">
                  <span></span><span></span><span></span>
                </div>
                <div className="radar-view-icon">
                  <RadarIcon size={44} color="white" />
                </div>
              </div>
              
              <h2 style={{ marginTop: '2.5rem', fontSize: '2rem', fontWeight: 900, textAlign: 'center' }}>Scanning Radar...</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem', textAlign: 'center' }}>Looking for your perfect connection among {totalActiveCount} users.</p>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button" 
                className="btn-ghost" 
                onClick={cancelMatch} 
                style={{ marginTop: '2.5rem', padding: '12px 28px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', fontSize: '0.95rem' }}
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
              style={{ width: '100%' }}
            >
              <GlassCard style={{ padding: isMobile ? '2rem' : '4rem', textAlign: 'center', border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fff 0%, #a5a5a5 100%)',
                  margin: '0 auto 2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                  padding: '4px'
                }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#222' }}>
                    {partner?.profile_pic ? (
                      <img src={partner.profile_pic} alt={partner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 900, color: '#fff' }}>
                        {partner?.name?.charAt(0) || '!'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="section-kicker" style={{ justifyContent: 'center', marginBottom: '0.8rem', color: '#10b981', fontWeight: 900, letterSpacing: '0.1em' }}>CONNECTION ESTABLISHED</div>
                <h2 style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: '0.8rem', letterSpacing: '-0.02em' }}>{partner?.name || 'Anonymous'}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.15rem', opacity: 0.8 }}>
                  Is ready to chat with you! Start the conversation now.
                </p>
                
                <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-primary" onClick={openChat} style={{ padding: '16px 36px', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 800 }}>
                    <MessageSquare size={20} style={{ marginRight: '8px' }} /> Say Hello
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setStatus('idle')} style={{ padding: '16px 28px', borderRadius: '16px', fontWeight: 600 }}>
                    Keep Scanning
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>
        {`
          .radar-view-container { position: relative; width: 260px; height: 260px; display: flex; align-items: center; justify-content: center; transform: scale(${isMobile ? 0.8 : 1}); }
          .radar-view-scanner { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; border: 2px solid rgba(255,255,255,0.08); background: conic-gradient(from 0deg, rgba(255,255,255,0.25) 0deg, transparent 110deg); animation: rotate-radar 3s linear infinite; }
          .radar-view-circles span { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 1px solid rgba(255,255,255,0.12); border-radius: 50%; animation: pulse-radar 3s infinite cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; }
          .radar-view-circles span:nth-child(1) { width: 60px; height: 60px; animation-delay: 0s; }
          .radar-view-circles span:nth-child(2) { width: 140px; height: 140px; animation-delay: 1s; }
          .radar-view-circles span:nth-child(3) { width: 240px; height: 240px; animation-delay: 2s; }
          .radar-view-icon { position: relative; z-index: 5; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 50%; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 0 40px rgba(255,255,255,0.1); }
          .pulse-icon { animation: icon-pulse 2s infinite ease-in-out; }
          
          @keyframes rotate-radar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse-radar { 0% { width: 0px; height: 0px; opacity: 1; } 100% { width: 320px; height: 320px; opacity: 0; } }
          @keyframes icon-pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.15); } 100% { opacity: 1; transform: scale(1); } }
        `}
      </style>
    </div>
  );
};

export default RadarView;
