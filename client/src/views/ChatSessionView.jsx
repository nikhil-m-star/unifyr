import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';
import axios from '../api/axios';
import useIsMobile from '../hooks/useIsMobile';
import { useNotifications } from '../context/NotificationContext';

const mapMessage = (entry, myUserId) => {
  const senderId = entry.sender_id || entry.senderId;
  const isOwn = Number(senderId) === Number(myUserId);
  return {
    id: entry.id,
    text: entry.content || entry.text,
    senderId,
    senderName: entry.sender_name || entry.senderName,
    timestamp: entry.created_at || entry.timestamp,
    isOwn,
    isRead: entry.is_read || entry.isRead,
    status: 'sent',
  };
};

const ChatSessionView = ({ socket }) => {
  const { sessionId: sessionIdParam } = useParams();
  const sessionId = Number(sessionIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken, user: clerkUser } = useAuth();
  const isMobile = useIsMobile();
  const { markNotificationRead, notifications } = useNotifications();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [partner, setPartner] = useState(location.state?.partner || null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isPartnerSeen, setIsPartnerSeen] = useState(false);
  const [roomJoined, setRoomJoined] = useState(false);
  const [sendError, setSendError] = useState(null);
  
  // Keep ref in sync for socket handlers
  useEffect(() => {
    myUserIdRef.current = myUserId;
  }, [myUserId]);
  
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const myUserIdRef = useRef(null);

  // Diagnostic Logs
  useEffect(() => {
    console.log('[Chat] Mounting session:', sessionId);
    console.log('[Chat] Socket connected:', socket?.connected);
    
    const onConnect = () => console.log('[Chat] Socket reconnected.');
    const onDisconnect = () => console.log('[Chat] Socket disconnected.');
    
    socket?.on('connect', onConnect);
    socket?.on('disconnect', onDisconnect);
    
    // Auto-rejoin on connect
    if (socket?.connected && sessionId) {
      console.log('[Chat] Socket already connected, joining room...');
      socket.emit('chat:join', { sessionId });
    }

    return () => {
      socket?.off('connect', onConnect);
      socket?.off('disconnect', onDisconnect);
    };
  }, [socket, sessionId]);

  // Clear relevant notifications on mount
  useEffect(() => {
    if (!sessionId) return;
    notifications.forEach(n => {
      if (n.type === 'new_message' && Number(n.sessionId) === sessionId && !n.read) {
        markNotificationRead(n.id);
      }
    });
  }, [sessionId, notifications, markNotificationRead]);

  // Scroll to bottom helper
  const scrollToBottom = (behavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [loading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Ensure socket joins the room
  useEffect(() => {
    if (socket && sessionId) {
      setRoomJoined(false);
      
      const joinRoom = () => {
        console.log('[Chat] Requesting room join:', sessionId);
        socket.emit('chat:join', { sessionId });
      };
      
      joinRoom();
      
      // Retry join slightly later to catch identity sync completion
      const t1 = setTimeout(joinRoom, 500);
      const t2 = setTimeout(joinRoom, 2000);
      
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [socket, sessionId, myUserId]);

  // Listen for room join confirmation and error events
  useEffect(() => {
    if (!socket) return undefined;

    const handleRoomJoined = (data) => {
      if (Number(data.sessionId) === sessionId) {
        console.log('[Chat] Room join confirmed for session:', sessionId);
        setRoomJoined(true);
      }
    };

    const handleSendError = (data) => {
      console.warn('[Chat] Send error:', data.error);
      setSendError(data.error);
      // Remove optimistic message with matching text
      if (data.messageText) {
        setMessages(prev => prev.filter(m => !(m.status === 'pending' && m.text === data.messageText)));
      }
      // Auto-clear error after 5 seconds
      setTimeout(() => setSendError(null), 5000);
    };

    const handleOfflineNotification = (notification) => {
      // Offline messages delivered on reconnect
      if (notification.isOfflineMessage && Number(notification.sessionId) === sessionId) {
        console.log('[Chat] Offline notification received from reconnect:', notification.title);
      }
    };

    const handleIncomingMessage = (newMessage) => {
      console.log('[Chat] Incoming message from socket:', newMessage);
      const msgSessionId = Number(newMessage.sessionId || newMessage.session_id);
      
      if (msgSessionId === sessionId) {
        setMessages((prev) => {
          const mapped = mapMessage(newMessage, myUserIdRef.current);
          
          // 1. Check if we already have this real ID
          if (prev.some(m => m.id === mapped.id)) {
            return prev;
          }

          // 2. If it's our own message, find and replace the pending one
          if (mapped.isOwn) {
            const pendingIndex = prev.findIndex(m => m.status === 'pending' && m.text === mapped.text);
            if (pendingIndex !== -1) {
              const next = [...prev];
              next[pendingIndex] = mapped;
              return next;
            }
          }
          
          // 3. Otherwise append
          return [...prev, mapped];
        });
      }
    };

    socket.on('chat:message', handleIncomingMessage);
    socket.on('chat:room-joined', handleRoomJoined);
    socket.on('chat:error', handleSendError);
    socket.on('notification:message', handleOfflineNotification);

    return () => {
      socket.off('chat:message', handleIncomingMessage);
      socket.off('chat:room-joined', handleRoomJoined);
      socket.off('chat:error', handleSendError);
      socket.off('notification:message', handleOfflineNotification);
    };
  }, [socket, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;

    const load = async () => {
      try {
        const token = await getToken();

        const [meRes, sessionsRes, chatRes, offlineRes] = await Promise.all([
          axios.get('/users/me', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/chat', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`/chat/${sessionId}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/chat/pending/offline', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { messages: [] } })),
        ]);

        if (!mounted) return;

        const meId = meRes.data?.user?.id || meRes.data?.id;
        console.log('[Chat] Identity resolved:', meId);
        setMyUserId(meId);

        const sessionsList = Array.isArray(sessionsRes.data?.sessions) ? sessionsRes.data.sessions : [];
        const matchingSession = sessionsList.find((session) => Number(session.id) === sessionId);
        
        if (matchingSession) {
          setPartner({
            id: matchingSession.partner_id,
            name: matchingSession.partner_name,
            profile_pic: matchingSession.partner_profile_pic,
            role: matchingSession.partner_role,
          });
        }

        const history = (chatRes.data?.messages || []).map((entry) => mapMessage(entry, meId));
        setMessages(history);
        
        // Show offline notifications as alerts
        const offlineMessages = (offlineRes.data?.messages || []).filter(msg => Number(msg.session_id) === sessionId);
        offlineMessages.forEach(msg => {
          console.log('[Chat] Offline notification received:', msg.sender_name);
        });
        
        if (history.length > 0) {
          const lastOwnIdx = [...history].reverse().findIndex(m => m.isOwn);
          if (lastOwnIdx !== -1) {
            const lastOwn = [...history].reverse()[lastOwnIdx];
            if (lastOwn?.isRead) setIsPartnerSeen(true);
          }
        }

        socket?.emit('chat:seen', { sessionId });
      } catch (error) {
        console.error('[Chat] Load failure:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [getToken, sessionId]);

  useEffect(() => {
    if (!socket || !sessionId || !myUserId) return undefined;

    const handleTyping = (data) => {
      if (Number(data.sessionId) === sessionId && Number(data.userId) !== myUserId) {
        setIsPartnerTyping(data.isTyping);
      }
    };

    const handleSeen = (data) => {
      if (Number(data.sessionId) === sessionId && Number(data.userId) !== myUserId) {
        setIsPartnerSeen(true);
        setMessages(current => current.map(m => m.isOwn ? { ...m, isRead: true } : m));
      }
    };

    socket.on('chat:typing', handleTyping);
    socket.on('chat:seen', handleSeen);

    return () => {
      socket.off('chat:typing', handleTyping);
      socket.off('chat:seen', handleSeen);
    };
  }, [socket, sessionId, myUserId]);

  const handleSend = (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !socket || !sessionId || !roomJoined) {
      if (!roomJoined) {
        console.warn('[Chat] Cannot send: room not joined yet');
      }
      return;
    }

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      text: trimmedMessage,
      senderId: myUserId,
      senderName: clerkUser?.fullName || 'Me',
      timestamp: new Date().toISOString(),
      isOwn: true,
      status: 'pending'
    };

    console.log('[Chat] Sending message:', trimmedMessage);
    setSendError(null);
    setMessages(prev => [...prev, optimisticMsg]);
    setIsPartnerSeen(false);
    socket.emit('chat:send', { sessionId, content: trimmedMessage });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit('chat:typing', { sessionId, isTyping: false });
    }
    
    setMessage('');
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessage(val);

    if (!socket || !sessionId) return;

    const now = Date.now();
    if (now - lastTypingEmitRef.current > 2000) {
      socket.emit('chat:typing', { sessionId, isTyping: true });
      lastTypingEmitRef.current = now;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', { sessionId, isTyping: false });
      lastTypingEmitRef.current = 0;
    }, 3000);
  };

  const handleDeleteMessage = async (messageId) => {
    if (typeof messageId === 'string' && messageId.startsWith('temp-')) return;
    
    const shouldDelete = window.confirm('Delete this message?');
    if (!shouldDelete) return;

    try {
      setDeletingMessageId(messageId);
      const token = await getToken();
      await axios.delete(`/chat/${sessionId}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((currentMessages) => currentMessages.filter((entry) => entry.id !== messageId));
    } catch (error) {
      console.error('[Chat] Delete failure:', error);
      alert('Unable to delete the message right now.');
    } finally {
      setDeletingMessageId(null);
    }
  };

  return (
    <div className="market-shell" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div className="chat-page" style={{ flex: 1, height: '100%', borderRadius: isMobile ? '0' : '24px' }}>
        <div className="chat-page__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={() => navigate('/messages')} className="btn-ghost" style={{ width: '38px', height: '38px', padding: 0, borderRadius: '12px', minWidth: '38px' }}>
              <ArrowLeft size={20} />
            </button>
            <div className="chat-page__avatar">
              {partner?.profile_pic ? (
                <img src={partner.profile_pic} alt={partner?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#0a0a0a', fontWeight: 800 }}>{partner?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="chat-page__name" style={{ fontSize: '1rem' }}>{partner?.name || 'Loading...'}</h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{partner?.role || 'Online'}</span>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="chat-page__messages hide-scrollbar" style={{ padding: '1.5rem', gap: '0.6rem' }}>
          {loading ? (
            <div className="messages-loading" style={{ height: '100%' }}>
              <div className="loader-ring" />
              <p>Fetching conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="messages-empty" style={{ padding: '4rem 1rem' }}>
              <h2 style={{ fontSize: '1.4rem' }}>No messages yet</h2>
              <p>Start chatting with {partner?.name?.split(' ')[0] || 'your connection'}!</p>
            </div>
          ) : (
            <>
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                    style={{ 
                      alignSelf: msg.isOwn ? 'flex-end' : 'flex-start',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.isOwn ? 'flex-end' : 'flex-start',
                      maxWidth: '85%'
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        padding: '11px 16px',
                        borderRadius: msg.isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: msg.isOwn
                          ? '#ffffff'
                          : 'rgba(255, 255, 255, 0.08)',
                        color: msg.isOwn ? '#000000' : '#ffffff',
                        border: msg.isOwn ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: msg.isOwn ? '0 4px 15px rgba(0, 0, 0, 0.2)' : 'none',
                        fontSize: '0.94rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        fontWeight: 500
                      }}
                    >
                      {msg.text}

                      {msg.isOwn && !msg.id.toString().startsWith('temp-') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          disabled={deletingMessageId === msg.id}
                          className="msg-delete-hover"
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#ff4444',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--bg-page)',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isPartnerSeen && messages.length > 0 && messages[messages.length - 1].isOwn && (
                <div style={{ alignSelf: 'flex-end', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '-2px', marginRight: '4px' }}>
                  Seen
                </div>
              )}

              {isPartnerTyping && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                  {partner?.name?.split(' ')[0]} is typing...
                </motion.div>
              )}
            </>
          )}
        </div>

        <div className="chat-page__composer" style={{ padding: '1.25rem' }}>
          {sendError && (
            <div style={{
              padding: '10px 14px',
              marginBottom: '12px',
              borderRadius: '12px',
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid rgba(255, 68, 68, 0.3)',
              color: '#ff4444',
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              {sendError}
            </div>
          )}
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="glass-input"
              style={{ flex: 1, borderRadius: '18px', padding: '14px 20px', fontSize: '0.95rem' }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={!message.trim() || !roomJoined}
              style={{
                width: '50px',
                height: '50px',
                padding: 0,
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                opacity: !roomJoined ? 0.5 : 1,
                transition: 'opacity 0.2s'
              }}
              title={!roomJoined ? 'Joining chat room...' : 'Send message'}
            >
              <Send size={22} />
            </button>
          </form>
        </div>
      </div>
      <style>
        {`
          .chat-page__messages:hover .msg-delete-hover { opacity: 1 !important; }
          .typing-indicator { display: flex; gap: 3px; }
          .typing-indicator span { width: 5px; height: 5px; background: currentColor; border-radius: 50%; display: inline-block; animation: typing-bounce 1.4s infinite ease-in-out both; }
          .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
          .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
          @keyframes typing-bounce { 
            0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
            40% { transform: scale(1); opacity: 0.8; }
          }
        `}
      </style>
    </div>
  );
};

export default ChatSessionView;
