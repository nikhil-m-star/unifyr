import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import Navbar from './components/layout/Navbar';
import HomeView from './views/HomeView';
import AuthView from './views/AuthView';
import RadarView from './views/RadarView';
import TeammatesView from './views/TeammatesView';
import ManageView from './views/ManageView';
import JoinTeamView from './views/JoinTeamView';

const ProtectedRoute = ({ children }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut><RedirectToSignIn /></SignedOut>
  </>
);

const App = () => {
  const [homeRefreshToken, setHomeRefreshToken] = useState(0);

  return (
    <BrowserRouter>
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
                  <RadarView />
                </ProtectedRoute>
              }
            />
            <Route path="/teammates" element={<TeammatesView />} />
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
