import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Import the actual page components
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import EventManager from './pages/EventManager';
import AdminAttendeeMatches from './pages/AdminAttendeeMatches';
import EventAnalytics from './pages/EventAnalytics';

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <Routes>
                  {/* Home / Landing */}
                  <Route path="/" element={<Home />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/event/:eventId" element={<EventManager />} />
                  <Route path="/admin/event/:eventId/analytics" element={<EventAnalytics />} />
                  <Route path="/admin/event/:eventId/attendee/:attendeeId" element={<AdminAttendeeMatches />} />
                </Routes>
          </div>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
