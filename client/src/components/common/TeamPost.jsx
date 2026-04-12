import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowRight, MessageSquare } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';

const TeamPost = ({ team }) => {
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const [chatLoading, setChatLoading] = useState(false);

  const handleChat = async () => {
    if (!isSignedIn) {
      navigate('/auth');
      return;
    }

    if (!team.creator_id) {
      toast.error('Chat is unavailable for this post right now.');
      return;
    }

    try {
      setChatLoading(true);
      const token = await getToken();
      const response = await axios.post(
        `/chat/direct/${team.creator_id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { sessionId, partner } = response.data || {};
      if (!sessionId) {
        throw new Error('Missing session id');
      }
      navigate(`/messages/${sessionId}`, { state: { partner } });
    } catch (error) {
      const message = error?.response?.data?.message || 'Could not open chat right now.';
      toast.error(message);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <motion.article 
      className="team-card" 
      whileHover={reduceMotion || isMobile ? undefined : { y: -4, transition: { type: 'spring', stiffness: 400, damping: 30 } }}
      whileTap={reduceMotion || isMobile ? undefined : { scale: 0.992 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      {team.matched_event_image_url && (
        <div className="team-card__event-poster-wrap">
          <img
            className="team-card__event-poster"
            src={team.matched_event_image_url}
            alt={team.matched_event_title || 'Matched event poster'}
            loading="lazy"
          />
        </div>
      )}

      <div className="team-card__top">
        <div style={{ flex: 1 }}>
          <div className="team-card__title" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {team.team_name || team.teamName}
          </div>
        </div>
      </div>


      <div style={{ 
        padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
        marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px', letterSpacing: '0.04em' }}>
          Seeking
        </div>
        <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          {team.looking_for || team.lookingFor || 'Teammates'}
        </div>
      </div>

      <div
        style={{
          marginBottom: '1rem',
          padding: '10px 12px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.04em' }}>
          Posted by
        </div>
        <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 650 }}>
          {team.creator_name || 'Campus Unifyr User'}
        </div>
        {team.creator_email && (
          <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all' }}>
            {team.creator_email}
          </div>
        )}
      </div>

      <div className="team-card__footer">
        <button
          type="button"
          className="btn-primary"
          style={{
            padding: '14px 28px',
            fontSize: '1rem',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #863bff 0%, #6320c9 100%)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(134, 59, 255, 0.25)',
          }}
          onClick={handleChat}
          disabled={chatLoading}
        >
          <MessageSquare size={18} />
          {chatLoading ? 'Opening...' : 'Chat'}
        </button>
        <button
          type="button"
          className="btn-primary"
          style={{ padding: '8px 18px', borderRadius: '12px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => {
            if (!isSignedIn) {
              navigate('/auth');
              return;
            }
            navigate(`/teammates/${team.id}/join`);
          }}
        >
          Join <ArrowRight size={14} />
        </button>
      </div>
    </motion.article>
  );
};

export default TeamPost;
