import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight, Users, Sparkles, CheckCircle, Clock,
  Plus, Trash2, Edit2, Download, Send, ExternalLink, RefreshCw,
  FileSpreadsheet, Globe, Eye, BarChart3, Trophy, X,
  Settings2, ToggleLeft, ToggleRight
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import FileUpload from '../components/FileUpload';
import SkeletonLoader from '../components/SkeletonLoader';

function EventManager() {
  const { eventId } = useParams();
  const { showSuccess, showError, showInfo } = useToast();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [matchingStatus, setMatchingStatus] = useState({ status: 'pending', processed: 0, total: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [metricsConfig, setMetricsConfig] = useState(null);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [pendingRegenerate, setPendingRegenerate] = useState(false);
  const [newAttendee, setNewAttendee] = useState({
    name: '', phone: '', email: '', title: '', company: '',
    professional_bio: '', skills: '', looking_for: '', offering: ''
  });

  useEffect(() => {
    fetchEvent();
    fetchAttendees();
    fetchMatchingStatus();
  }, [eventId]);

  useEffect(() => {
    // Poll matching status if processing
    const isProcessing = matchingStatus.status === 'processing' || matchingStatus.status === 'running';
    if (isProcessing) {
      const interval = setInterval(fetchMatchingStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [matchingStatus.status]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}`);
      setEvent(response.data.event);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchAttendees = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}/attendees`);
      setAttendees(response.data.attendees ?? []);
    } catch (error) {
      console.error('Error fetching attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchingStatus = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}/matching-status`);
      setMatchingStatus(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const fetchHarmonyMembers = () => {
    showInfo('استيراد أعضاء Harmony غير متوفر حالياً. يمكنك استيراد المشاركين عبر ملف Excel أو الإضافة اليدوية.');
  };

  const downloadTemplate = async () => {
    try {
      const response = await axios.get('/api/template/attendees', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'harmony-matcher-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('تم تحميل القالب بنجاح');
    } catch (error) {
      showError('فشل في تحميل القالب');
    }
  };

  const handleFileUpload = async (file, formData) => {
    if (!file || !formData) return;

    setUploading(true);
    try {
      const response = await axios.post(`/api/events/${eventId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showSuccess(response.data.message);
      fetchAttendees();
    } catch (error) {
      showError(error.response?.data?.error || 'فشل في رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const openMetricsModal = async (regenerate = false) => {
    setPendingRegenerate(regenerate);
    try {
      if (!metricsConfig) {
        const response = await axios.get('/api/matching-metrics');
        setMetricsConfig(response.data.metrics);
        setSelectedMetrics(response.data.defaults);
      }
      setShowMetricsModal(true);
    } catch (error) {
      showError('فشل في تحميل إعدادات المطابقة');
    }
  };

  const toggleMetric = (key) => {
    setSelectedMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const confirmMatching = async () => {
    if (selectedMetrics.length === 0) {
      showError('يجب اختيار معيار واحد على الأقل');
      return;
    }
    setShowMetricsModal(false);
    try {
      await axios.post(`/api/events/${eventId}/generate-matches`, {
        regenerate: pendingRegenerate,
        metrics: selectedMetrics
      });
      setMatchingStatus({ ...matchingStatus, status: 'processing' });
      showInfo(pendingRegenerate ? 'بدأت إعادة المطابقة بالذكاء الاصطناعي' : 'بدأت عملية المطابقة بالذكاء الاصطناعي');
    } catch (error) {
      showError('فشل في بدء المطابقة');
    }
  };

  const cancelMatching = async () => {
    if (!confirm('هل أنت متأكد من إلغاء عملية المطابقة؟ سيتم إيقاف العملية فوراً.')) return;

    try {
      await axios.post(`/api/events/${eventId}/cancel-matching`);
      showSuccess('تم إلغاء عملية المطابقة بنجاح');
      fetchMatchingStatus(); // Refresh status
    } catch (error) {
      showError(error.response?.data?.error || 'فشل في إلغاء المطابقة');
    }
  };

  const addAttendee = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/events/${eventId}/attendees`, newAttendee);
      setShowAddModal(false);
      setNewAttendee({
        name: '', phone: '', email: '', title: '', company: '',
        professional_bio: '', skills: '', looking_for: '', offering: ''
      });
      fetchAttendees();
      showSuccess('تم إضافة المشارك بنجاح');
    } catch (error) {
      showError(error.response?.data?.error || 'فشل في إضافة المشارك');
    }
  };

  const deleteAttendee = async (attendeeId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المشارك؟')) return;
    try {
      await axios.delete(`/api/attendees/${attendeeId}`);
      fetchAttendees();
      showSuccess('تم حذف المشارك بنجاح');
    } catch (error) {
      showError('فشل في حذف المشارك');
    }
  };

  const copyEventLink = () => {
    const link = `${window.location.origin}/event/${eventId}`;
    navigator.clipboard.writeText(link);
    showSuccess('تم نسخ رابط المشاركين');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  const shouldRegenerate = ['completed', 'failed'].includes(matchingStatus.status);
  const isProcessing = matchingStatus.status === 'processing' || matchingStatus.status === 'running';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <ArrowRight className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {event?.name_ar || event?.name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إدارة الفعالية</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`/admin/event/${eventId}/challenges`}
                className="btn-secondary flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                التحديات
              </Link>
              <Link
                to={`/admin/event/${eventId}/analytics`}
                className="btn-secondary flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                التحليلات
              </Link>
              <button onClick={copyEventLink} className="btn-secondary flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                رابط المشاركين
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-harmony-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-harmony-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{attendees.length}</p>
                <p className="text-gray-500 text-sm">مشارك</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                matchingStatus.status === 'completed' ? 'bg-green-100' :
                isProcessing ? 'bg-yellow-100' : 'bg-gray-100'
              }`}>
                {matchingStatus.status === 'completed' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : isProcessing ? (
                  <RefreshCw className="w-6 h-6 text-yellow-600 animate-spin" />
                ) : (
                  <Clock className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {matchingStatus.status === 'completed' ? 'مكتمل' :
                   isProcessing ? `${matchingStatus.processedCount || 0}/${matchingStatus.totalCount || 0}` :
                   'في الانتظار'}
                </p>
                <p className="text-gray-500 text-sm">حالة المطابقة</p>
              </div>
            </div>
          </div>

          <div className="card flex items-center justify-center">
            {!isProcessing && attendees.length >= 2 && (
              <button onClick={() => openMetricsModal(shouldRegenerate)} className="btn-success w-full">
                <Settings2 className="w-5 h-5" />
                {shouldRegenerate ? 'إعادة المطابقة' : 'بدء المطابقة بالذكاء الاصطناعي'}
              </button>
            )}
            {isProcessing && (
              <div className="text-center w-full">
                <div className="mb-3">
                  <div className="spinner mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm mb-2">جاري المطابقة...</p>
                  {matchingStatus.progress !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-harmony-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${matchingStatus.progress}%` }}
                      ></div>
                    </div>
                  )}
                  {matchingStatus.progress !== undefined && (
                    <p className="text-xs text-gray-400">
                      {matchingStatus.progress.toFixed(1)}% مكتمل
                    </p>
                  )}
                </div>
                <button
                  onClick={cancelMatching}
                  className="btn-danger text-sm px-4 py-2"
                >
                  <X className="w-4 h-4 inline ml-1" />
                  إلغاء المطابقة
                </button>
              </div>
            )}
            {attendees.length < 2 && (
              <p className="text-gray-500 text-center">يجب إضافة مشاركين أولاً</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-6 mb-6">
          {/* File Upload */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="w-6 h-6 text-harmony-600" />
              <h3 className="text-lg font-semibold text-gray-900">استيراد المشاركين</h3>
            </div>

            <FileUpload
              onFileUpload={handleFileUpload}
              accept=".xlsx,.xls,.csv"
            />

            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={downloadTemplate} className="btn-secondary">
                <Download className="w-5 h-5" />
                تحميل القالب
              </button>
              <button onClick={fetchHarmonyMembers} className="btn-secondary">
                <Globe className="w-5 h-5" />
                استيراد من Harmony
              </button>
              <button onClick={() => setShowAddModal(true)} className="btn-secondary">
                <Plus className="w-5 h-5" />
                إضافة مشارك يدوياً
              </button>
            </div>
          </div>
        </div>

        {/* Attendees Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              // Skeleton loading for attendees table
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonLoader key={index} variant="attendee-row" />
                ))}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">الاسم</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">الهاتف</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">المسمى الوظيفي</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">الشركة</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendees.map((attendee) => (
                    <tr key={attendee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {attendee.photo_url ? (
                            <img
                              src={attendee.photo_url}
                              alt={attendee.name}
                              className="w-10 h-10 rounded-full object-cover shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-harmony-100 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-harmony-600 font-bold">
                                {attendee.name?.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-900">{attendee.name}</span>
                            {attendee.email && (
                              <div className="text-xs text-gray-500 truncate max-w-32" dir="ltr">
                                {attendee.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-sm" dir="ltr">
                        {attendee.phone}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <div>
                          {attendee.title || '-'}
                          {attendee.industry && (
                            <div className="text-xs text-gray-400">{attendee.industry}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {attendee.company || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/event/${eventId}/attendee/${attendee.id}`}
                            className="p-2 text-gray-400 hover:text-harmony-600 hover:bg-harmony-50 rounded-lg transition-all"
                            title="عرض التطابقات"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => deleteAttendee(attendee.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!loading && attendees.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">لا يوجد مشاركين</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-0 max-w-md mx-auto">
                  ابدأ بإضافة المشاركين للفعالية من القسم أعلاه.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Attendee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 fade-in my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">إضافة مشارك</h3>
            <form onSubmit={addAttendee}>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الاسم *
                    </label>
                    <input
                      type="text"
                      value={newAttendee.name}
                      onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الهاتف *
                    </label>
                    <input
                      type="tel"
                      value={newAttendee.phone}
                      onChange={(e) => setNewAttendee({ ...newAttendee, phone: e.target.value })}
                      className="input"
                      placeholder="05XXXXXXXX"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المسمى الوظيفي
                    </label>
                    <input
                      type="text"
                      value={newAttendee.title}
                      onChange={(e) => setNewAttendee({ ...newAttendee, title: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الشركة
                    </label>
                    <input
                      type="text"
                      value={newAttendee.company}
                      onChange={(e) => setNewAttendee({ ...newAttendee, company: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={newAttendee.email}
                    onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                    className="input"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نبذة مهنية
                  </label>
                  <textarea
                    value={newAttendee.professional_bio}
                    onChange={(e) => setNewAttendee({ ...newAttendee, professional_bio: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المهارات
                  </label>
                  <input
                    type="text"
                    value={newAttendee.skills}
                    onChange={(e) => setNewAttendee({ ...newAttendee, skills: e.target.value })}
                    className="input"
                    placeholder="مثال: تطوير الويب، التسويق، إدارة المشاريع"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    يبحث عن
                  </label>
                  <input
                    type="text"
                    value={newAttendee.looking_for}
                    onChange={(e) => setNewAttendee({ ...newAttendee, looking_for: e.target.value })}
                    className="input"
                    placeholder="مثال: شراكات، تمويل، موظفين"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    يقدم
                  </label>
                  <input
                    type="text"
                    value={newAttendee.offering}
                    onChange={(e) => setNewAttendee({ ...newAttendee, offering: e.target.value })}
                    className="input"
                    placeholder="مثال: استشارات، إرشاد، خدمات"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn-primary flex-1">
                  إضافة
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Matching Metrics Selection Modal */}
      {showMetricsModal && metricsConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 fade-in my-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-harmony-100 rounded-xl flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-harmony-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">إعدادات المطابقة</h3>
              </div>
              <button
                onClick={() => setShowMetricsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
              اختر المعايير التي تريد استخدامها في عملية المطابقة
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {metricsConfig.map((metric) => {
                const isOn = selectedMetrics.includes(metric.key);
                return (
                  <button
                    key={metric.key}
                    onClick={() => toggleMetric(metric.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right ${
                      isOn
                        ? 'border-harmony-500 bg-harmony-50 dark:bg-harmony-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {isOn ? (
                      <ToggleRight className="w-6 h-6 text-harmony-600 flex-shrink-0" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-300 dark:text-gray-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${isOn ? 'text-harmony-700 dark:text-harmony-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {metric.nameAr}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {metric.descAr}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setSelectedMetrics(metricsConfig.map(m => m.key))}
                className="text-sm text-harmony-600 hover:text-harmony-700 dark:text-harmony-400"
              >
                تحديد الكل
              </button>
              <span className="text-xs text-gray-400">
                {selectedMetrics.length} / {metricsConfig.length} معايير مفعّلة
              </span>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={confirmMatching}
                disabled={selectedMetrics.length === 0}
                className="btn-success flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5" />
                {pendingRegenerate ? 'إعادة المطابقة' : 'بدء المطابقة'}
              </button>
              <button
                onClick={() => setShowMetricsModal(false)}
                className="btn-secondary flex-1"
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

export default EventManager;
