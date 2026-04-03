import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Users, ChevronDown, ChevronUp } from 'lucide-react';
import HeroEvent from '../components/common/HeroEvent';
import TeamPost from '../components/common/TeamPost';
import axios from '../api/axios';
import useIsMobile from '../hooks/useIsMobile';
import { groupTeamsByEvent } from '../lib/groupTeams';

const MiniEventGroup = ({ group, isMobile }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="event-group event-group--compact">
      <button
        type="button"
        className="event-group__header"
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="event-group__info">
          <span className="event-group__dot" />
          <h3 className="event-group__name" style={{ fontSize: '1rem' }}>{group.eventName}</h3>
          <span className="event-group__count">{group.teams.length}</span>
        </div>
        <span className="event-group__toggle">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="event-group__grid">
              {group.teams.map((team, index) => (
                <motion.div
                  key={team.id}
                  initial={isMobile ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: isMobile ? 0.14 : 0.25, delay: isMobile ? 0 : 0.03 * index }}
                >
                  <TeamPost team={team} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const HomeView = ({ refreshToken = 0 }) => {
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const carouselRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const [eventsRes, teamsRes] = await Promise.all([axios.get('/events'), axios.get('/teams')]);
        setEvents(eventsRes.data);
        setTeams(teamsRes.data);
      } catch (error) {
        console.error('Failed to fetch discovery feed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [refreshToken]);

  const scrollCarousel = (direction) => {
    const container = carouselRef.current;
    if (!container) return;
    const firstCard = container.querySelector('.featured-carousel__item');
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : container.clientWidth * 0.82;
    const amount = Math.max(cardWidth + 24, 260);
    container.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  const filteredEvents = events.filter(e => 
    e.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeams = teams.filter(t => 
    t.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.team_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedTeams = groupTeamsByEvent(filteredTeams);

  if (loading) {
    return (
      <div className="market-shell">
        <div className="feed-section top-section">
          <div className="skeleton" style={{ height: '30px', width: '220px', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '16px', width: '360px', maxWidth: '100%', marginBottom: '24px' }} />
          <div className="featured-carousel">
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton featured-carousel__skeleton" />
            ))}
          </div>
        </div>

        <div className="feed-section">
          <div className="skeleton" style={{ height: '28px', width: '240px', marginBottom: '18px' }} />
          <div className="team-grid">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="skeleton" style={{ minHeight: '220px' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="market-shell">
      <motion.section
        className="feed-section top-section"
        initial={isMobile ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: isMobile ? 0.18 : 0.4 }}
      >
        <div className="teammates-filters" style={{ marginBottom: '2.5rem' }}>
          <div className="teammates-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="teammates-search-icon" style={{ width: '16px', height: '16px' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              className="glass-input"
              placeholder="Search for an event, hackathon, or team..."
              style={{ paddingLeft: '44px', width: '100%', height: '52px', fontSize: '0.95rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="section-head section-head--top">
          <span className="section-kicker">Featured events</span>

          {filteredEvents.length > 1 && (
            <div className="carousel-controls">
              <button type="button" className="carousel-button" onClick={() => scrollCarousel(-1)} aria-label="Scroll left">
                <ArrowLeft size={18} />
              </button>
              <button type="button" className="carousel-button" onClick={() => scrollCarousel(1)} aria-label="Scroll right">
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>

        {filteredEvents.length > 0 ? (
          <div ref={carouselRef} className="featured-carousel hide-scrollbar">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                className="featured-carousel__item"
                initial={isMobile ? false : { opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: isMobile ? 0.16 : 0.3, delay: isMobile ? 0 : index * 0.04 }}
              >
                <HeroEvent event={event} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No featured events match your search.</div>
        )}
      </motion.section>

      <motion.section
        className="feed-section"
        id="teams"
        initial={isMobile ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: isMobile ? 0.18 : 0.4, delay: isMobile ? 0 : 0.08 }}
      >
        <div className="section-head">
          <span className="section-kicker">Open teams</span>
          <div className="inline-stack text-badge">
            <Users size={16} />
            {teams.length} active listings
          </div>
        </div>

        {groupedTeams.length > 0 ? (
          <div className="event-groups">
            {groupedTeams.map((group) => (
              <MiniEventGroup key={group.eventName} group={group} isMobile={isMobile} />
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            No teams are recruiting right now.
          </div>
        )}
      </motion.section>
    </div>
  );
};

export default HomeView;
