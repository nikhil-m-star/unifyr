import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { motion } from 'framer-motion';

const AuthView = () => {
  return (
    <div className="auth-shell">
      <motion.div
        className="auth-simple"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="auth-simple__intro">
          <span className="section-kicker">Welcome</span>
          <h1 className="auth-simple__title">Campus Unifyr</h1>
          <p className="auth-simple__copy">
            Sign in or create an account to connect with teams.
          </p>
          <div className="auth-simple__notice">
            Use your college email ending with <strong>@bmsce.ac.in</strong> for sign in and sign up.
          </div>
        </div>

        <div className="auth-panel">
          <SignIn
            routing="path"
            path="/auth"
            signUpUrl="/auth"
            fallbackRedirectUrl="/"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default AuthView;
