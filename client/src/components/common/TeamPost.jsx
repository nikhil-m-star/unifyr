import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { CheckCircle, Users, X } from 'lucide-react';
import axios from '../../api/axios';
import useIsMobile from '../../hooks/useIsMobile';

const TeamPost = ({ team }) => {
  const [showModal, setShowModal] = useState(false);
  const [pitch, setPitch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const { isSignedIn, getToken } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!showModal) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showModal]);

  const handlePitch = async (event) => {
    event.preventDefault();
    const nextPitch = pitch.trim();
    if (nextPitch.length < 10) {
      setFeedback({ tone: 'error', message: 'Write a short intro with at least 10 characters.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const token = await getToken();
      await axios.post(
        `/teams/${team.id}/requests`,
        { pitch: nextPitch },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setSent(true);
      setFeedback({ tone: 'success', message: 'Pitch sent. The team owner can review it from Manage posts.' });
      setTimeout(() => {
        setShowModal(false);
        setSent(false);
        setPitch('');
        setFeedback(null);
      }, 1500);
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error.response?.data?.message || 'Failed to send pitch.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <motion.article className="team-card" whileHover={isMobile ? undefined : { y: -4 }} transition={{ duration: isMobile ? 0.16 : 0.25 }}>
        <div className="team-card__top">
          <div>
            <div className="team-card__title">{team.team_name || team.teamName}</div>
            {(team.event_name || team.eventName) && (
              <div className="team-card__event">{team.event_name || team.eventName}</div>
            )}
            <div className="team-card__need">
              Looking for <strong>{team.looking_for || team.lookingFor || 'builders'}</strong>
            </div>
          </div>

          <span className="card-pill card-pill--warm">
            <Users size={12} />
            Open
          </span>
        </div>

        <p className="team-card__body">{team.description}</p>

        <div className="team-card__footer">
          <span className="text-badge">Open now</span>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!isSignedIn) {
                alert('Please sign in first.');
                return;
              }

              setShowModal(true);
              setFeedback(null);
              setPitch('');
              setSent(false);
            }}
          >
            Join
          </button>
        </div>
      </motion.article>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              className="modal-backdrop"
              initial={isMobile ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
            />

            <div className="modal-wrap">
              <motion.div
                className="modal-card modal-shell"
                initial={isMobile ? false : { opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.96 }}
                transition={{ duration: isMobile ? 0.18 : 0.26, ease: [0.16, 1, 0.3, 1] }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-head">
                  <div>
                    <div className="section-kicker">Join request</div>
                    <h3 className="modal-title">{team.team_name || team.teamName}</h3>
                  </div>

                  <button type="button" className="modal-close" onClick={() => setShowModal(false)}>
                    <X size={18} />
                  </button>
                </div>

                {sent ? (
                  <div style={{ padding: '28px 0', textAlign: 'center' }}>
                    <CheckCircle size={48} style={{ color: 'var(--accent-green)', margin: '0 auto 14px' }} />
                    <h3 style={{ marginBottom: '8px' }}>Pitch sent</h3>
                  </div>
                ) : (
                  <>
                    <form onSubmit={handlePitch} className="form-stack">
                      <div className="field">
                        <label htmlFor={`pitch-${team.id}`}>Your pitch</label>
                        <textarea
                          id={`pitch-${team.id}`}
                          className="app-input"
                          rows={5}
                          required
                          minLength={10}
                          value={pitch}
                          onChange={(event) => setPitch(event.target.value)}
                          placeholder="Tell them why you're a fit"
                          style={{ resize: 'vertical' }}
                        />
                      </div>

                      {feedback && (
                        <div className={`modal-status modal-status--${feedback.tone}`}>
                          {feedback.message}
                        </div>
                      )}

                      <button type="submit" className="btn-primary" disabled={submitting || pitch.length < 10}>
                        {submitting ? 'Sending...' : 'Send Pitch'}
                      </button>
                    </form>
                  </>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default TeamPost;
