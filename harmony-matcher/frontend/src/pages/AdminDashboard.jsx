import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Users, Calendar, CheckCircle, Clock, AlertCircle,
  Trash2, ExternalLink, ArrowLeft, TrendingUp, UserCheck, Edit2, MapPin, Loader2, RefreshCw, Trophy
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import axios from 'axios';
import GooglePlacesStreetInput from '../components/GooglePlacesStreetInput';

const ISRAELI_CITIES_AR = [
  'الناصرة', 'أم الفحم', 'اللد', 'الرملة', 'عكا', 'حيفا', 'يافا',
  'الطيبة', 'الطيرة', 'شفاعمرو', 'باقة الغربية', 'سخنين', 'عرابة',
  'كفر قاسم', 'كفر ياسيف', 'دير حنا', 'نحف', 'جت', 'مجد الكروم',
  'عين ماهل', 'يافة', 'جسر الزرقاء', 'البعنة', 'دير الأسد', 'المكر',
  'طوبا', 'ساجور', 'أبو سنان', 'معليا', 'فسوطا', 'الجش', 'البقيعة'
].sort((a, b) => a.localeCompare(b, 'ar'));

function AdminDashboard() {
  const { showSuccess, showError } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', name_ar: '', date: '', location: '', street: '' });
  const [editingEvent, setEditingEvent] = useState(null);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [dropdownRect, setDropdownRect] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const locationInputRef = useRef(null);
  const modalRef = useRef(null);
  const navigate = useNavigate();

  const filteredCities = newEvent.location
    ? ISRAELI_CITIES_AR.filter((city) =>
        city.toLowerCase().includes(newEvent.location.toLowerCase())
      )
    : ISRAELI_CITIES_AR;

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteModal) {
          setShowDeleteModal(false);
          setEventToDelete(null);
        } else if (showEditModal) {
          setShowEditModal(false);
          setEditingEvent(null);
        } else if (showCreateModal) {
          setShowCreateModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showCreateModal, showEditModal, showDeleteModal]);

  useEffect(() => {
    if (showLocationSuggestions && locationInputRef.current) {
      const updateRect = () => {
        if (locationInputRef.current) {
          const rect = locationInputRef.current.getBoundingClientRect();
          setDropdownRect({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
        }
      };
      updateRect();
      window.addEventListener('scroll', updateRect, true);
      window.addEventListener('resize', updateRect);
      return () => {
        window.removeEventListener('scroll', updateRect, true);
        window.removeEventListener('resize', updateRect);
      };
    } else {
      setDropdownRect(null);
    }
  }, [showLocationSuggestions, filteredCities]);

  const fetchEvents = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    try {
      const response = await axios.get('/api/events');
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      showError('فشل في تحميل الفعاليات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createEvent = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await axios.post('/api/events', newEvent);
      setEvents([response.data.event, ...events]);
      setShowCreateModal(false);
      setNewEvent({ name: '', name_ar: '', date: '', location: '', street: '' });
      showSuccess('تم إنشاء الفعالية بنجاح');
      navigate(`/admin/event/${response.data.event.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      showError('فشل في إنشاء الفعالية');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setNewEvent({
      name: event.name || event.name_ar,
      name_ar: event.name_ar || event.name,
      date: event.date || '',
      location: event.location || '',
      street: event.street || ''
    });
    setShowEditModal(true);
  };

  const updateEvent = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;
    setUpdating(true);
    try {
      const response = await axios.patch(`/api/events/${editingEvent.id}`, {
        name: newEvent.name_ar,
        name_ar: newEvent.name_ar,
        date: newEvent.date || null,
        location: newEvent.location || null,
        street: newEvent.street || null
      });
      setEvents(events.map((ev) => ev.id === editingEvent.id ? response.data.event : ev));
      setShowEditModal(false);
      setEditingEvent(null);
      setNewEvent({ name: '', name_ar: '', date: '', location: '', street: '' });
      showSuccess('تم تحديث الفعالية بنجاح');
    } catch (error) {
      console.error('Error updating event:', error);
      showError('فشل في تحديث الفعالية');
    } finally {
      setUpdating(false);
    }
  };

  const openDeleteModal = (event) => {
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setEventToDelete(null);
  };

  const deleteEvent = async () => {
    if (!eventToDelete) return;
    setDeletingId(eventToDelete.id);
    try {
      await axios.delete(`/api/events/${eventToDelete.id}`);
      setEvents(events.filter((e) => e.id !== eventToDelete.id));
      showSuccess('تم حذف الفعالية بنجاح');
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting event:', error);
      showError('فشل في حذف الفعالية');
    } finally {
      setDeletingId(null);
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
          <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-top transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">Harmony Matcher</h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">لوحة التحكم الإدارية</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/admin/activities"
                className="btn-secondary flex items-center gap-2 min-h-[44px]"
              >
                <Trophy className="w-5 h-5" />
                مكتبة الأنشطة
              </Link>
              <button
                onClick={() => fetchEvents(true)}
                disabled={refreshing}
                className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 min-w-[44px] min-h-[44px]"
                title="تحديث"
                aria-label="تحديث القائمة"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary shadow-sm hover:shadow-md transition-shadow min-h-[44px]"
              >
                <Plus className="w-5 h-5" />
                فعالية جديدة
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8 safe-area-bottom">
        {/* Stats Overview */}
        {!loading && events.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card text-center dark:bg-gray-800 dark:border-gray-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{events.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي الفعاليات</div>
            </div>
            <div className="card text-center dark:bg-gray-800 dark:border-gray-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                {events.filter(e => e.matching_status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">فعاليات مكتملة</div>
            </div>
            <div className="card text-center dark:bg-gray-800 dark:border-gray-700">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {events.reduce((sum, e) => sum + (e.attendee_count || 0), 0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي المشاركين</div>
            </div>
            <div className="card text-center dark:bg-gray-800 dark:border-gray-700">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                {events.filter(e => e.matching_status === 'processing').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">قيد المعالجة</div>
            </div>
          </div>
        )}

        {/* Events Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">الفعاليات</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {events.length} فعالية
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card dark:bg-gray-800 dark:border-gray-700">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="card text-center py-16 dark:bg-gray-800 dark:border-gray-700">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-3">لا توجد فعاليات</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
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
              <div key={event.id} className="card hover:shadow-lg dark:shadow-none dark:hover:bg-gray-800/80 transition-all duration-300 group dark:bg-gray-800 dark:border-gray-700">
                {/* Event Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      {event.name_ar || event.name}
                    </h3>
                    {getStatusBadge(event.matching_status)}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => openEditModal(event)}
                      className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                      title="تعديل"
                      aria-label="تعديل الفعالية"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/event/${event.id}`}
                      target="_blank"
                      className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                      title="رابط المشاركين"
                      aria-label="فتح رابط المشاركين"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => openDeleteModal(event)}
                      disabled={deletingId === event.id}
                      className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                      title="حذف"
                      aria-label="حذف الفعالية"
                    >
                      {deletingId === event.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Event Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{event.attendee_count || 0} مشارك</span>
                  </div>
                  {event.date && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(event.date).toLocaleDateString('ar-EG')}</span>
                    </div>
                  )}
                  {(event.location || event.street) && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="truncate block">
                          {[event.street, event.location].filter(Boolean).join('، ')}
                        </span>
                        {(event.location || event.street) && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.street, event.location].filter(Boolean).join(', '))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline text-xs mt-0.5 inline-flex items-center gap-1"
                          >
                            عرض على الخريطة
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Link
                  to={`/admin/event/${event.id}`}
                  className="btn-secondary w-full flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-600 dark:group-hover:text-white transition-all"
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
          <div ref={modalRef} className="modal-content max-w-lg max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">فعالية جديدة</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              أدخل بيانات الفعالية. يمكنك إضافة المشاركين وتشغيل المطابقة لاحقاً من صفحة إدارة الفعالية.
            </p>

            <form onSubmit={createEvent} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم الفعالية (بالعربية) *
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={newEvent.name_ar}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name_ar: e.target.value, name: e.target.value }))}
                  className="input h-12 text-right"
                  placeholder="مثال: لقاء التواصل الشهري"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الموقع
                </label>
                <input
                  ref={locationInputRef}
                  type="text"
                  dir="rtl"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  onFocus={() => setShowLocationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                  className="input h-12 min-h-0 text-right"
                  placeholder="مثال: الناصرة، حيفا، القدس..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الشارع <span className="text-gray-400 font-normal">(اختياري)</span>
                </label>
                <GooglePlacesStreetInput
                  value={newEvent.street}
                  onChange={(street) => setNewEvent(prev => ({ ...prev, street }))}
                  className="input h-12 min-h-0"
                  placeholder="ابحث عن العنوان..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  التاريخ
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                  className="input h-12 w-full"
                />
              </div>

              {showLocationSuggestions && filteredCities.length > 0 && dropdownRect && createPortal(
                <div
                  className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl z-[9999] overflow-hidden"
                  style={{
                    top: dropdownRect.top,
                    left: dropdownRect.left,
                    width: dropdownRect.width,
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}
                >
                  {filteredCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-100 text-sm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNewEvent((prev) => ({ ...prev, location: city }));
                        setShowLocationSuggestions(false);
                      }}
                    >
                      {city}
                    </button>
                  ))}
                </div>,
                document.body
              )}

              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 py-3.5 rounded-xl font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    'إنشاء الفعالية'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="btn-ghost flex-1 py-3.5 rounded-xl disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <div className="modal-backdrop" onClick={() => { setShowEditModal(false); setEditingEvent(null); }}>
          <div className="modal-content max-w-lg max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">تعديل الفعالية</h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingEvent(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <form onSubmit={updateEvent} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم الفعالية (بالعربية) *
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={newEvent.name_ar}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name_ar: e.target.value, name: e.target.value }))}
                  className="input h-12 text-right"
                  placeholder="مثال: لقاء التواصل الشهري"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الموقع
                </label>
                <input
                  ref={locationInputRef}
                  type="text"
                  dir="rtl"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  onFocus={() => setShowLocationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                  className="input h-12 min-h-0 text-right"
                  placeholder="مثال: الناصرة، حيفا، القدس..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الشارع <span className="text-gray-400 font-normal">(اختياري)</span>
                </label>
                <GooglePlacesStreetInput
                  value={newEvent.street}
                  onChange={(street) => setNewEvent(prev => ({ ...prev, street }))}
                  className="input h-12 min-h-0"
                  placeholder="ابحث عن العنوان..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  التاريخ
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                  className="input h-12 w-full"
                />
              </div>

              {showLocationSuggestions && filteredCities.length > 0 && dropdownRect && createPortal(
                <div
                  className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl z-[9999] overflow-hidden"
                  style={{
                    top: dropdownRect.top,
                    left: dropdownRect.left,
                    width: dropdownRect.width,
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}
                >
                  {filteredCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-100 text-sm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNewEvent((prev) => ({ ...prev, location: city }));
                        setShowLocationSuggestions(false);
                      }}
                    >
                      {city}
                    </button>
                  ))}
                </div>,
                document.body
              )}

              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary flex-1 py-3.5 rounded-xl font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    'حفظ التغييرات'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingEvent(null); }}
                  disabled={updating}
                  className="btn-ghost flex-1 py-3 disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && eventToDelete && (
        <div className="modal-backdrop" onClick={closeDeleteModal}>
          <div className="modal-content max-w-md dark:bg-gray-800 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">حذف الفعالية</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  هل أنت متأكد من حذف &quot;{eventToDelete.name_ar || eventToDelete.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={deleteEvent}
                disabled={deletingId === eventToDelete.id}
                className="flex-1 py-3 rounded-xl font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {deletingId === eventToDelete.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  'حذف'
                )}
              </button>
              <button
                onClick={closeDeleteModal}
                disabled={deletingId === eventToDelete.id}
                className="flex-1 btn-ghost py-3 disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
