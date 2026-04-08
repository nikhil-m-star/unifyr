import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const AuthView = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const isSignUp = mode === 'signup';

  return (
    <div className="auth-shell">
      <motion.div
        className="auth-simple"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="auth-simple__intro">
          <span className="section-kicker">{isSignUp ? 'Create account' : 'Welcome back'}</span>
          <h1 className="auth-simple__title">Campus Unifyr</h1>
          <p className="auth-simple__copy">
            {isSignUp ? 'Create your account to connect with teams.' : 'Sign in to continue to events and teams.'}
          </p>
        </div>

        <div className="auth-switch" style={{ marginBottom: '0.25rem' }}>
          <Link 
            to="/auth" 
            className={!isSignUp ? 'auth-tab auth-tab--active' : 'auth-tab'}
          >
            Sign In
          </Link>
          <Link 
            to="/auth?mode=signup" 
            className={isSignUp ? 'auth-tab auth-tab--active' : 'auth-tab'}
          >
            Sign Up
          </Link>
        </div>

        <div className="auth-panel">
          {isSignUp ? (
            <SignUp
              routing="path"
              path="/auth"
              signInUrl="/auth"
              fallbackRedirectUrl="/"
            />
          ) : (
            <SignIn
              routing="path"
              path="/auth"
              signUpUrl="/auth?mode=signup"
              fallbackRedirectUrl="/"
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthView;
