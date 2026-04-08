import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import { Toaster, toast } from 'react-hot-toast';
import io from 'socket.io-client';
import Navbar from './components/layout/Navbar';
import HomeView from './views/HomeView';
import AuthView from './views/AuthView';
import RadarView from './views/RadarView';
import ManageView from './views/ManageView';
import JoinTeamView from './views/JoinTeamView';
import MessagesView from './views/MessagesView';
import { ChatProvider, useChat } from './context/ChatContext';
import ChatDrawer from './components/common/ChatDrawer';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';

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
  const { isOpen, closeChat, activeSessionId, partner, openChat } = useChat();

  // Use refs for variables inside listeners to avoid re-initializing socket on every state change
  const chatStateRef = useRef({ isOpen, activeSessionId });
  useEffect(() => {
    chatStateRef.current = { isOpen, activeSessionId };
  }, [isOpen, activeSessionId]);

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
        toast.success(
          (t) => (
            <div onClick={() => { toast.dismiss(t.id); openChat(data.sessionId); }} style={{ cursor: 'pointer' }}>
              <div style={{ fontWeight: 700 }}>{data.title}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{data.message}</div>
            </div>
          ),
          { duration: 6000, icon: '🎉' }
        );
      });

      socketInstance.on('notification:message', (data) => {
        const { isOpen: currentIsOpen, activeSessionId: currentActiveId } = chatStateRef.current;
        // Only show toast if chat is closed or referring to a different session
        if (!currentIsOpen || currentActiveId !== data.sessionId) {
          toast(
            (t) => (
              <div onClick={() => { toast.dismiss(t.id); openChat(data.sessionId); }} style={{ cursor: 'pointer' }}>
                <div style={{ fontWeight: 700 }}>{data.title}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{data.message}</div>
              </div>
            ),
            { duration: 4000, icon: '💬' }
          );
        }
      });

      setSocket(socketInstance);
    };

    initSocket();

    return () => {
      socketInstance?.disconnect();
    };
  }, [isSignedIn, getToken, openChat]);

  return (
    <div className="app-shell">
      <Navbar onTeamCreated={() => setHomeRefreshToken((value) => value + 1)} />
      <main className="app-container">
        <Routes>
          <Route path="/" element={<HomeView refreshToken={homeRefreshToken} />} />
          <Route path="/auth/*" element={<AuthView />} />
          <Route
            path="/ready"
            element={
              <ProtectedRoute>
                <RadarView globalSocket={socket} />
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
        </Routes>
      </main>

      <ChatDrawer
        isOpen={isOpen}
        onClose={closeChat}
        sessionId={activeSessionId}
        partner={partner}
        socket={socket}
      />

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
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  </BrowserRouter>
);

export default App;
