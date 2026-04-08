import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from '@clerk/clerk-react';
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
import { API_ORIGIN } from './api/axios';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import useIsMobile from './hooks/useIsMobile';

const ProtectedRoute = ({ children }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut><RedirectToSignIn /></SignedOut>
  </>
);

const AppContent = () => {
  const [homeRefreshToken, setHomeRefreshToken] = useState(0);
  const [socket, setSocket] = useState(null);
  const { isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { addNotification, markNotificationRead, unreadCount, unreadMessageCount } = useNotifications();
  const isChatSessionRoute = location.pathname.startsWith('/messages/');
  const hideNavbarForMobileChat = isMobile && isChatSessionRoute;

  useEffect(() => {
    if (!isSignedIn) return undefined;

    let socketInstance;
    const initSocket = async () => {
      const token = await getToken();
      socketInstance = io(API_ORIGIN, {
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

      setSocket(socketInstance);
    };

    initSocket();

    return () => {
      socketInstance?.disconnect();
    };
  }, [isSignedIn, getToken, navigate, addNotification, markNotificationRead]);

  return (
    <div className="app-shell">
      {!hideNavbarForMobileChat && (
        <Navbar
          onTeamCreated={() => setHomeRefreshToken((value) => value + 1)}
          unreadNotificationCount={unreadCount}
          unreadMessageCount={unreadMessageCount}
        />
      )}
      <main className={`app-container${hideNavbarForMobileChat ? ' app-container--chat-mobile' : ''}`}>
        <Routes>
          <Route path="/" element={<HomeView refreshToken={homeRefreshToken} />} />
          <Route path="/auth/*" element={<AuthView />} />
          <Route path="/events/active" element={<ActiveEventsView />} />
          <Route path="/recommendations" element={<RecommendationsView />} />
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
