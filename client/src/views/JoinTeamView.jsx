import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, ArrowLeft, Loader2, Users, Calendar } from 'lucide-react';
import axios from '../api/axios';
import GlassCard from '../components/common/GlassCard';
import useIsMobile from '../hooks/useIsMobile';

const JoinTeamView = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();
  const isMobile = useIsMobile();
  
  const [team, setTeam] = useState(null);
  const [pitch, setPitch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await axios.get(`/teams`);
        const found = response.data.find(t => t.id === parseInt(teamId, 10));
        if (found) {
          setTeam(found);
        } else {
          setStatus({ tone: 'error', message: 'Teammate post not found.' });
        }
      } catch (error) {
        setStatus({ tone: 'error', message: 'Failed to synchronize with team details.' });
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [teamId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pitch.trim().length < 10) {
      setStatus({ tone: 'error', message: 'Please provide a more detailed pitch (min 10 characters).' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const token = await getToken();
      await axios.post(
        `/teams/${teamId}/requests`,
        { pitch: pitch.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSent(true);
      setTimeout(() => navigate('/teammates'), 2500);
    } catch (error) {
      setStatus({ 
        tone: 'error', 
        message: error.response?.data?.message || 'Submission failed. Please check your connection.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" />
        <p style={{ color: 'var(--text-secondary)' }}>Preparing your pitch board...</p>
      </div>
    );
  }

  if (!team && status?.tone === 'error') {
    return (
      <div className="market-shell" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
        <AlertCircle size={48} color="var(--accent-rose)" style={{ marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Post Expired</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{status.message}</p>
        <Link to="/teammates" className="btn-primary">View Other Teams</Link>
      </div>
    );
  }

  return (
    <div className="market-shell">
      <Link to="/teammates" className="nav-back" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '2rem', textDecoration: 'none', width: 'fit-content' }}>
        <ArrowLeft size={18} />
        Back to listings
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: '3rem', alignItems: 'start' }}>
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <span className="section-kicker">Join Request</span>
          <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Pitch to {team.team_name || team.teamName}</h1>
          
          <GlassCard style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
               <Calendar size={16} color="var(--accent-cyan)" />
               <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                 {team.event_name || team.eventName}
               </span>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              {team.description}
            </p>

            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '18px', border: '1px solid var(--glass-border)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                 <Users size={16} color="var(--accent-blue)" />
                 <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Currently Looking For</span>
               </div>
               <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{team.looking_for || 'Passionate builders'}</p>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ 
                  textAlign: 'center', 
                  padding: '4rem 2rem', 
                  background: 'rgba(16, 185, 129, 0.05)', 
                  borderRadius: '32px', 
                  border: '1px solid rgba(16, 185, 129, 0.2)' 
                }}
              >
                <CheckCircle size={64} color="var(--accent-green)" style={{ marginBottom: '1.5rem' }} />
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Pitch Delivered!</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                  The team owner has been notified. Redirecting you back...
                </p>
              </motion.div>
            ) : (
              <form key="form" onSubmit={handleSubmit} className="form-stack">
                <GlassCard style={{ padding: '2.5rem' }}>
                  <div className="field">
                    <label htmlFor="pitch-input" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'block' }}>
                      Why are you a good fit?
                    </label>
                    <textarea
                      id="pitch-input"
                      className="glass-input"
                      style={{ minHeight: '240px', padding: '1.5rem', lineHeight: '1.6', fontSize: '1rem' }}
                      value={pitch}
                      onChange={(e) => setPitch(e.target.value)}
                      placeholder="Start with your skills, your interest in the project, and what you're excited to contribute..."
                      required
                      minLength={10}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                       <span style={{ fontSize: '0.75rem', color: pitch.length < 10 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                         {pitch.length} / 1000 characters
                       </span>
                    </div>
                  </div>

                  {status && (
                    <div className={`modal-status modal-status--${status.tone}`} style={{ marginBottom: '1.5rem' }}>
                      {status.message}
                    </div>
                  )}

                  {!isSignedIn ? (
                    <div className="modal-status modal-status--error">
                      Please sign in to send join requests.
                    </div>
                  ) : (
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={submitting || pitch.length < 10}
                      style={{ height: '56px', fontSize: '1.1rem', width: '100%' }}
                    >
                      {submitting ? 'Sending Request...' : 'Send My Pitch'}
                    </button>
                  )}
                </GlassCard>
              </form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinTeamView;
