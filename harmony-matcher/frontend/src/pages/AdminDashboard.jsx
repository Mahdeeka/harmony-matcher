import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Users, Calendar, CheckCircle, Clock, AlertCircle,
  Trash2, ExternalLink, ArrowLeft
} from 'lucide-react';
import axios from 'axios';

function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', name_ar: '', date: '', location: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/api/events');
      setEvents(response.data.events);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/events', newEvent);
      setEvents([response.data.event, ...events]);
      setShowCreateModal(false);
      setNewEvent({ name: '', name_ar: '', date: '', location: '' });
      navigate(`/admin/event/${response.data.event.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const deleteEvent = async (eventId) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفعالية؟')) return;
    
    try {
      await axios.delete(`/api/events/${eventId}`);
      setEvents(events.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            مكتمل
          </span>
        );
      case 'processing':
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <Clock className="w-4 h-4" />
            قيد المعالجة
          </span>
        );
      case 'failed':
        return (
          <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            فشل
          </span>
        );
      default:
        return (
          <span className="badge bg-gray-100 text-gray-700 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            في الانتظار
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-harmony-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Harmony Matcher</h1>
                  <p className="text-gray-500 text-sm">لوحة التحكم</p>
                </div>
              </Link>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5" />
              فعالية جديدة
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">الفعاليات</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد فعاليات</h3>
            <p className="text-gray-500 mb-6">ابدأ بإنشاء فعالية جديدة</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mx-auto"
            >
              <Plus className="w-5 h-5" />
              إنشاء فعالية
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map((event) => (
              <div key={event.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {event.name_ar || event.name}
                      </h3>
                      {getStatusBadge(event.matching_status)}
                    </div>
                    <div className="flex items-center gap-4 text-gray-500 text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.attendee_count || 0} مشارك
                      </span>
                      {event.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(event.date).toLocaleDateString('ar-EG')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/event/${event.id}`}
                      target="_blank"
                      className="p-2 text-gray-400 hover:text-harmony-600 transition-colors"
                      title="رابط المشاركين"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <Link
                      to={`/admin/event/${event.id}`}
                      className="btn-secondary"
                    >
                      إدارة
                      <ArrowLeft className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 fade-in">
            <h3 className="text-xl font-bold text-gray-900 mb-6">فعالية جديدة</h3>
            <form onSubmit={createEvent}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الفعالية (بالعربية)
                  </label>
                  <input
                    type="text"
                    value={newEvent.name_ar}
                    onChange={(e) => setNewEvent({ ...newEvent, name_ar: e.target.value, name: e.target.value })}
                    className="input"
                    placeholder="مثال: لقاء التواصل الشهري"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الموقع
                  </label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="input"
                    placeholder="مثال: تل أبيب"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn-primary flex-1">
                  إنشاء
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
