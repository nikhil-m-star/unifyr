import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { ArrowLeft, ArrowRight, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HeroEvent from '../components/common/HeroEvent';
import TeamPost from '../components/common/TeamPost';
import CreateTeamModal from '../components/common/CreateTeamModal';
import axios from '../api/axios';
import useIsMobile from '../hooks/useIsMobile';
import { groupTeamsByEvent } from '../lib/groupTeams';

const normalizeName = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toTokenSet = (value = '') =>
  new Set(
    normalizeName(value)
      .split(' ')
      .filter((token) => token.length > 2)
  );

const similarityScore = (left, right) => {
  const a = normalizeName(left);
  const b = normalizeName(right);

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const includesBonus = a.includes(b) || b.includes(a) ? 0.25 : 0;
  const startsWithBonus = a.startsWith(b) || b.startsWith(a) ? 0.15 : 0;

  const leftTokens = toTokenSet(a);
  const rightTokens = toTokenSet(b);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return Math.min(0.9, includesBonus + startsWithBonus);
  }

  let intersection = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  });

  const tokenScore = intersection / Math.max(leftTokens.size, rightTokens.size);
  return Math.min(1, tokenScore + includesBonus + startsWithBonus);
};

const getBestEventMatch = (team, events) => {
  const teamEventName = team.event_name || team.eventName || '';
  if (!teamEventName) {
    return null;
  }

  let bestMatch = null;
  let bestScore = 0;

  events.forEach((event) => {
    const score = similarityScore(teamEventName, event.title);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = event;
    }
  });

  return bestScore >= 0.45 ? bestMatch : null;
};

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
          <h3 className="event-group__name" style={{ fontSize: '1.2rem' }}>{group.eventName}</h3>
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
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [allUtsavEvents, setAllUtsavEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const [utsavRes, teamsRes] = await Promise.all([axios.get('/utsav'), axios.get('/teams')]);
        const utsavEvents = Array.isArray(utsavRes.data) ? utsavRes.data : [];
        const sorted = [...utsavEvents].sort((a, b) => Number(b.registration_open) - Number(a.registration_open));
        setAllUtsavEvents(utsavEvents);
        setFeaturedEvents(sorted.slice(0, 14));
        setTeams(teamsRes.data);
      } catch (error) {
        console.error('Failed to fetch discovery feed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [refreshToken]);

  useEffect(() => {
    if (featuredEvents.length <= 1) return undefined;
    const interval = setInterval(() => {
      const container = carouselRef.current;
      if (!container) return;
      
      const firstCard = container.querySelector('.featured-carousel__item');
      const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : container.clientWidth * 0.82;
      const amount = Math.max(cardWidth + 24, 260);
      
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: amount, behavior: 'smooth' });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [featuredEvents]);

  const scrollCarousel = (direction) => {
    const container = carouselRef.current;
    if (!container) return;
    const firstCard = container.querySelector('.featured-carousel__item');
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : container.clientWidth * 0.82;
    const amount = Math.max(cardWidth + 24, 260);
    container.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasActiveSearch = normalizedQuery.length > 0;

  const teamsWithMatchedEvents = teams.map((team) => {
    const matchedEvent = getBestEventMatch(team, allUtsavEvents);
    const officialEventName = matchedEvent?.title || team.event_name || team.eventName || '';
    return {
      ...team,
      original_event_name: team.event_name || team.eventName || '',
      event_name: officialEventName,
      matched_event_image_url: matchedEvent?.image_url || null,
      matched_event_title: matchedEvent?.title || null,
    };
  });

  const filteredEvents = featuredEvents.filter((event) => {
    if (!hasActiveSearch) {
      return true;
    }

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

  const filteredTeams = teamsWithMatchedEvents.filter(t => 
    t.event_name?.toLowerCase().includes(normalizedQuery) || 
    t.original_event_name?.toLowerCase().includes(normalizedQuery) || 
    t.description?.toLowerCase().includes(normalizedQuery) ||
    t.team_name?.toLowerCase().includes(normalizedQuery)
  );

  const groupedTeams = groupTeamsByEvent(filteredTeams);

  const featuredEventsSection = (
    <motion.section
      className="feed-section top-section"
      initial={isMobile ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: isMobile ? 0.18 : 0.4 }}
    >
      <div className="section-head section-head--top">
        <span className="section-kicker">Featured events</span>
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
        <div className="empty-state">
          {hasActiveSearch ? 'No featured events match your search.' : 'No featured events available right now.'}
        </div>
      )}

      <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
        <button 
          type="button" 
          className="btn-primary" 
          style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '14px' }}
          onClick={() => {
            if (!isSignedIn) {
              navigate('/auth');
              return;
            }
            setIsCreateTeamOpen(true);
          }}
        >
          Post Recruitment
        </button>
      </div>
    </motion.section>
  );

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
      <div className="feed-section top-section">
        <div className="teammates-filters teammates-filters--home">
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
      </div>

      {!hasActiveSearch && featuredEventsSection}

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

      {hasActiveSearch && featuredEventsSection}

      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreated={() => {
          // Refresh data if needed, or rely on interval
        }}
      />
    </div>
  );
};

export default HomeView;
