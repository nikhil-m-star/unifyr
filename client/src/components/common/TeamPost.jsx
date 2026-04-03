import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Users, ExternalLink, ArrowRight } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const TeamPost = ({ team }) => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const isMobile = useIsMobile();

  return (
    <motion.article 
      className="team-card" 
      whileHover={isMobile ? undefined : { y: -3 }} 
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <div className="team-card__top">
        <div style={{ flex: 1 }}>
          <div className="team-card__title" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {team.team_name || team.teamName}
          </div>
          {(team.event_name || team.eventName) && (
            <div className="team-card__event" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ExternalLink size={11} />
              {team.event_name || team.eventName}
            </div>
          )}
        </div>

        <span className="chip" style={{ 
          background: 'rgba(139,92,246,0.06)', 
          color: 'var(--accent-secondary)',
          padding: '4px 10px',
          fontSize: '0.72rem',
          border: '1px solid rgba(139,92,246,0.12)'
        }}>
          Recruiting
        </span>
      </div>

      <p className="team-card__body" style={{ 
        fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem',
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
      }}>
        {team.description}
      </p>

      <div style={{ 
        padding: '10px 14px', background: 'rgba(139,92,246,0.03)', borderRadius: '12px',
        marginBottom: '1.25rem', border: '1px solid rgba(139,92,246,0.06)'
      }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px', letterSpacing: '0.04em' }}>
          Seeking
        </div>
        <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          {team.looking_for || team.lookingFor || 'Teammates'}
        </div>
      </div>

      <div className="team-card__footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          <Users size={13} />
          <span>Active now</span>
        </div>
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
