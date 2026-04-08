import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ExternalLink, Filter, MapPin, Loader2, Search, Ticket, X } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import GlassCard from '../components/common/GlassCard';
import useIsMobile from '../hooks/useIsMobile';

const formatEventDate = (dateText) => {
  if (!dateText) {
    return 'TBA';
  }

  const parsed = new Date(dateText);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return dateText;
};

const ActiveEventsView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestEvent, setRequestEvent] = useState(null);
  const [requestForm, setRequestForm] = useState({ teamName: '', lookingFor: '' });
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get('/utsav');
        setEvents(response.data);
      } catch (error) {
        console.error('Failed to fetch Utsav events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const categories = ['All', ...new Set(events.map(e => e.category))];
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const categoryFilteredEvents = filter === 'All' ? events : events.filter(e => e.category === filter);
  const filteredEvents = categoryFilteredEvents.filter((event) => {
    if (!normalizedQuery) return true;

    return [
      event.title,
      event.category,
      event.venue,
      event.date,
      event.description,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedQuery));
  });

  const handleOpenRequestModal = (event) => {
    if (!isSignedIn) {
      navigate('/auth');
      return;
    }
    setRequestEvent(event);
    setRequestForm({ teamName: '', lookingFor: '' });
    setRequestStatus(null);
    setRequestModalOpen(true);
  };

  const handleCreateTeammateRequest = async (event) => {
    event.preventDefault();
    if (!requestEvent) return;

    try {
      setCreatingRequest(true);
      setRequestStatus(null);
      const token = await getToken();
      await axios.post(
        '/teams',
        {
          eventName: requestEvent.title,
          teamName: requestForm.teamName.trim(),
          lookingFor: requestForm.lookingFor.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setRequestStatus({ tone: 'success', message: 'Teammate request posted successfully.' });
      setTimeout(() => {
        setRequestModalOpen(false);
        setRequestEvent(null);
      }, 1200);
    } catch (error) {
      setRequestStatus({
        tone: 'error',
        message: error.response?.data?.message || 'Failed to post teammate request.',
      });
    } finally {
      setCreatingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="messages-loading">
        <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" />
        <p style={{ marginTop: '1rem', fontWeight: 500, letterSpacing: '0.05em' }}>SYNCING UTSAV 2026 LIVE FEED...</p>
      </div>
    );
  }

  return (
    <div className="market-shell">
      <motion.header 
        className="messages-header"
        initial={isMobile ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <h1 className="page-title">Active Events</h1>
          <span className="text-badge">{filteredEvents.length} events</span>
        </div>
      </motion.header>

      <div className="events-filter-bar hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`events-filter-pill ${filter === cat ? 'events-filter-pill--active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="teammates-search-wrap" style={{ marginBottom: '1rem' }}>
        <Search className="teammates-search-icon" size={16} />
        <input
          type="text"
          className="glass-input"
          placeholder="Search active events..."
          style={{ paddingLeft: '44px', width: '100%', height: '48px', fontSize: '0.95rem' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="active-events-grid">
        <AnimatePresence mode="popLayout">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              className="active-events-grid__item"
              layout
              initial={isMobile ? { opacity: 0, y: 8 } : { opacity: 0, scale: 0.9 }}
              animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1 }}
              exit={isMobile ? { opacity: 0, y: 8 } : { opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.22, delay: Math.min(index, 8) * 0.03 }}
            >
              <GlassCard className="utsav-event-card">
                <div className="utsav-event-card__poster-wrap">
                  <img
                    className="utsav-event-card__poster"
                    src={event.image_url}
                    alt={event.title}
                    loading="lazy"
                  />
                  <div className="utsav-event-card__category">
                    {event.category}
                  </div>
                </div>

                <div className="utsav-event-card__body">
                  <div className="utsav-event-card__meta-wrap">
                    <div className="utsav-event-card__meta-row">
                      <span className="utsav-event-card__meta-item">
                        <Calendar size={14} />
                        <span className="utsav-event-card__meta-text utsav-event-card__meta-text--date">{formatEventDate(event.date)}</span>
                      </span>
                    </div>

                    <div className="utsav-event-card__meta-row">
                      <span className="utsav-event-card__meta-item">
                        <MapPin size={14} />
                        <span className="utsav-event-card__meta-text">{event.venue || 'BMSCE Campus'}</span>
                      </span>
                    </div>

                    <div className="utsav-event-card__meta-row">
                      <span className={`utsav-event-card__status ${event.registration_open ? 'utsav-event-card__status--open' : 'utsav-event-card__status--closed'}`}>
                        <Ticket size={13} />
                        {event.registration_open ? 'Registration Open' : 'Registration Closed'}
                      </span>
                    </div>

                    <a
                      href={event.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="utsav-event-card__cta"
                    >
                      Official Page <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                    </a>

                    <button
                      type="button"
                      className="utsav-event-card__cta utsav-event-card__cta--secondary"
                      onClick={() => handleOpenRequestModal(event)}
                    >
                      Request Teammates
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredEvents.length === 0 && (
        <div className="empty-state" style={{ padding: '80px 20px' }}>
          <Filter size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3>No events found in this category</h3>
          <p>Check back later for more updates from Utsav 2026.</p>
        </div>
      )}

      <AnimatePresence>
        {requestModalOpen && (
          <>
            <motion.div
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRequestModalOpen(false)}
            />
            <div className="modal-wrap">
              <motion.div
                className="modal-card modal-shell"
                initial={isMobile ? false : { opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.96 }}
                transition={{ duration: isMobile ? 0.18 : 0.24 }}
                onClick={(evt) => evt.stopPropagation()}
              >
                <div className="modal-head">
                  <div>
                    <span className="section-kicker">Teammate Request</span>
                    <h3 className="modal-title">{requestEvent?.title || 'Event'}</h3>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setRequestModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                {requestStatus && (
                  <div className={`modal-status modal-status--${requestStatus.tone}`} style={{ marginBottom: '1rem' }}>
                    {requestStatus.message}
                  </div>
                )}

                <form onSubmit={handleCreateTeammateRequest} className="form-stack">
                  <div className="field">
                    <label htmlFor="active-event-team-name">Team Name</label>
                    <input
                      id="active-event-team-name"
                      className="app-input"
                      value={requestForm.teamName}
                      onChange={(evt) => setRequestForm((current) => ({ ...current, teamName: evt.target.value }))}
                      placeholder="Enter your team name"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="active-event-looking-for">Looking For</label>
                    <input
                      id="active-event-looking-for"
                      className="app-input"
                      value={requestForm.lookingFor}
                      onChange={(evt) => setRequestForm((current) => ({ ...current, lookingFor: evt.target.value }))}
                      placeholder="Frontend dev, UI designer, ML engineer..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={creatingRequest || !requestForm.teamName.trim()}
                    style={{ width: '100%' }}
                  >
                    {creatingRequest ? 'Posting...' : 'Post Teammate Request'}
                  </button>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActiveEventsView;
