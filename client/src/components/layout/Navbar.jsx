import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bell, Compass, Edit, House, LogIn, MoreHorizontal, Shield, MessageSquare, Link2, User } from 'lucide-react';
import { SignedIn, SignedOut, UserButton, useAuth } from '@clerk/clerk-react';
import CreateTeamModal from '../common/CreateTeamModal';
import useIsMobile from '../../hooks/useIsMobile';
import axios from '../../api/axios';

const navLinkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

const NotificationBadge = ({ count = 0, tone = 'neutral' }) => (
  count > 0 ? <span className={`nav-badge nav-badge--${tone}`}>{count > 99 ? '99+' : count}</span> : null
);

const NavItems = ({
  onClose,
  isMobile = false,
  isAdmin = false,
  unreadNotificationCount = 0,
  unreadMessageCount = 0,
}) => (
  <>
    <NavLink to="/" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
      <House size={18} />
      Home
    </NavLink>
    <NavLink to="/events/active" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
      <Compass size={18} />
      Events
    </NavLink>
    <NavLink to="/recommendations" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
      <Link2 size={18} />
      Connect
    </NavLink>
    <SignedIn>
      <NavLink to="/messages" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
        <MessageSquare size={18} />
        Chats
        <NotificationBadge count={unreadMessageCount} tone="danger" />
      </NavLink>
      <NavLink to="/notifications" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
        <Bell size={18} />
        Alerts
        <NotificationBadge count={unreadNotificationCount} />
      </NavLink>
      <NavLink to="/manage" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
        <Edit size={18} />
        Manage
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" onClick={onClose} className={isMobile ? 'nav-link nav-link--mobile' : navLinkClass}>
          <Shield size={18} />
          Admin
        </NavLink>
      )}
    </SignedIn>
  </>
);

const Navbar = ({ onTeamCreated, unreadNotificationCount = 0, unreadMessageCount = 0 }) => {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalInitialTab] = useState('create');
  const { isSignedIn, getToken } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let isMounted = true;

    const fetchAdminState = async () => {
      if (!isSignedIn) {
        if (isMounted) {
          setIsAdmin(false);
        }
        return;
      }

      try {
        const token = await getToken();
        const response = await axios.get('/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isMounted) {
          setIsAdmin(Boolean(response.data?.isAdmin));
        }
      } catch (error) {
        if (isMounted) {
          setIsAdmin(false);
        }
      }
    };

    fetchAdminState();
    return () => {
      isMounted = false;
    };
  }, [isSignedIn, getToken]);

  useEffect(() => {
    setMobileMoreOpen(false);
  }, [location.pathname, isMobile]);

  const baseNavItems = [
    { to: '/', label: 'Home', icon: House },
    { to: '/events/active', label: 'Events', icon: Compass },
    { to: '/recommendations', label: 'Connect', icon: Link2 },
  ];

  const signedInPrimaryNavItems = [
    { to: '/messages', label: 'Chats', icon: MessageSquare },
    { to: '/notifications', label: 'Alerts', icon: Bell },
  ];

  const signedInOverflowNavItems = [
    { to: '/manage', label: 'Manage', icon: Edit },
  ];

  const adminNavItems = [
    { to: '/admin', label: 'Admin', icon: Shield },
  ];

  const signedOutPrimaryNavItems = [
    { to: '/auth', label: 'Sign In', icon: LogIn },
  ];

  const mobilePrimaryItems = [
    ...baseNavItems,
    ...(isSignedIn ? signedInPrimaryNavItems : signedOutPrimaryNavItems),
  ];

  const mobileOverflowItems = [
    ...(isSignedIn ? signedInOverflowNavItems : []),
    ...(isSignedIn && isAdmin ? adminNavItems : []),
  ];

  const visibleMobileItems = mobilePrimaryItems.slice(0, 6);
  const overflowMobileItems = mobileOverflowItems;
  const isOverflowActive = overflowMobileItems.some(({ to }) => location.pathname === to || location.pathname.startsWith(`${to}/`));
  const hasMoreOptions = overflowMobileItems.length > 0 || isSignedIn;

  return (
    <>
      <motion.nav
        className="top-nav"
        initial={isMobile ? false : { y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={reduceMotion ? { duration: 0.16 } : { type: 'spring', stiffness: 380, damping: 32, mass: 0.85 }}
      >
        <div className="top-nav__row">
          <NavLink to="/" className="top-nav__brand" onClick={() => setMobileMoreOpen(false)}>
            <span className="brand-title">Campus Unifyr</span>
          </NavLink>

          <div className="top-nav__links">
            <NavItems
              onClose={() => setMobileMoreOpen(false)}
              isAdmin={isAdmin}
              unreadNotificationCount={unreadNotificationCount}
              unreadMessageCount={unreadMessageCount}
            />
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
          </div>
        </div>
      </motion.nav>

      {location.pathname === '/' && (
        <div className="mobile-page-logo">
          <NavLink to="/" className="mobile-page-logo__brand" onClick={() => setMobileMoreOpen(false)}>
            <span className="brand-title">Campus Unifyr</span>
          </NavLink>
        </div>
      )}

      <AnimatePresence>
        <motion.nav
          className="mobile-pill-nav"
          initial={isMobile ? { y: 40, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={reduceMotion ? { duration: 0.16 } : { type: 'spring', stiffness: 420, damping: 32 }}
        >
          {visibleMobileItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `mobile-pill-nav__item${isActive ? ' active' : ''}`}
                onClick={() => setMobileMoreOpen(false)}
                aria-label={item.label}
              >
                <Icon size={19} />
                {item.to === '/notifications' && <NotificationBadge count={unreadNotificationCount} />}
                {item.to === '/messages' && <NotificationBadge count={unreadMessageCount} tone="danger" />}
                <span className="mobile-pill-nav__label">{item.label}</span>
              </NavLink>
            );
          })}

          {hasMoreOptions && (
            <button
              type="button"
              className={`mobile-pill-nav__item mobile-pill-nav__item--more${mobileMoreOpen || isOverflowActive ? ' active' : ''}`}
              onClick={() => setMobileMoreOpen((value) => !value)}
              aria-label="More options"
              aria-expanded={mobileMoreOpen}
            >
              <MoreHorizontal size={19} />
              <span className="mobile-pill-nav__label">More</span>
            </button>
          )}
        </motion.nav>

        <AnimatePresence>
          {mobileMoreOpen && hasMoreOptions && (
            <motion.div
              className="mobile-pill-nav__more-sheet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={reduceMotion ? { duration: 0.16 } : { type: 'spring', stiffness: 420, damping: 30 }}
            >
              <div className="mobile-pill-nav__more-head">More Options</div>
              {overflowMobileItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `mobile-pill-nav__more-item${isActive ? ' active' : ''}`}
                    onClick={() => setMobileMoreOpen(false)}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              <SignedIn>
                <div className="mobile-pill-nav__more-profile">
                  <div className="mobile-pill-nav__more-profile-label">
                    <User size={14} />
                    <span>Profile</span>
                  </div>
                  <UserButton afterSignOutUrl="/">
                    <UserButton.MenuItems>
                      <UserButton.Action label="signOut" />
                    </UserButton.MenuItems>
                  </UserButton>
                </div>
              </SignedIn>
            </motion.div>
          )}
        </AnimatePresence>

        {mobileMoreOpen && <div className="mobile-pill-nav__scrim" onClick={() => setMobileMoreOpen(false)} aria-hidden="true" />}
      </AnimatePresence>

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
