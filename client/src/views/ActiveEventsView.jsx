import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ExternalLink, Filter, MapPin, Sparkles, Loader2, Info } from 'lucide-react';
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
        <span className="section-kicker" style={{ color: '#ff3e00' }}>Live from BMSCE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 className="page-title">Active Events</h1>
          <Sparkles size={24} color="#ff3e00" style={{ marginTop: '8px' }} />
        </div>
        <p className="messages-subtitle" style={{ maxWidth: '600px' }}>
          Real-time event listing from **Utsav 2026**. Discover competitions, workshops, and performances happening across the campus.
        </p>
      </motion.header>

      <div style={{ 
        background: 'rgba(255, 62, 0, 0.05)', 
        border: '1px solid rgba(255, 62, 0, 0.15)', 
        padding: '12px 20px', 
        borderRadius: '16px', 
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem'
      }}>
        <Info size={18} color="#ff3e00" />
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
              background: filter === cat ? '#ff3e00' : 'rgba(255,255,255,0.05)',
              color: filter === cat ? '#fff' : 'var(--text-secondary)',
              border: filter === cat ? '1px solid #ff3e00' : '1px solid rgba(255,255,255,0.1)',
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
              <GlassCard style={{ padding: '0', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                  height: '180px', 
                  backgroundImage: `url(${event.image_url})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  position: 'relative'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '12px', 
                    right: '12px',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {event.category}
                  </div>
                </div>

                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#fff' }}>{event.title}</h3>
                  <p style={{ 
                    fontSize: '0.9rem', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '20px',
                    lineHeight: 1.6,
                    flex: 1
                  }}>
                    {event.description}
                  </p>

                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} /> {formatEventDate(event.date)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} /> {event.venue || 'BMSCE Campus'}
                      </div>
                    </div>

                    <a
                      href={event.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ 
                        width: '100%', 
                        background: 'linear-gradient(135deg, #ff3e00 0%, #ff7e00 100%)',
                        color: '#fff',
                        border: 'none',
                        marginTop: '4px'
                      }}
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
