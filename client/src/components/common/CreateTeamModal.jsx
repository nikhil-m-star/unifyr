import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { Check, Trash2, Users, X } from 'lucide-react';
import axios from '../../api/axios';
import useIsMobile from '../../hooks/useIsMobile';

const ManageTeamCard = ({ team, onAction, busyId }) => (
  <div style={{ border: '1px solid var(--glass-border)', borderRadius: '22px', padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
      <div>
        <div className="team-card__title" style={{ marginBottom: '0.2rem' }}>{team.team_name || team.teamName}</div>
        <div className="team-card__event">{team.event_name || team.eventName}</div>
      </div>
      <span className="chip" style={{ background: team.status === 'closed' ? 'rgba(244,114,182,0.12)' : 'rgba(45,212,191,0.12)', color: team.status === 'closed' ? 'var(--accent-rose)' : 'var(--accent-teal)' }}>
        {team.status || 'open'}
      </span>
    </div>

    <p className="team-card__body" style={{ margin: '1rem 0' }}>{team.description || 'No description yet.'}</p>

    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onAction('status', team.id, { status: team.status === 'open' ? 'closed' : 'open' })}
        disabled={busyId === `status-${team.id}`}
      >
        {team.status === 'open' ? 'Close post' : 'Reopen post'}
      </button>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => onAction('delete', team.id)}
        disabled={busyId === `delete-${team.id}`}
      >
        <Trash2 size={16} /> Delete
      </button>
    </div>

    <div>
      <div className="section-kicker" style={{ marginBottom: '0.75rem' }}>Pitches</div>
      {team.requests?.length ? (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {team.requests.map((request) => (
            <div key={request.id} style={{ borderRadius: '18px', padding: '0.9rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{request.sender_name || 'Applicant'}</div>
                  <div className="text-badge">{request.sender_email || request.sender_role || 'Pending pitch'}</div>
                </div>
                <span className="text-badge" style={{ textTransform: 'capitalize' }}>{request.status}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 0' }}>{request.pitch}</p>
              {request.status === 'pending' && (
                <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => onAction('request', request.id, { status: 'accepted' })}
                    disabled={busyId === `request-${request.id}`}
                  >
                    <Check size={16} /> Accept
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onAction('request', request.id, { status: 'rejected' })}
                    disabled={busyId === `request-${request.id}`}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-badge">No pitches yet.</div>
      )}
    </div>
  </div>
);

const CreateTeamModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState({ eventName: '', teamName: '', description: '', lookingFor: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [myTeams, setMyTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const { getToken } = useAuth();
  const isMobile = useIsMobile();

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const loadMyTeams = async () => {
    setLoadingTeams(true);
    try {
      const token = await getToken();
      const response = await axios.get('/teams/mine', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyTeams(response.data);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to load your teammate posts.');
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'manage') {
      loadMyTeams();
    }
  }, [activeTab, isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

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

      setForm({ eventName: '', teamName: '', description: '', lookingFor: '' });
      onCreated?.();
      setActiveTab('manage');
      loadMyTeams();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create teammate post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManageAction = async (type, id, payload = {}) => {
    const key = `${type}-${id}`;
    setBusyId(key);
    try {
      const token = await getToken();
      if (type === 'request') {
        await axios.patch(`/teams/requests/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (type === 'status') {
        await axios.patch(`/teams/${id}/status`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (type === 'delete') {
        await axios.delete(`/teams/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      }
      await loadMyTeams();
      onCreated?.();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update teammate post.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div className="modal-backdrop" initial={isMobile ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

          <div className="modal-wrap">
            <motion.div
              className="modal-card"
              initial={isMobile ? false : { opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              transition={{ duration: isMobile ? 0.18 : 0.26, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: 'min(100%, 720px)' }}
            >
              <div className="modal-head">
                <div>
                  <div className="section-kicker">Teammates</div>
                  <h3 className="modal-title">Create and manage teammate posts</h3>
                </div>
                <button type="button" className="modal-close" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button type="button" className={activeTab === 'create' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('create')}>
                  Create post
                </button>
                <button type="button" className={activeTab === 'manage' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('manage')}>
                  <Users size={16} /> Manage posts
                </button>
              </div>

              {activeTab === 'create' ? (
                <form onSubmit={handleSubmit} className="form-stack">
                  <div className="field">
                    <label htmlFor="eventName">Event</label>
                    <input id="eventName" name="eventName" className="app-input" value={form.eventName} onChange={handleChange} placeholder="Event name" required minLength={2} />
                  </div>

                  <div className="field">
                    <label htmlFor="teamName">Team name</label>
                    <input id="teamName" name="teamName" className="app-input" value={form.teamName} onChange={handleChange} placeholder="Team name" required minLength={2} />
                  </div>

                  <div className="field">
                    <label htmlFor="lookingFor">Looking for</label>
                    <input id="lookingFor" name="lookingFor" className="app-input" value={form.lookingFor} onChange={handleChange} placeholder="Roles needed" />
                  </div>

                  <div className="field">
                    <label htmlFor="description">Description</label>
                    <textarea id="description" name="description" className="app-input" rows={4} value={form.description} onChange={handleChange} placeholder="What are you building?" style={{ resize: 'vertical' }} />
                  </div>

                  <button type="submit" className="btn-primary" disabled={submitting || !form.eventName.trim() || !form.teamName.trim()}>
                    {submitting ? 'Posting...' : 'Post for teammates'}
                  </button>
                </form>
              ) : loadingTeams ? (
                <div className="text-badge">Loading your teammate posts...</div>
              ) : myTeams.length ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {myTeams.map((team) => (
                    <ManageTeamCard key={team.id} team={team} onAction={handleManageAction} busyId={busyId} />
                  ))}
                </div>
              ) : (
                <div className="text-badge">You have not posted for teammates yet.</div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateTeamModal;
