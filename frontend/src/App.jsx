import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import DeveloperBackground from './components/canvas/DeveloperBackground';
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
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function PrivateRoute({ children, adminOnly = false }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');

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
          path="/applicant"
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
  return (
    <Router>
      <ErrorBoundary>
        <SmoothScroll>
          <div className="app">
            <Cursor />
            <DeveloperBackground />
            <Navbar />
            <AnimatedRoutes />
          </div>
        </SmoothScroll>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
