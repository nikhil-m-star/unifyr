import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, Edit, AlertCircle, Loader2 } from 'lucide-react';
import axios from '../api/axios';
import GlassCard from '../components/common/GlassCard';
import useIsMobile from '../hooks/useIsMobile';

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
    <GlassCard className="manage-card" style={{ padding: '1.5rem', height: 'auto' }}>
      {isEditing ? (
        <form onSubmit={handleUpdate} className="form-stack">
          <div className="section-kicker" style={{ marginBottom: '1rem' }}>Edit teammate post</div>
          <div className="field">
            <label htmlFor={`edit-teamName-${team.id}`}>Team Name</label>
            <input
              id={`edit-teamName-${team.id}`}
              name="teamName"
              className="glass-input"
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
              className="glass-input"
              value={editForm.lookingFor}
              onChange={handleEditChange}
            />
          </div>
          <div className="field">
            <label htmlFor={`edit-description-${team.id}`}>Description</label>
            <textarea
              id={`edit-description-${team.id}`}
              name="description"
              className="glass-input"
              rows={3}
              value={editForm.description}
              onChange={handleEditChange}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn-primary" disabled={busyId?.includes(team.id)}>
              {busyId?.includes(team.id) ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)' }}>
                {team.team_name || team.teamName}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Event: {team.event_name || team.eventName}
              </p>
            </div>
            <span className="chip" style={{ 
              background: team.status === 'closed' ? 'rgba(244,114,182,0.1)' : 'rgba(0,229,255,0.08)', 
              color: team.status === 'closed' ? 'var(--accent-rose)' : 'var(--accent-cyan)',
              border: `1px solid ${team.status === 'closed' ? 'rgba(244,114,182,0.2)' : 'rgba(0,229,255,0.2)'}`
            }}>
              {team.status || 'open'}
            </span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {team.description || 'No description provided.'}
          </p>

          {team.looking_for && (
             <div style={{ marginBottom: '1.5rem' }}>
               <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                 Looking for
               </span>
               <span className="chip" style={{ background: 'rgba(255,255,255,0.05)' }}>
                 {team.looking_for}
               </span>
             </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onAction('status', team.id, { status: team.status === 'open' ? 'closed' : 'open' })}
              disabled={busyId === `status-${team.id}`}
            >
              {team.status === 'open' ? 'Close Recruitment' : 'Reopen Recruitment'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsEditing(true)}
              disabled={busyId?.includes(team.id)}
            >
              <Edit size={16} /> Edit Details
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => onAction('delete', team.id)}
              disabled={busyId === `delete-${team.id}`}
              style={{ color: 'var(--accent-rose)', marginLeft: 'auto' }}
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="pitches-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Incoming Pitches ({team.requests?.length || 0})
              </h4>
            </div>

            {team.requests?.length ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {team.requests.map((request) => (
                  <div 
                    key={request.id} 
                    style={{ 
                      borderRadius: '20px', 
                      padding: '1.25rem', 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '12px', 
                          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '0.9rem', 
                          fontWeight: 700,
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}>
                          {request.sender_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.92rem' }}>{request.sender_name || 'Applicant'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{request.sender_role || 'Developer'}</div>
                        </div>
                      </div>
                      <span className={`chip status-${request.status}`} style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>
                        {request.status}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '12px' }}>
                      "{request.pitch}"
                    </p>
                    {request.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: '0.85rem', flex: 1 }}
                          onClick={() => onAction('request', request.id, { status: 'accepted' })}
                          disabled={busyId === `request-${request.id}`}
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '8px 16px', fontSize: '0.85rem', flex: 1 }}
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
              <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.015)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>No pitches yet. Sit tight, your team is out there!</p>
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
      setStatus({ 
        tone: 'success', 
        message: type === 'delete' ? 'Teammate post removed.' : 'Update synchronized successfully.' 
      });
      
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ 
        tone: 'error', 
        message: error.response?.data?.message || 'Update failed. Please retry.' 
      });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Syncing your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="market-shell">
      <motion.div
        initial={isMobile ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
        style={{ marginBottom: '2.5rem' }}
      >
        <div className="section-head">
          <span className="section-kicker">Recruitment Hub</span>
          <h1 className="page-title">Manage Your Posts</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1rem' }}>
            Control your teammate listings and respond to incoming pitches.
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{ 
              padding: '12px 20px', 
              borderRadius: '16px', 
              background: status.tone === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              color: status.tone === 'success' ? 'var(--accent-green)' : 'var(--accent-rose)',
              border: `1px solid ${status.tone === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.92rem',
              fontWeight: 600
            }}
          >
            {status.tone === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
            {status.message}
          </motion.div>
        )}
      </AnimatePresence>

      {myTeams.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 480px), 1fr))', gap: '1.5rem' }}>
          {myTeams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={isMobile ? false : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ManageTeamCard team={team} onAction={handleAction} busyId={busyId} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            width: '80px', 
            height: '80px', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 2rem',
            color: 'var(--text-muted)',
            border: '1px solid var(--glass-border)'
          }}>
            <Edit size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>No Active Posts</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '400px', margin: '0 auto 2.5rem' }}>
            You haven't requested teammates for any events yet. Start by finding an event you're interested in!
          </p>
          <a href="/" className="btn-primary" style={{ padding: '14px 28px' }}>Explore Events</a>
        </div>
      )}
    </div>
  );
};

export default ManageView;
