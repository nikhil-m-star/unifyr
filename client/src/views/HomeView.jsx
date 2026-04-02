import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Users } from 'lucide-react';
import HeroEvent from '../components/common/HeroEvent';
import TeamPost from '../components/common/TeamPost';
import axios from '../api/axios';

const HomeView = ({ refreshToken = 0 }) => {
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);

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

    const amount = Math.max(container.clientWidth * 0.82, 320);
    container.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

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
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="section-head section-head--top">
          <span className="section-kicker">Featured events</span>

          {events.length > 1 && (
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

        {events.length > 0 ? (
          <div ref={carouselRef} className="featured-carousel hide-scrollbar">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                className="featured-carousel__item"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
              >
                <HeroEvent event={event} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No featured events yet.</div>
        )}
      </motion.section>

      <motion.section
        className="feed-section"
        id="teams"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <div className="section-head">
          <span className="section-kicker">Open teams</span>
          <div className="inline-stack text-badge">
            <Users size={16} />
            {teams.length} active listings
          </div>
        </div>

        <div className="team-grid">
          {teams.length > 0 ? (
            teams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
              >
                <TeamPost team={team} />
              </motion.div>
            ))
          ) : (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              No teams are recruiting right now.
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
};

export default HomeView;
