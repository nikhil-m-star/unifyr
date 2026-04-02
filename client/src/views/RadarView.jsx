import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';
import GlassCard from '../components/common/GlassCard';
import ChatDrawer from '../components/common/ChatDrawer';
import { Search, X, CheckCircle, MessageSquare } from 'lucide-react';
import { API_ORIGIN } from '../api/axios';

const RadarView = () => {
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('idle'); // idle | waiting | matched
  const [partner, setPartner] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const socketRef = useRef(null);
  const { getToken } = useAuth();

  useEffect(() => {
    if (status !== 'waiting') {
      return undefined;
    }

    let isMounted = true;

    const connectSocket = async () => {
      try {
        const token = await getToken();

        if (!isMounted || !token) {
          setStatus('idle');
          return;
        }

        const newSocket = io(API_ORIGIN, {
          auth: { token },
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
          console.log('Connected to matchmaking server');
          newSocket.emit('join_queue', { topicKeywords: topic.trim() });
        });

        newSocket.on('queue_joined', () => {
          setStatus('waiting');
        });

        newSocket.on('match_success', ({ partner: matchedPartner }) => {
          setPartner(matchedPartner);
          setStatus('matched');
        });

        newSocket.on('connect_error', (error) => {
          console.error('Failed to connect to matchmaking server:', error);
          setStatus('idle');
          socketRef.current = null;
        });
      } catch (error) {
        console.error('Failed to start matchmaking:', error);
        setStatus('idle');
      }
    };

    connectSocket();

    return () => {
      isMounted = false;

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [getToken, status, topic]);

  const handleJoinQueue = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setStatus('waiting');
  };

  const handleLeaveQueue = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave_queue');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsChatOpen(false);
    setStatus('idle');
    setPartner(null);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      minHeight: '75vh', 
      justifyContent: 'center',
      padding: '1rem' 
    }}>
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', maxWidth: '480px' }}
          >
            <GlassCard style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ 
                background: 'rgba(0,229,255,0.08)', 
                width: '72px', 
                height: '72px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1.5rem', 
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(0,229,255,0.2)'
              }}>
                <Search size={32} />
              </div>
              <h2 style={{ 
                fontSize: '1.8rem', 
                marginBottom: '0.75rem',
                fontFamily: 'var(--font-display)'
              }}>
                Find a <span className="gradient-text">Connection</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
                Type a topic to find someone to chat with right now.
              </p>
              
              <form onSubmit={handleJoinQueue} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <input
                  type="text"
                  placeholder="e.g. Hackathons, Gaming, Philosophy..."
                  className="glass-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  style={{ textAlign: 'center', fontSize: '1rem' }}
                  required
                />
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px' }}>
                  Start Radar
                </button>
              </form>
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
            {/* Visual Radar Sonar */}
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
              <div style={{ 
                position: 'absolute', 
                inset: '30%', 
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 10, 
                boxShadow: '0 0 40px rgba(0,229,255,0.4)',
                border: '2px solid rgba(255,255,255,0.2)'
              }}>
                <Search size={32} color="white" />
              </div>
            </div>
            
            <h3 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Scanning Network...</h3>
            <p style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginTop: '0.5rem', fontSize: '1rem' }}>
              Topic: {topic}
            </p>
            
            <button 
              className="btn-ghost"
              onClick={handleLeaveQueue} 
              style={{ marginTop: '2.5rem' }}
            >
              <X size={16} /> Cancel Search
            </button>
          </motion.div>
        )}

        {status === 'matched' && partner && (
           <motion.div
            key="matched"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ width: '100%', maxWidth: '440px' }}
           >
             <GlassCard style={{ padding: '2.5rem 2rem', textAlign: 'center', border: '1px solid rgba(200, 80, 192, 0.3)' }}>
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                 style={{ color: 'var(--accent-green)', marginBottom: '1.25rem' }}
               >
                 <CheckCircle size={56} style={{ margin: '0 auto' }} />
               </motion.div>
               
               <h2 style={{ fontSize: '2.2rem', marginBottom: '0.25rem', fontFamily: 'var(--font-display)' }}>
                 Matched!
               </h2>
               <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                 You found a connection for "{topic}"
               </p>
               
               <div style={{ 
                 background: 'rgba(255,255,255,0.03)', 
                 padding: '1.75rem', 
                 borderRadius: 'var(--radius-xl)', 
                 marginBottom: '2rem',
                 border: '1px solid var(--glass-border)'
               }}>
                 <div style={{ 
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
                   border: '2px solid var(--glass-border)'
                 }}>
                   {partner.profile_pic ? (
                     <img src={partner.profile_pic} alt={partner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   ) : (
                     partner.name?.charAt(0).toUpperCase()
                   )}
                 </div>
                 <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                   {partner.name}
                 </h3>
                 <p className="chip" style={{ 
                    marginTop: '0.5rem', 
                    background: 'rgba(255, 204, 112, 0.1)', 
                    color: 'var(--accent-orange)',
                    border: '1px solid rgba(255, 204, 112, 0.2)'
                 }}>
                   {partner.role || 'Student'}
                 </p>
                 {partner.bio && (
                   <p style={{ 
                     marginTop: '1rem', 
                     fontSize: '0.9rem', 
                     color: 'var(--text-secondary)',
                     lineHeight: 1.5
                   }}>
                     {partner.bio}
                   </p>
                 )}
               </div>

               <button 
                 className="btn-primary" 
                 onClick={() => setIsChatOpen(true)}
                 style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
               >
                 <MessageSquare size={18} /> Open Chat
               </button>
             </GlassCard>
           </motion.div>
        )}
      </AnimatePresence>
      <ChatDrawer 
        key={partner?.id || 'no-partner'}
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        partner={partner} 
      />
    </div>
  );
};

export default RadarView;
