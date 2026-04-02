import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, MapPin, Menu, Radar, Users, X } from 'lucide-react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import CreateTeamModal from '../common/CreateTeamModal';
import useIsMobile from '../../hooks/useIsMobile';

const navLinkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

const NavItems = ({ onClose, onTeammatesClick, isMobile = false }) => (
  <>
    <NavLink to="/" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
      <Compass size={18} />
      Discover
    </NavLink>
    <SignedIn>
      <button type="button" onClick={onTeammatesClick} className={isMobile ? 'nav-link nav-link--mobile' : 'nav-link'}>
        <Users size={18} />
        Teammates
      </button>
    </SignedIn>
    <SignedOut>
      <NavLink to="/auth" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
        <Users size={18} />
        Teammates
      </NavLink>
    </SignedOut>
    <NavLink to="/ready" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
      <Radar size={18} />
      Match
    </NavLink>
  </>
);

const Navbar = ({ onTeamCreated }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const isMobile = useIsMobile();

  const openTeammatesModal = () => {
    setMobileOpen(false);
    setIsCreateTeamOpen(true);
  };

  return (
    <>
      <motion.nav
        className="top-nav"
        initial={isMobile ? false : { y: -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: isMobile ? 0.18 : 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="top-nav__row">
          <NavLink to="/" className="top-nav__brand" onClick={() => setMobileOpen(false)}>
            <span className="brand-title">Unifyr</span>
          </NavLink>

          <div className="top-nav__links">
            <NavItems onClose={() => setMobileOpen(false)} onTeammatesClick={openTeammatesModal} />
          </div>

          <div className="top-nav__actions">
            <div className="nav-city-pill">
              <MapPin size={16} />
              Bengaluru
            </div>

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
              <NavLink to="/auth" className="btn-primary">
                Sign In
              </NavLink>
            </SignedOut>

            <button
              type="button"
              className="top-nav__mobile-toggle"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="top-nav__mobile-panel"
              initial={isMobile ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: isMobile ? 0.16 : 0.25 }}
            >
              <div className="top-nav__mobile-links">
                <NavItems isMobile onClose={() => setMobileOpen(false)} onTeammatesClick={openTeammatesModal} />
              </div>

              <div className="top-nav__mobile-header">
                <div className="nav-city-pill">
                  <MapPin size={16} />
                  Bengaluru
                </div>

                <SignedOut>
                  <NavLink to="/auth" className="btn-primary" onClick={() => setMobileOpen(false)}>
                    Sign In
                  </NavLink>
                </SignedOut>

                <SignedIn>
                  <div className="nav-avatar-shell">
                    <UserButton afterSignOutUrl="/">
                      <UserButton.MenuItems>
                        <UserButton.Action label="signOut" />
                      </UserButton.MenuItems>
                    </UserButton>
                  </div>
                </SignedIn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreated={() => {
          onTeamCreated?.();
        }}
      />
    </>
  );
};

export default Navbar;
