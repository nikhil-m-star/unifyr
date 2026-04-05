import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { X } from 'lucide-react';
import axios from '../../api/axios';
import useIsMobile from '../../hooks/useIsMobile';

const CreateTeamModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState({ eventName: '', teamName: '', description: '', lookingFor: '' });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const { getToken } = useAuth();
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStatus(null);
      setForm({ eventName: '', teamName: '', description: '', lookingFor: '' });
    }
  }, [isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const token = await getToken();
      await axios.post(
        '/teams',
        {
          eventName: form.eventName.trim(),
          teamName: form.teamName.trim(),
          description: form.description.trim(),
          lookingFor: form.lookingFor.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setStatus({ tone: 'success', message: 'Teammate post is live!' });
      setTimeout(() => {
        onCreated?.();
        onClose();
      }, 1500);
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error.response?.data?.message || 'Failed to create teammate post.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div className="modal-backdrop" initial={isMobile ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

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
                  <span className="section-kicker">Recruitment</span>
                  <h3 className="modal-title">Post for Teammates</h3>
                </div>
                <button type="button" className="modal-close" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>

              {status && (
                <div className={`modal-status modal-status--${status.tone}`} style={{ marginBottom: '1.5rem' }}>
                  {status.message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="form-stack">
                <div className="field">
                  <label htmlFor="eventName">Event Name</label>
                  <input id="eventName" name="eventName" className="app-input" value={form.eventName} onChange={handleChange} placeholder="e.g. ETHIndia, Unstop Hackathon" required minLength={2} />
                </div>

                <div className="field">
                  <label htmlFor="teamName">Team Name</label>
                  <input id="teamName" name="teamName" className="app-input" value={form.teamName} onChange={handleChange} placeholder="What's your crew called?" required minLength={2} />
                </div>

                <div className="field">
                  <label htmlFor="lookingFor">Looking For</label>
                  <input id="lookingFor" name="lookingFor" className="app-input" value={form.lookingFor} onChange={handleChange} placeholder="e.g. Frontend Dev, UI/UX Designer" />
                </div>

                <div className="field">
                  <label htmlFor="description">Project Description</label>
                  <textarea id="description" name="description" className="app-input" rows={4} value={form.description} onChange={handleChange} placeholder="Tell us what you're building..." style={{ resize: 'vertical' }} />
                </div>

                <motion.button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || !form.eventName.trim() || !form.teamName.trim()}
                  style={{ width: '100%' }}
                  whileHover={reduceMotion ? undefined : { scale: 1.02, transition: { type: 'spring', stiffness: 480, damping: 24 } }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  {submitting ? 'Broadcasting...' : 'Post for Teammates'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateTeamModal;
