import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { Check, Trash2, Users, X } from 'lucide-react';
import axios from '../../api/axios';
import useIsMobile from '../../hooks/useIsMobile';

const ManageTeamCard = ({ team, onAction, busyId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    teamName: team.team_name || team.teamName || '',
    description: team.description || '',
    lookingFor: team.looking_for || team.lookingFor || '',
  });

  const handleEditChange = (event) => {
    setEditForm({ ...editForm, [event.target.name]: event.target.value });
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    await onAction('update', team.id, editForm);
    setIsEditing(false);
  };

  return (
    <div style={{ border: '1px solid var(--glass-border)', borderRadius: '22px', padding: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
      {isEditing ? (
        <form onSubmit={handleUpdate} className="form-stack">
          <div className="section-kicker" style={{ marginBottom: '1rem' }}>Edit teammate post</div>
          <div className="field">
            <label htmlFor={`edit-teamName-${team.id}`}>Team name</label>
            <input
              id={`edit-teamName-${team.id}`}
              name="teamName"
              className="app-input"
              value={editForm.teamName}
              onChange={handleEditChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor={`edit-lookingFor-${team.id}`}>Looking for</label>
            <input
              id={`edit-lookingFor-${team.id}`}
              name="lookingFor"
              className="app-input"
              value={editForm.lookingFor}
              onChange={handleEditChange}
            />
          </div>
          <div className="field">
            <label htmlFor={`edit-description-${team.id}`}>Description</label>
            <textarea
              id={`edit-description-${team.id}`}
              name="description"
              className="app-input"
              rows={3}
              value={editForm.description}
              onChange={handleEditChange}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn-primary" disabled={busyId === `update-${team.id}`}>
              {busyId === `update-${team.id}` ? 'Saving...' : 'Save changes'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
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
          
          {team.looking_for && (
             <div className="team-card__tags" style={{ marginBottom: '1rem' }}>
               <span className="chip" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>
                 Looking for: {team.looking_for}
               </span>
             </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
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
              className="btn-secondary"
              onClick={() => setIsEditing(true)}
              disabled={busyId?.includes(team.id)}
            >
              Edit details
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => onAction('delete', team.id)}
              disabled={busyId === `delete-${team.id}`}
              style={{ color: 'var(--accent-rose)', marginLeft: 'auto' }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
            <div className="section-kicker" style={{ marginBottom: '1rem' }}>Pitches ({team.requests?.length || 0})</div>
            {team.requests?.length ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {team.requests.map((request) => (
                  <div key={request.id} style={{ borderRadius: '18px', padding: '1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                          {request.sender_name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{request.sender_name || 'Applicant'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{request.sender_role || 'Student'}</div>
                        </div>
                      </div>
                      <span className={`chip status-${request.status}`} style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {request.status}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>{request.pitch}</p>
                    {request.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          onClick={() => onAction('request', request.id, { status: 'accepted' })}
                          disabled={busyId === `request-${request.id}`}
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
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
              <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px dashed var(--glass-border)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pitches yet. Shares your post to get discovered!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const CreateTeamModal = ({ isOpen, onClose, onCreated, initialTab = 'create' }) => {
  const [form, setForm] = useState({ eventName: '', teamName: '', description: '', lookingFor: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [myTeams, setMyTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState(null);
  const { getToken } = useAuth();
  const isMobile = useIsMobile();

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

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

  const loadMyTeams = async () => {
    setLoadingTeams(true);
    try {
      const token = await getToken();
      const response = await axios.get('/teams/mine', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyTeams(response.data);
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error.response?.data?.message || 'Failed to load your teammate posts.',
      });
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'manage') {
      loadMyTeams();
    }
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStatus(null);
      setActiveTab('create');
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

      setForm({ eventName: '', teamName: '', description: '', lookingFor: '' });
      setActiveTab('manage');
      setStatus({ tone: 'success', message: 'Teammate post is live. You can manage pitches below.' });
      await loadMyTeams();
      onCreated?.();
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error.response?.data?.message || 'Failed to create teammate post.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleManageAction = async (type, id, payload = {}) => {
    const key = `${type}-${id}`;
    setBusyId(key);
    setStatus(null);
    try {
      const token = await getToken();
      if (type === 'request') {
        await axios.patch(`/teams/requests/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (type === 'status') {
        await axios.patch(`/teams/${id}/status`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (type === 'update') {
        await axios.put(`/teams/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (type === 'delete') {
        await axios.delete(`/teams/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      }
      await loadMyTeams();
      setStatus({
        tone: 'success',
        message: type === 'request' ? 'Pitch updated.' : type === 'delete' ? 'Teammate post deleted.' : 'Teammate post updated.',
      });
      onCreated?.();
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error.response?.data?.message || 'Failed to update teammate post.',
      });
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
              className="modal-card modal-shell modal-shell--wide"
              initial={isMobile ? false : { opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              transition={{ duration: isMobile ? 0.18 : 0.26, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
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

              {status && (
                <div className={`modal-status modal-status--${status.tone}`} style={{ marginBottom: '1rem' }}>
                  {status.message}
                </div>
              )}

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
