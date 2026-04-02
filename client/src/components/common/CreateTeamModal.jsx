import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { X } from 'lucide-react';
import axios from '../../api/axios';
import useIsMobile from '../../hooks/useIsMobile';

const CreateTeamModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState({ eventName: '', teamName: '', description: '', lookingFor: '' });
  const [submitting, setSubmitting] = useState(false);
  const { getToken } = useAuth();
  const isMobile = useIsMobile();

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const token = await getToken();
      await axios.post(
        '/teams',
        {
          eventName: form.eventName.trim(),
          teamName: form.teamName,
          description: form.description,
          lookingFor: form.lookingFor,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setForm({ eventName: '', teamName: '', description: '', lookingFor: '' });
      onCreated?.();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create team.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-backdrop"
            initial={isMobile ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className="modal-wrap">
            <motion.div
              className="modal-card"
              initial={isMobile ? false : { opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              transition={{ duration: isMobile ? 0.18 : 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="modal-head">
                <div>
                  <div className="section-kicker">Find teammates</div>
                  <h3 className="modal-title">Request teammates</h3>
                </div>

                <button type="button" className="modal-close" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="form-stack">
                <div className="field">
                  <label htmlFor="eventName">Event</label>
                  <input
                    id="eventName"
                    name="eventName"
                    className="app-input"
                    value={form.eventName}
                    onChange={handleChange}
                    placeholder="Event name"
                    required
                    minLength={2}
                  />
                </div>

                <div className="field">
                  <label htmlFor="teamName">Team name</label>
                  <input
                    id="teamName"
                    name="teamName"
                    className="app-input"
                    value={form.teamName}
                    onChange={handleChange}
                    placeholder="Team name"
                    required
                    minLength={2}
                  />
                </div>

                <div className="field">
                  <label htmlFor="lookingFor">Looking for</label>
                  <input
                    id="lookingFor"
                    name="lookingFor"
                    className="app-input"
                    value={form.lookingFor}
                    onChange={handleChange}
                    placeholder="Roles needed"
                  />
                </div>

                <div className="field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    className="app-input"
                    rows={4}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="What are you building?"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || !form.eventName.trim() || !form.teamName.trim()}
                >
                  {submitting ? 'Sending...' : 'Request Teammates'}
                </button>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateTeamModal;
