import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Users, Calendar, CheckCircle, Clock, AlertCircle,
  Trash2, ExternalLink, ArrowLeft, TrendingUp, UserCheck
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import axios from 'axios';

function AdminDashboard() {
  const { showSuccess, showError } = useToast();
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
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      showError('فشل في تحميل الفعاليات');
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
      showSuccess('تم إنشاء الفعالية بنجاح');
      navigate(`/admin/event/${response.data.event.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      showError('فشل في إنشاء الفعالية');
    }
  };

  const deleteEvent = async (eventId) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفعالية؟')) return;

    try {
      await axios.delete(`/api/events/${eventId}`);
      setEvents(events.filter(e => e.id !== eventId));
      showSuccess('تم حذف الفعالية بنجاح');
    } catch (error) {
      console.error('Error deleting event:', error);
      showError('فشل في حذف الفعالية');
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
    <div className="min-h-screen bg-gray-50 safe-area-top">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Harmony Matcher</h1>
                  <p className="text-gray-500 text-sm">لوحة التحكم الإدارية</p>
                </div>
              </Link>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary shadow-sm hover:shadow-md transition-shadow"
            >
              <Plus className="w-5 h-5" />
              فعالية جديدة
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8 safe-area-bottom">
        {/* Stats Overview */}
        {!loading && events.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{events.length}</div>
              <div className="text-sm text-gray-500">إجمالي الفعاليات</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {events.filter(e => e.matching_status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500">فعاليات مكتملة</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {events.reduce((sum, e) => sum + (e.attendee_count || 0), 0)}
              </div>
              <div className="text-sm text-gray-500">إجمالي المشاركين</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {events.filter(e => e.matching_status === 'processing').length}
              </div>
              <div className="text-sm text-gray-500">قيد المعالجة</div>
            </div>
          </div>
        )}

        {/* Events Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">الفعاليات</h2>
          <div className="text-sm text-gray-500">
            {events.length} فعالية
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-3">لا توجد فعاليات</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              ابدأ رحلتك في إنشاء فعاليات التواصل المهني مع Harmony Matcher
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mx-auto flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              إنشاء أول فعالية
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="card hover:shadow-lg transition-all duration-300 group">
                {/* Event Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 truncate group-hover:text-blue-700 transition-colors">
                      {event.name_ar || event.name}
                    </h3>
                    {getStatusBadge(event.matching_status)}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Link
                      to={`/event/${event.id}`}
                      target="_blank"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="رابط المشاركين"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Event Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{event.attendee_count || 0} مشارك</span>
                  </div>
                  {event.date && (
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(event.date).toLocaleDateString('ar-EG')}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <div className="w-4 h-4 rounded-full bg-gray-200"></div>
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Link
                  to={`/admin/event/${event.id}`}
                  className="btn-secondary w-full flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white transition-all"
                >
                  إدارة الفعالية
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">فعالية جديدة</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={createEvent} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الفعالية (بالعربية) *
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الموقع
                </label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="input"
                  placeholder="مثال: تل أبيب، القدس، حيفا"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn-primary flex-1 py-3"
                >
                  إنشاء الفعالية
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost flex-1 py-3"
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
