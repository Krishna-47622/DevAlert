import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import LiquidEther from './components/ui/LiquidEther';
// import DeveloperBackground from './components/canvas/DeveloperBackground';
// import DistortedSphere from './components/canvas/DistortedSphere';
import SmoothScroll from './components/SmoothScroll';
import Cursor from './components/Cursor';
import PageTransition from './components/PageTransition';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPage from './pages/AdminPage';
import ApplicantPage from './pages/ApplicantPage';
import ApplicantsPage from './pages/ApplicantsPage';
import HostEventPage from './pages/HostEventPage';
import ApplicationPage from './pages/ApplicationPage';
import NotificationsPage from './pages/NotificationsPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import AccountSettings from './pages/AccountSettings';
import AboutPage from './pages/AboutPage';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function PrivateRoute({ children, adminOnly = false }) {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    console.error("Error parsing user from localStorage", e);
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return children;
}





function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password/:token" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/verify-email/:token" element={<PageTransition><VerifyEmail /></PageTransition>} />
        <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <PageTransition><Dashboard /></PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute adminOnly>
              <PageTransition><AdminPage /></PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/opportunities"
          element={
            <PrivateRoute>
              <PageTransition><ApplicantPage /></PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/applicants"
          element={
            <PrivateRoute>
              <PageTransition><ApplicantsPage /></PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/host-event"
          element={
            <PrivateRoute>
              <PageTransition><HostEventPage /></PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <PageTransition><NotificationsPage /></PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <PageTransition><AccountSettings /></PageTransition>
            </PrivateRoute>
          }
        />
        <Route path="/apply/:type/:id" element={<PageTransition><ApplicationPage /></PageTransition>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    // Force dark mode
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  return (
    <Router>
      <div className="app">
        {/* <Cursor /> */}
        <div style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: -1
        }}>
          <LiquidEther
            colors={['#5227FF', '#FF9FFC', '#B19EEF']}
            mouseForce={20}
            cursorSize={100}
            isViscous
            viscous={10}
            iterationsViscous={10}
            iterationsPoisson={10}
            resolution={0.2}
            isBounce={false}
            autoDemo
            autoSpeed={0.5}
            autoIntensity={2.2}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
            color0="#5227FF"
            color1="#FF9FFC"
            color2="#B19EEF"
          />
        </div>
        <Navbar />
        <div className="main-content">
          <AnimatedRoutes />
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
