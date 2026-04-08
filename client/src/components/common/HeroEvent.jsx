import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Calendar, ExternalLink, MapPin, Tag } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const formatEventDate = (dateText) => {
  if (!dateText) {
    return 'Date TBD';
  }

  const parsed = new Date(dateText);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return dateText;
};

const HeroEvent = ({ event }) => {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const formattedDate = formatEventDate(event.date || event.event_date || event.eventDate);
  const href = event.registration_url || 'https://events.utsavbmsce.in/events';

  return (
    <motion.a
      className="utsav-feature-card"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${event.title || 'event'} on official portal`}
      whileHover={reduceMotion || isMobile ? undefined : { y: -8, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
      whileTap={reduceMotion || isMobile ? undefined : { scale: 0.995 }}
      transition={{ duration: isMobile ? 0.16 : 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="utsav-feature-card__poster-wrap">
        <img
          className="utsav-feature-card__poster"
          src={
            event.image_url ||
            event.imageUrl ||
            'https://events.utsavbmsce.in/ut-2026.svg'
          }
          alt={event.title || 'Event poster'}
          loading="lazy"
        />
      </div>

      <div className="utsav-feature-card__content">
        <span className="card-pill card-pill--light">
          <Tag size={12} />
          {event.category || 'Featured'}
        </span>

        <h3 className="utsav-feature-card__title">{event.title}</h3>

        <div className="card-meta utsav-feature-card__meta">
          <span className="inline-stack">
            <Calendar size={14} />
            {formattedDate}
          </span>
          <span className="inline-stack">
            <MapPin size={14} />
            {event.venue || 'BMSCE Campus'}
          </span>
          <span className="inline-stack">
            <ExternalLink size={14} />
            Official page
          </span>
        </div>
      </div>
    </motion.a>
  );
};

export default HeroEvent;
