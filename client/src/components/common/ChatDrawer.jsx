import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, User } from 'lucide-react';

const ChatDrawer = ({ isOpen, onClose, partner }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]); // This would hook into socket.io later
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessages((currentMessages) => [
      ...currentMessages,
      { text: message.trim(), isOwn: true, timestamp: new Date() },
    ]);
    setMessage('');
    // Emit socket event here...
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ 
              position: 'fixed', 
              inset: 0, 
              background: 'rgba(0,0,0,0.6)', 
              zIndex: 90,
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', 
              top: 0, 
              right: 0, 
              bottom: 0, 
              width: '100%', 
              maxWidth: '420px',
              zIndex: 100, 
              background: 'var(--bg-secondary)', 
              borderLeft: '1px solid var(--glass-border)',
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div style={{ 
              padding: '1.25rem 1.5rem', 
              borderBottom: '1px solid var(--glass-border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {partner?.profile_pic ? (
                    <img src={partner.profile_pic} alt={partner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    partner?.name?.charAt(0) || <User size={20} />
                  )}
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: '1.05rem', 
                    fontWeight: 600, 
                    fontFamily: 'var(--font-display)',
                    margin: 0 
                  }}>
                    {partner?.name || 'Partner'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      background: 'var(--accent-cyan)', 
                      borderRadius: '50%',
                      boxShadow: '0 0 4px var(--accent-cyan)'
                    }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Now</span>
                  </div>
                </div>
              </div>
              <button 
                className="btn-ghost"
                onClick={onClose} 
                style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Container */}
            <div 
              ref={scrollRef}
              style={{ 
                flex: 1, 
                padding: '1.5rem', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem',
                scrollbarWidth: 'none',
              }}
            >
              {messages.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: '3rem 1rem', marginTop: '20%' }}>
                   <div style={{ 
                     background: 'rgba(255,255,255,0.03)', 
                     width: '64px', 
                     height: '64px', 
                     borderRadius: '50%', 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center', 
                     margin: '0 auto 1.5rem', 
                     color: 'var(--text-muted)'
                   }}>
                     <Send size={28} />
                   </div>
                   <h4 style={{ 
                     fontFamily: 'var(--font-display)', 
                     fontSize: '1.2rem', 
                     marginBottom: '0.5rem',
                     color: 'var(--text-primary)'
                   }}>
                     Say Hi to {partner?.name?.split(' ')[0] || 'your match'}!
                   </h4>
                   <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                     Matches are serendipitous. Start a meaningful conversation about "{partner?.ready_tag || 'the topic'}".
                   </p>
                 </div>
              ) : (
                messages.map((msg, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    style={{ alignSelf: msg.isOwn ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
                  >
                    <div style={{ 
                      padding: '10px 14px', 
                      borderRadius: '1.15rem', 
                      background: msg.isOwn ? 'linear-gradient(135deg, var(--accent-blue) 0%, #2575fc 100%)' : 'rgba(255,255,255,0.06)',
                      color: msg.isOwn ? 'white' : 'var(--text-primary)',
                      borderBottomRightRadius: msg.isOwn ? '4px' : '1.15rem',
                      borderBottomLeftRadius: msg.isOwn ? '1.15rem' : '4px',
                      fontSize: '0.92rem',
                      lineHeight: 1.5,
                      boxShadow: msg.isOwn ? '0 4px 12px rgba(65, 88, 208, 0.25)' : 'none',
                      border: msg.isOwn ? 'none' : '1px solid var(--glass-border)',
                      fontFamily: 'var(--font-sans)',
                    }}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div style={{ 
              padding: '1.25rem 1.5rem 2rem', 
              borderTop: '1px solid var(--glass-border)',
              background: 'rgba(255,255,255,0.01)',
            }}>
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="glass-input"
                  style={{
                    borderRadius: 'var(--radius-pill)',
                    padding: '12px 20px',
                    fontSize: '0.92rem',
                  }}
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit" 
                  className="btn-primary" 
                  style={{ 
                    width: '46px', 
                    height: '46px', 
                    padding: 0, 
                    minWidth: '46px',
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(65, 88, 208, 0.3)'
                  }}
                >
                  <Send size={18} />
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatDrawer;
