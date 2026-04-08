import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ExternalLink, Filter, MapPin, Sparkles, Loader2, Info, Ticket } from 'lucide-react';
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
  const isMobile = useIsMobile();

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
  const filteredEvents = filter === 'All' ? events : events.filter(e => e.category === filter);

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
        <span className="section-kicker" style={{ color: 'rgba(255,255,255,0.8)' }}>Live from BMSCE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 className="page-title">Active Events</h1>
          <Sparkles size={24} color="rgba(255,255,255,0.8)" style={{ marginTop: '8px' }} />
        </div>
        <p className="messages-subtitle" style={{ maxWidth: '600px' }}>
          Real-time event listing from Utsav 2026. Discover competitions, workshops, and performances happening across the campus.
        </p>
      </motion.header>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.04)', 
        border: '1px solid rgba(255, 255, 255, 0.15)', 
        padding: '12px 20px', 
        borderRadius: '16px', 
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem'
      }}>
        <Info size={18} color="rgba(255,255,255,0.85)" />
        <span>These events are managed by the Utsav BMSCE committee. Registration links point to the official portal.</span>
      </div>

      <div className="category-filters" style={{ display: 'flex', gap: '10px', marginBottom: '2.5rem', overflowX: 'auto', paddingBottom: '8px' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`chip ${filter === cat ? 'chip--active' : ''}`}
            style={{ 
              cursor: 'pointer',
              background: filter === cat ? '#ffffff' : 'rgba(255,255,255,0.05)',
              color: filter === cat ? '#101010' : 'var(--text-secondary)',
              border: filter === cat ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
              padding: '8px 18px',
              fontSize: '0.86rem'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="active-events-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: '24px' 
      }}>
        <AnimatePresence mode="popLayout">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
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
                  <h3 className="utsav-event-card__title">{event.title}</h3>
                  <p className="utsav-event-card__description">
                    {event.description}
                  </p>

                  <div className="utsav-event-card__meta-wrap">
                    <div className="utsav-event-card__meta">
                      <div className="inline-stack">
                        <Calendar size={14} /> {formatEventDate(event.date)}
                      </div>
                      <div className="inline-stack">
                        <MapPin size={14} /> {event.venue || 'BMSCE Campus'}
                      </div>
                    </div>

                    <div className="utsav-event-card__meta">
                      <div className="inline-stack">
                        <Ticket size={14} /> {event.registration_open ? 'Registration Open' : 'Registration Closed'}
                      </div>
                    </div>

                    <a
                      href={event.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="utsav-event-card__cta"
                    >
                      Official Page <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                    </a>
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
    </div>
  );
};

export default ActiveEventsView;
