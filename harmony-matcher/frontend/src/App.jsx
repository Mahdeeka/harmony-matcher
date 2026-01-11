import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { SocketProvider } from './contexts/SocketContext';
import { MessagingProvider } from './contexts/MessagingContext';

// Pages
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import EventManager from './pages/EventManager';
import AdminAttendeeMatches from './pages/AdminAttendeeMatches';
import EventAnalytics from './pages/EventAnalytics';
import EventChallenges from './pages/EventChallenges';
import AttendeeLogin from './pages/AttendeeLogin';
import AttendeeMatches from './pages/AttendeeMatches';

// Global components
import PWAInstallPrompt from './components/PWAInstallPrompt';

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <SocketProvider>
            <MessagingProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <Routes>
                  {/* Home / Landing */}
                  <Route path="/" element={<Home />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/event/:eventId" element={<EventManager />} />
                  <Route path="/admin/event/:eventId/analytics" element={<EventAnalytics />} />
                  <Route path="/admin/event/:eventId/challenges" element={<EventChallenges />} />
                  <Route path="/admin/event/:eventId/attendee/:attendeeId" element={<AdminAttendeeMatches />} />

                  {/* Attendee Routes */}
                  <Route path="/event/:eventId" element={<AttendeeLogin />} />
                  <Route path="/event/:eventId/login" element={<AttendeeLogin />} />
                  <Route path="/event/:eventId/matches" element={<AttendeeMatches />} />
                </Routes>

                <PWAInstallPrompt />
              </div>
            </MessagingProvider>
          </SocketProvider>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
