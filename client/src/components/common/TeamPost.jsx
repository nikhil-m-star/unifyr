import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Users, ExternalLink } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const TeamPost = ({ team }) => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const isMobile = useIsMobile();

  return (
    <motion.article 
      className="team-card" 
      whileHover={isMobile ? undefined : { y: -4, scale: 1.01 }} 
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <div className="team-card__top" style={{ marginBottom: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <div className="team-card__title" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {team.team_name || team.teamName}
          </div>
          {(team.event_name || team.eventName) && (
            <div className="team-card__event" style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ExternalLink size={12} />
              {team.event_name || team.eventName}
            </div>
          )}
        </div>

        <span className="chip" style={{ 
          background: 'rgba(0,229,255,0.06)', 
          color: 'var(--accent-cyan)',
          padding: '4px 10px',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          border: '1px solid rgba(0,229,255,0.15)'
        }}>
          Recruiting
        </span>
      </div>

      <p className="team-card__body" style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {team.description}
      </p>

      <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.05em' }}>
          Seeking
        </div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          {team.looking_for || team.lookingFor || 'Teammates'}
        </div>
      </div>

      <div className="team-card__footer" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <Users size={14} />
          <span>Active now</span>
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ padding: '8px 20px', borderRadius: '12px' }}
          onClick={() => {
            if (!isSignedIn) {
              navigate('/auth');
              return;
            }
            navigate(`/teammates/${team.id}/join`);
          }}
        >
          Join Project
        </button>
      </div>
    </motion.article>
  );
};

export default TeamPost;
