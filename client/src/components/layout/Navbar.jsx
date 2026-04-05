import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Compass, Edit, Menu, Radar, Users, X, MessageSquare } from 'lucide-react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import CreateTeamModal from '../common/CreateTeamModal';
import useIsMobile from '../../hooks/useIsMobile';

const navLinkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

const NavItems = ({ onClose, isMobile = false }) => (
  <>
    <NavLink to="/" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
      <Compass size={18} />
      Discover
    </NavLink>
    <NavLink to="/teammates" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
      <Users size={18} />
      Teammates
    </NavLink>
    <SignedIn>
      <NavLink to="/messages" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
        <MessageSquare size={18} />
        Messages
      </NavLink>
      <NavLink to="/manage" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
        <Edit size={18} />
        Manage
      </NavLink>
    </SignedIn>
    <NavLink to="/ready" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
      <Radar size={18} />
      Match
    </NavLink>
  </>
);

const Navbar = ({ onTeamCreated }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [modalInitialTab] = useState('create');
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  return (
    <>
      <motion.nav
        className="top-nav"
        initial={isMobile ? false : { y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={
          reduceMotion || isMobile
            ? { duration: 0.16 }
            : { type: 'spring', stiffness: 380, damping: 32, mass: 0.85 }
        }
      >
        <div className="top-nav__row">
          <NavLink to="/" className="top-nav__brand" onClick={() => setMobileOpen(false)}>
            <span className="brand-title">Campus Unifyr</span>
          </NavLink>

          <div className="top-nav__links">
            <NavItems onClose={() => setMobileOpen(false)} />
          </div>

          <div className="top-nav__actions">
            <SignedIn>
              <div className="nav-avatar-shell">
                <UserButton afterSignOutUrl="/">
                  <UserButton.MenuItems>
                    <UserButton.Action label="signOut" />
                  </UserButton.MenuItems>
                </UserButton>
              </div>
            </SignedIn>

            <SignedOut>
              <motion.div
                style={{ display: 'inline-flex' }}
                whileHover={reduceMotion ? undefined : { scale: 1.04, transition: { type: 'spring', stiffness: 500, damping: 22 } }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              >
                <NavLink to="/auth" className="btn-primary">
                  Sign In
                </NavLink>
              </motion.div>
            </SignedOut>

            <button
              type="button"
              className="top-nav__mobile-toggle"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="top-nav__mobile-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={reduceMotion ? { duration: 0.2 } : { type: 'spring', stiffness: 420, damping: 32 }}
            >
              <div className="top-nav__mobile-links">
                <NavItems isMobile onClose={() => setMobileOpen(false)} />
              </div>

              <div className="top-nav__mobile-header">
                <SignedOut>
                  <motion.div
                    style={{ display: 'flex', width: '100%' }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  >
                    <NavLink to="/auth" className="btn-primary" onClick={() => setMobileOpen(false)} style={{ width: '100%', justifyContent: 'center' }}>
                      Sign In
                    </NavLink>
                  </motion.div>
                </SignedOut>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        initialTab={modalInitialTab}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreated={() => {
          onTeamCreated?.();
        }}
      />
    </>
  );
};

export default Navbar;
