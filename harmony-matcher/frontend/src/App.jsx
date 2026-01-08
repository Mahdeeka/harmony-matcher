import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import EventManager from './pages/EventManager';
import AttendeeLogin from './pages/AttendeeLogin';
import AttendeeMatches from './pages/AttendeeMatches';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Home / Landing */}
        <Route path="/" element={<Home />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/event/:eventId" element={<EventManager />} />
        
        {/* Attendee Routes */}
        <Route path="/event/:eventId" element={<AttendeeLogin />} />
        <Route path="/event/:eventId/matches" element={<AttendeeMatches />} />
      </Routes>
    </div>
  );
}

export default App;
