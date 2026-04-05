import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import useIsMobile from '../../hooks/useIsMobile';

const GlassCard = ({ children, className = '', style = {}, ...props }) => {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`surface-card ${className}`}
      initial={isMobile ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: isMobile ? 0.18 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduceMotion || isMobile ? undefined : { y: -3, transition: { type: 'spring', stiffness: 420, damping: 28 } }}
      whileTap={reduceMotion || isMobile ? undefined : { scale: 0.992 }}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
