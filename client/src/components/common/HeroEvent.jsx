import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Tag } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const HeroEvent = ({ event }) => {
  const isMobile = useIsMobile();
  const rawEventDate = event.event_date || event.eventDate;
  const parsedEventDate = rawEventDate ? new Date(rawEventDate) : null;
  const formattedDate =
    parsedEventDate && !Number.isNaN(parsedEventDate.getTime())
      ? parsedEventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Date TBD';

  return (
    <motion.article
      className="market-card"
      whileHover={isMobile ? undefined : { y: -6 }}
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
