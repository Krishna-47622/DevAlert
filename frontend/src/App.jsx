import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import GlowCursor from './components/GlowCursor';
import PageTransition from './components/PageTransition';
import LandingPage from './pages/LandingPage';
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
import Tracker from './pages/Tracker';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Footer from './components/Footer';
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

/* Landing page shown at "/" for guests, Dashboard for authenticated */
function HomeRoute() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) { /* ignore */ }

  if (user) {
    return <PageTransition><Dashboard /></PageTransition>;
  }
  return <PageTransition><LandingPage /></PageTransition>;
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
        <Route path="/help" element={<PageTransition><HelpPage /></PageTransition>} />
        <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
        <Route path="/" element={<HomeRoute />} />
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
        <Route
          path="/tracker"
          element={
            <PrivateRoute>
              <PageTransition><Tracker /></PageTransition>
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
  return (
    <Router>
      <div className="app">
        <GlowCursor />
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
