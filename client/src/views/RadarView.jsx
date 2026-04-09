import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Radar as RadarIcon, Users, MessageSquare, X, Zap, Loader2, ShieldCheck } from 'lucide-react';
import axios, { API_ORIGIN } from '../api/axios';
import GlassCard from '../components/common/GlassCard';
import useIsMobile from '../hooks/useIsMobile';

const RadarView = () => {
  const [status, setStatus] = useState('idle'); // idle, waiting, matched
  const [partner, setPartner] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [totalActiveCount, setTotalActiveCount] = useState(0);
  const socketRef = useRef(null);
  const { getToken, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Socket Connection
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
          console.log('[Radar] Match success:', matchedSessionId);
          setPartner(matchedPartner || null);
          setSessionId(matchedSessionId || null);
          setStatus('matched');
        });

        socket.on('queue_error', ({ message }) => {
          console.error('[Radar] Queue error:', message);
          setStatus('idle');
          window.alert(message || 'Unable to join matchmaking queue.');
        });
        
        socket.on('connect', () => console.log('[Radar] Socket connected'));
        socket.on('disconnect', () => console.log('[Radar] Socket disconnected'));
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

  // Active Users Polling
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
    console.log('[Radar] Starting scan...');
    if (!socketRef.current) {
        console.warn('[Radar] Socket not initialized');
        return;
    }
    setStatus('waiting');
    socketRef.current.emit('join_queue', { topicKeywords: 'random' });
  };

  const cancelMatch = () => {
    console.log('[Radar] Canceling scan...');
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
    <div className="radar-page-wrapper" style={{ 
      minHeight: 'calc(100vh - 100px)', 
      display: 'flex', 
      flexDirection: 'column',
      paddingBottom: '2rem',
      background: 'radial-gradient(circle at 50% 50%, rgba(15, 15, 15, 1) 0%, rgba(0, 0, 0, 1) 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div className="app-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
        <AnimatePresence>
          {status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="radar-content-box"
              style={{ width: '100%', maxWidth: '900px', marginInline: 'auto' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <div className="section-head" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <span className="section-kicker" style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
                    <Zap size={14} style={{ color: '#fbbf24', fill: '#fbbf24' }} /> SOCIAL RADAR
                  </span>
                </div>
                
                <h1 className="page-title" style={{ fontSize: isMobile ? '2.4rem' : '4rem', marginBottom: '1.5rem', letterSpacing: '-0.05em', fontWeight: 900 }}>
                  Meet Someone <span className="text-glow" style={{ color: '#fff' }}>New.</span>
                </h1>
                
                <p style={{ fontSize: '1.2rem', marginInline: 'auto', marginBottom: '3rem', maxWidth: '580px', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.6 }}>
                  Connect instantly with fellow students active across the campus right now. No swipes, just real talk.
                </p>

                <motion.button 
                  whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.96 }}
                  type="button" 
                  className="btn-primary" 
                  onClick={startMatch} 
                  style={{ padding: '20px 48px', fontSize: '1.2rem', borderRadius: '24px', fontWeight: 800, background: '#fff', color: '#000' }}
                >
                  <RadarIcon size={24} className="pulse-icon" style={{ marginRight: '12px' }} /> Start Scanning
                </motion.button>
              </div>

              <div className="hud-active-users" style={{ marginTop: '2rem' }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '32px', 
                  padding: '24px',
                  backdropFilter: 'blur(20px)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <Users size={14} /> <span>{totalActiveCount} Students Active On Campus</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                    {activeUsers.length > 0 ? (
                      activeUsers.map((user, i) => (
                        <motion.div 
                          key={user.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.04 }}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            padding: '10px 18px',
                            borderRadius: '999px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: '#fff'
                          }}
                        >
                          <img 
                            src={user.profile_pic || `https://ui-avatars.com/api/?name=${user.name}&background=random&color=fff`} 
                            alt="" 
                            style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          {user.name.split(' ')[0]}
                        </motion.div>
                      ))
                    ) : (
                      <div style={{ opacity: 0.4, fontSize: '0.9rem', fontWeight: 600, padding: '10px' }}>Waiting for connections...</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'waiting' && (
            <motion.div 
              key="waiting" 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px' }}
            >
              <div className="radar-hud-container" style={{ transform: `scale(${isMobile ? 0.8 : 1.1})` }}>
                <div className="radar-hud-scanner"></div>
                <div className="radar-hud-grid"></div>
                <div className="radar-hud-rings">
                  <span></span><span></span><span></span>
                </div>
                <div className="radar-hud-core">
                  <RadarIcon size={48} color="white" strokeWidth={1.5} />
                </div>
                
                <div className="hud-deco hud-deco--tl">SCAN_V1.1</div>
                <div className="hud-deco hud-deco--tr">SEARCH_ACTIVE</div>
                <div className="hud-deco hud-deco--bl">{totalActiveCount} NODES</div>
                <div className="hud-deco hud-deco--br">CH_RANDOM</div>
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                <h2 className="searching-text" style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Scanning Radar...</h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Searching among {totalActiveCount} active peers</span>
                </div>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.95 }}
                type="button" 
                className="btn-ghost" 
                onClick={cancelMatch} 
                style={{ marginTop: '3rem', padding: '14px 32px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700 }}
              >
                <X size={16} style={{ marginRight: '8px' }} /> Abort Scan
              </motion.button>
            </motion.div>
          )}

          {status === 'matched' && (
            <motion.div 
              key="matched" 
              initial={{ opacity: 0, scale: 0.85 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="matched-card-success"
              style={{ width: '100%', maxWidth: '520px', marginInline: 'auto' }}
            >
              <GlassCard style={{ padding: isMobile ? '2.5rem' : '4rem', textAlign: 'center', borderRadius: '40px', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
                <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 2.5rem' }}>
                  <div className="avatar-glow"></div>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fff 0%, #777 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: '4px',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#111' }}>
                      {partner?.profile_pic ? (
                        <img src={partner.profile_pic} alt={partner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', fontWeight: 900, color: '#fff' }}>
                          {partner?.name?.charAt(0) || '!'}
                        </div>
                      )}
                    </div>
                  </div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ position: 'absolute', inset: -20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', zIndex: 1 }}
                  />
                </div>
                
                <div style={{ marginBottom: '2.5rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    <ShieldCheck size={12} /> Connection Found
                  </div>
                  <h2 style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>{partner?.name || 'Anonymous'}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: 500, opacity: 0.8 }}>Matched just now via Radar</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button type="button" className="btn-primary" onClick={openChat} style={{ padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, width: '100%' }}>
                    <MessageSquare size={20} style={{ marginRight: '8px' }} /> Say Hello
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setStatus('idle')} style={{ padding: '16px', borderRadius: '20px', fontWeight: 700, width: '100%', border: 'none' }}>
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
          .text-glow { text-shadow: 0 0 20px rgba(255, 255, 255, 0.3); }
          .radar-hud-container { position: relative; width: 320px; height: 320px; display: flex; align-items: center; justify-content: center; }
          .radar-hud-scanner { position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.1); background: conic-gradient(from 0deg, rgba(255, 255, 255, 0.25) 0deg, transparent 120deg); animation: rotate-hud 3.5s linear infinite; z-index: 3; }
          .radar-hud-grid { position: absolute; inset: 20px; border-radius: 50%; background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px); background-size: 20px 20px; opacity: 0.3; pointer-events: none; }
          .radar-hud-rings span { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 1px dashed rgba(255, 255, 255, 0.15); border-radius: 50%; }
          .radar-hud-rings span:nth-child(1) { width: 100px; height: 100px; }
          .radar-hud-rings span:nth-child(2) { width: 200px; height: 200px; }
          .radar-hud-rings span:nth-child(3) { width: 300px; height: 300px; }
          .radar-hud-core { position: relative; z-index: 10; padding: 35px; background: rgba(255, 255, 255, 0.05); border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 0 50px rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); }
          
          .hud-deco { position: absolute; font-family: var(--font-mono); font-size: 0.6rem; color: rgba(255, 255, 255, 0.4); font-weight: 700; letter-spacing: 0.05em; }
          .hud-deco--tl { top: -10px; left: -10px; }
          .hud-deco--tr { top: -10px; right: -10px; }
          .hud-deco--bl { bottom: -10px; left: -10px; }
          .hud-deco--br { bottom: -10px; right: -10px; }
          
          .searching-text { letter-spacing: -0.02em; animation: text-pulse 2s infinite ease-in-out; }
          .avatar-glow { position: absolute; inset: -30px; background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%); z-index: 0; filter: blur(20px); }
          
          @keyframes rotate-hud { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes text-pulse { 0% { opacity: 1; text-shadow: 0 0 0px #fff; } 50% { opacity: 0.7; text-shadow: 0 0 15px rgba(255,255,255,0.3); } 100% { opacity: 1; text-shadow: 0 0 0px #fff; } }
          
          .animate-spin { animation: spin 1.5s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}
      </style>
    </div>
  );
};

export default RadarView;
