import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { Toaster, toast } from 'react-hot-toast';
import io from 'socket.io-client';
import Navbar from './components/layout/Navbar';
import HomeView from './views/HomeView';
import AuthView from './views/AuthView';
import ManageView from './views/ManageView';
import JoinTeamView from './views/JoinTeamView';
import MessagesView from './views/MessagesView';
import ChatSessionView from './views/ChatSessionView';
import NotificationsView from './views/NotificationsView';
import RecommendationsView from './views/RecommendationsView';
import ActiveEventsView from './views/ActiveEventsView';
import AdminView from './views/AdminView';
import RadarView from './views/RadarView';
import { getApiOrigin } from './api/axios';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import useIsMobile from './hooks/useIsMobile';

const ProtectedRoute = ({ children }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut><RedirectToSignIn /></SignedOut>
  </>
);

const SITE_NAME = 'Campus Unifyr';

const upsertMeta = ({ selector, attributes }) => {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== 'content') tag.setAttribute(key, value);
    });
    document.head.appendChild(tag);
  }
  if (attributes.content) tag.setAttribute('content', attributes.content);
};

const setCanonical = (href) => {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', href);
};

const seoConfigForPath = (pathname) => {
  if (pathname === '/events/active') {
    return {
      title: 'Active Events | Campus Unifyr',
      description: 'Browse live campus events, competitions, workshops, and performances at BMSCE on Campus Unifyr.',
      robots: 'index, follow',
    };
  }

  if (pathname === '/recommendations') {
    return {
      title: 'Event Recommendations | Campus Unifyr',
      description: 'Get AI-powered campus event recommendations based on your interests and discover the best activities for you.',
      robots: 'index, follow',
    };
  }

  if (pathname.startsWith('/auth') || pathname.startsWith('/manage') || pathname.startsWith('/messages') || pathname.startsWith('/notifications') || pathname.startsWith('/admin')) {
    return {
      title: `${SITE_NAME} — Find Your Dream Team`,
      description: 'Campus Unifyr — The premium campus collaboration platform. Find teammates and discover events.',
      robots: 'noindex, nofollow',
    };
  }

  return {
    title: `${SITE_NAME} — Find Your Dream Team`,
    description: 'Campus Unifyr — The premium campus collaboration platform. Find teammates, discover events, and build winning projects together.',
    robots: 'index, follow',
  };
};

const AppContent = () => {
  const [homeRefreshToken, setHomeRefreshToken] = useState(0);
  const [socket, setSocket] = useState(null);
  const { isSignedIn, getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { addNotification, markNotificationRead, unreadCount, unreadMessageCount } = useNotifications();
  const isChatSessionRoute = location.pathname.startsWith('/messages/');
  const isMessagesHubRoute = location.pathname === '/messages';
  const isImmersiveRoute = isChatSessionRoute || isMessagesHubRoute;
  const hideNavbar = isChatSessionRoute;
  const hasTriggeredDomainSignOut = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasTriggeredDomainSignOut.current) {
      if (!isSignedIn) {
        hasTriggeredDomainSignOut.current = false;
      }
      return;
    }

    const primaryEmail = (user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '').toLowerCase();
    if (primaryEmail && !primaryEmail.endsWith('@bmsce.ac.in')) {
      hasTriggeredDomainSignOut.current = true;
      toast.error('Please use an email with bmsce.ac.in.', { duration: 5000 });
      setTimeout(() => {
        signOut({ redirectUrl: '/auth' });
      }, 5000);
    }
  }, [isLoaded, isSignedIn, user, signOut]);

  useEffect(() => {
    const { title, description, robots } = seoConfigForPath(location.pathname);
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${location.pathname}`;
    const socialImage = `${origin}/favicon.svg`;

    document.title = title;
    setCanonical(canonicalUrl);

    upsertMeta({
      selector: 'meta[name="description"]',
      attributes: { name: 'description', content: description },
    });
    upsertMeta({
      selector: 'meta[name="robots"]',
      attributes: { name: 'robots', content: robots },
    });
    upsertMeta({
      selector: 'meta[property="og:title"]',
      attributes: { property: 'og:title', content: title },
    });
    upsertMeta({
      selector: 'meta[property="og:description"]',
      attributes: { property: 'og:description', content: description },
    });
    upsertMeta({
      selector: 'meta[property="og:url"]',
      attributes: { property: 'og:url', content: canonicalUrl },
    });
    upsertMeta({
      selector: 'meta[property="og:image"]',
      attributes: { property: 'og:image', content: socialImage },
    });
    upsertMeta({
      selector: 'meta[name="twitter:title"]',
      attributes: { name: 'twitter:title', content: title },
    });
    upsertMeta({
      selector: 'meta[name="twitter:description"]',
      attributes: { name: 'twitter:description', content: description },
    });
    upsertMeta({
      selector: 'meta[name="twitter:image"]',
      attributes: { name: 'twitter:image', content: socialImage },
    });
  }, [location.pathname]);

  useEffect(() => {
    if (!isSignedIn) return undefined;

    let socketInstance;
    const initSocket = async () => {
      const token = await getToken();
      socketInstance = io(getApiOrigin(), {
        auth: { token },
        transports: ['websocket'],
      });

      socketInstance.on('notification:acceptance', (data) => {
        const notificationId = addNotification({
          type: data.type,
          title: data.title,
          message: data.message,
          sessionId: data.sessionId,
          timestamp: data.timestamp,
        });

        toast.success(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                markNotificationRead(notificationId);
                navigate(`/messages/${data.sessionId}`);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 700 }}>{data.title}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{data.message}</div>
            </div>
          ),
          { duration: 6000, icon: '🎉' }
        );
      });

      socketInstance.on('notification:message', (data) => {
        const notificationId = addNotification({
          type: data.type,
          title: data.title,
          message: data.message,
          sessionId: data.sessionId,
          timestamp: data.timestamp,
        });

        // Suppress notification if currently in the same chat session
        const currentChatSessionId = window.location.pathname.startsWith('/messages/') 
          ? window.location.pathname.split('/').pop() 
          : null;

        if (currentChatSessionId && Number(currentChatSessionId) === Number(data.sessionId)) {
          return;
        }
        toast(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                markNotificationRead(notificationId);
                navigate(`/messages/${data.sessionId}`);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 700 }}>{data.title}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{data.message}</div>
            </div>
          ),
          { duration: 4000, icon: '💬' }
        );
      });
      
      socketInstance.on('notification:join_request', (data) => {
        addNotification({
          type: 'new_join_request',
          title: data.title,
          message: data.message,
          timestamp: data.timestamp,
        });

        toast(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/manage');
              }}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 700 }}>{data.title}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{data.message}</div>
            </div>
          ),
          { duration: 6000, icon: '📩' }
        );
      });

      setSocket(socketInstance);
    };

    initSocket();

    return () => {
      socketInstance?.disconnect();
    };
  }, [isSignedIn, getToken, navigate, addNotification, markNotificationRead]);

  return (
    <div className="app-shell">
      {!hideNavbar && (
        <Navbar
          onTeamCreated={() => setHomeRefreshToken((value) => value + 1)}
          unreadNotificationCount={unreadCount}
          unreadMessageCount={unreadMessageCount}
        />
      )}
      <main className={`app-container${
        isImmersiveRoute ? ' app-container--immersive' : ''
      }${hideNavbar ? ' app-container--chat-mobile' : ''}`}>
        <Routes>
          <Route path="/" element={<HomeView refreshToken={homeRefreshToken} />} />
          <Route path="/auth/*" element={<AuthView />} />
          <Route path="/events/active" element={<ActiveEventsView />} />
          <Route path="/recommendations" element={<RecommendationsView />} />
          <Route
            path="/ready"
            element={
              <ProtectedRoute>
                <RadarView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage"
            element={
              <ProtectedRoute>
                <ManageView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teammates/:teamId/join"
            element={
              <ProtectedRoute>
                <JoinTeamView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:sessionId"
            element={
              <ProtectedRoute>
                <ChatSessionView socket={socket} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminView />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(20, 20, 25, 0.9)',
            color: '#fff',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '12px 18px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          },
        }}
      />
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  </BrowserRouter>
);

export default App;
