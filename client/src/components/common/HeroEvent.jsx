import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Calendar, MapPin, Tag } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const HeroEvent = ({ event }) => {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const rawEventDate = event.event_date || event.eventDate;
  const parsedEventDate = rawEventDate ? new Date(rawEventDate) : null;
  const formattedDate =
    parsedEventDate && !Number.isNaN(parsedEventDate.getTime())
      ? parsedEventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Date TBD';

  return (
    <motion.article
      className="market-card"
      whileHover={reduceMotion || isMobile ? undefined : { y: -8, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
      whileTap={reduceMotion || isMobile ? undefined : { scale: 0.995 }}
      transition={{ duration: isMobile ? 0.16 : 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="market-card__media"
        style={{
          backgroundImage: `url(${
            event.image_url ||
            event.imageUrl ||
            'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1000'
          })`,
        }}
      />
      <div className="market-card__shade" />

      <div className="market-card__content">
        <span className="card-pill card-pill--light">
          <Tag size={12} />
          {event.category || 'Featured'}
        </span>

        <h3>{event.title}</h3>
        <p>{event.description}</p>

        <div className="card-meta">
          <span className="inline-stack">
            <Calendar size={14} />
            {formattedDate}
          </span>
          <span className="inline-stack">
            <MapPin size={14} />
            Campus venue
          </span>
        </div>
      </div>
    </motion.article>
  );
};

export default HeroEvent;
