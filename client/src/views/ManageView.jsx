import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, Edit, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import axios from '../api/axios';
import GlassCard from '../components/common/GlassCard';
import { useChat } from '../context/ChatContext';
import useIsMobile from '../hooks/useIsMobile';

const ChatButton = ({ sessionId, partner }) => {
  const { openChat } = useChat();
  return (
    <button
      type="button"
      className="btn-primary manage-chat-btn"
      onClick={() => openChat(sessionId, partner)}
    >
      <MessageSquare size={14} /> Message Teammate
    </button>
  );
};

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
    <GlassCard className="manage-card">
      {isEditing ? (
        <form onSubmit={handleUpdate} className="form-stack">
          <div className="section-kicker" style={{ marginBottom: '0.5rem' }}>Edit teammate post</div>
          <div className="field">
            <label htmlFor={`edit-teamName-${team.id}`}>Team Name</label>
            <input id={`edit-teamName-${team.id}`} name="teamName" className="glass-input" value={editForm.teamName} onChange={handleEditChange} required />
          </div>
          <div className="field">
            <label htmlFor={`edit-lookingFor-${team.id}`}>Looking for</label>
            <input id={`edit-lookingFor-${team.id}`} name="lookingFor" className="glass-input" value={editForm.lookingFor} onChange={handleEditChange} />
          </div>
          <div className="field">
            <label htmlFor={`edit-description-${team.id}`}>Description</label>
            <textarea id={`edit-description-${team.id}`} name="description" className="glass-input" rows={3} value={editForm.description} onChange={handleEditChange} />
          </div>
          <div className="manage-card__actions">
            <button type="submit" className="btn-primary" disabled={busyId?.includes(team.id)}>
              {busyId?.includes(team.id) ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <div className="manage-card__header">
            <div>
              <h3 className="manage-card__title">{team.team_name || team.teamName}</h3>
              <p className="manage-card__event">Event: {team.event_name || team.eventName}</p>
            </div>
            <span className="chip" style={{ 
              background: team.status === 'closed' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)', 
              color: team.status === 'closed' ? 'var(--text-muted)' : 'var(--text-primary)',
              border: `1px solid ${team.status === 'closed' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.14)'}`
            }}>
              {team.status || 'open'}
            </span>
          </div>

          <p className="manage-card__desc">{team.description || 'No description provided.'}</p>

          {team.looking_for && (
            <div className="manage-card__seeking">
              <span className="manage-card__seeking-label">Looking for</span>
              <span className="chip" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {team.looking_for}
              </span>
            </div>
          )}

          <div className="manage-card__controls">
            <button type="button" className="btn-secondary" onClick={() => onAction('status', team.id, { status: team.status === 'open' ? 'closed' : 'open' })} disabled={busyId === `status-${team.id}`}>
              {team.status === 'open' ? 'Close' : 'Reopen'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setIsEditing(true)} disabled={busyId?.includes(team.id)}>
              <Edit size={14} /> Edit
            </button>
            <button type="button" className="btn-ghost" onClick={() => onAction('delete', team.id)} disabled={busyId === `delete-${team.id}`} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
              <Trash2 size={16} />
            </button>
          </div>

          <div className="manage-card__pitches">
            <div className="manage-card__pitches-header">
              <h4>Incoming Pitches ({team.requests?.length || 0})</h4>
            </div>

            {team.requests?.length ? (
              <div className="manage-card__pitches-list">
                {team.requests.map((request) => (
                  <div key={request.id} className="pitch-card">
                    <div className="pitch-card__top">
                      <div className="pitch-card__user">
                        <div className="pitch-card__avatar">
                          {request.sender_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="pitch-card__name">{request.sender_name || 'Applicant'}</div>
                          <div className="pitch-card__role">{request.sender_role || 'Developer'}</div>
                        </div>
                      </div>
                      <span className={`chip status-${request.status}`} style={{ fontSize: '0.68rem' }}>
                        {request.status}
                      </span>
                    </div>
                    <p className="pitch-card__text">"{request.pitch}"</p>
                    {request.status === 'pending' && (
                      <div className="pitch-card__actions">
                        <button type="button" className="btn-primary" onClick={() => onAction('request', request.id, { status: 'accepted' })} disabled={busyId === `request-${request.id}`}>
                          <Check size={14} /> Accept
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => onAction('request', request.id, { status: 'rejected' })} disabled={busyId === `request-${request.id}`}>
                          Reject
                        </button>
                      </div>
                    )}
                    {request.status === 'accepted' && request.chat_session_id && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <ChatButton sessionId={request.chat_session_id} partner={{ id: request.sender_id, name: request.sender_name, profile_pic: request.sender_profile_pic }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="pitch-card__empty">
                <p>No pitches yet. Sit tight, your team is out there!</p>
              </div>
            )}
          </div>
        </>
      )}
    </GlassCard>
  );
};

const ManageView = () => {
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState(null);
  const { getToken } = useAuth();
  const isMobile = useIsMobile();

  const loadMyTeams = async () => {
    try {
      const token = await getToken();
      const response = await axios.get('/teams/mine', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyTeams(response.data);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setStatus({ tone: 'error', message: 'Failed to synchronize your teammate posts.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyTeams();
  }, [getToken]);

  const handleAction = async (type, id, payload = {}) => {
    const key = `${type}-${id}`;
    setBusyId(key);
    setStatus(null);
    try {
      const token = await getToken();
      if (type === 'request') {
        await axios.patch(`/teams/requests/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else if (type === 'status') {
        await axios.patch(`/teams/${id}/status`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else if (type === 'update') {
        await axios.put(`/teams/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else if (type === 'delete') {
        await axios.delete(`/teams/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      }
      await loadMyTeams();
      setStatus({ tone: 'success', message: type === 'delete' ? 'Teammate post removed.' : 'Update synchronized successfully.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ tone: 'error', message: error.response?.data?.message || 'Update failed. Please retry.' });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="messages-loading">
        <Loader2 className="animate-spin" size={28} color="var(--accent-primary)" />
        <p>Syncing your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="market-shell">
      <motion.div
        initial={isMobile ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="messages-header"
      >
        <h1 className="page-title">Manage Your Posts</h1>
      </motion.div>

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className={`modal-status modal-status--${status.tone}`}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            {status.tone === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            {status.message}
          </motion.div>
        )}
      </AnimatePresence>

      {myTeams.length > 0 ? (
        <div className="manage-grid">
          {myTeams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={isMobile ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <ManageTeamCard team={team} onAction={handleAction} busyId={busyId} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="messages-empty">
          <div className="messages-empty__icon">
            <Edit size={28} />
          </div>
          <h2>No Active Posts</h2>
          <p>You haven't requested teammates for any events yet. Start by finding an event you're interested in!</p>
          <div className="messages-empty__actions">
            <a href="/" className="btn-primary">Explore Events</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageView;
