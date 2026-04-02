import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = '', style = {}, ...props }) => {
  return (
    <motion.div
      className={`surface-card ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
