import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Trophy, Target, Star, Zap, Users, MessageCircle,
  Eye, Bookmark, Heart, Crown, Hand, Sparkles, CheckCircle,
  Lightbulb, Briefcase, GraduationCap, HeartHandshake, MessageSquare,
  Plus, Edit2, Trash2
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

const iconMap = {
  MessageCircle, Users, Star, Zap, Eye, Bookmark, Heart, Crown, Hand,
  Sparkles, CheckCircle, Lightbulb, Briefcase, GraduationCap, HeartHandshake,
  MessageSquare, Target, Trophy
};

const badgeColors = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200',
  gold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200'
};

const categories = [
  { key: 'connection', ar: 'تحديات التواصل', en: 'Connection' },
  { key: 'quality', ar: 'تحديات الجودة', en: 'Quality' },
  { key: 'discovery', ar: 'تحديات الاستكشاف', en: 'Discovery' },
  { key: 'match_type', ar: 'تحديات نوع التطابق', en: 'Match Type' },
  { key: 'engagement', ar: 'تحديات التفاعل', en: 'Engagement' },
  { key: 'other', ar: 'أخرى', en: 'Other' }
];

const iconOptions = Object.keys(iconMap);
const badgeOptions = Object.keys(badgeColors);

const emptyActivity = {
  name_ar: '', name_en: '', description_ar: '', description_en: '',
  default_points: 10, category: 'connection', icon: 'Target',
  trigger_type: 'manual', trigger_value: 1, badge_color: 'blue'
};

function ActivityCreatorBoard() {
  const { showSuccess, showError } = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [form, setForm] = useState(emptyActivity);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowEditModal(false);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const fetchActivities = async () => {
    try {
      const { data } = await axios.get('/api/challenges');
      setActivities(data.challenges || []);
    } catch (error) {
      showError('فشل في جلب الأنشطة');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(emptyActivity);
    setShowCreateModal(true);
  };

  const openEdit = (activity) => {
    setEditingActivity(activity);
    setForm({
      name_ar: activity.name_ar || '',
      name_en: activity.name_en || '',
      description_ar: activity.description_ar || '',
      description_en: activity.description_en || '',
      default_points: activity.default_points ?? 10,
      category: activity.category || 'connection',
      icon: activity.icon || 'Target',
      trigger_type: activity.trigger_type || 'manual',
      trigger_value: activity.trigger_value ?? 1,
      badge_color: activity.badge_color || 'blue'
    });
    setShowEditModal(true);
  };

  const openDelete = (activity) => {
    setActivityToDelete(activity);
    setShowDeleteModal(true);
  };

  const createActivity = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form };
    delete payload.image_url;
    try {
      await axios.post('/api/challenges', payload);
      showSuccess('تم إنشاء النشاط بنجاح');
      setShowCreateModal(false);
      fetchActivities();
    } catch (error) {
      if (!error.response) {
        showError('فشل في الاتصال بالخادم. تأكد من تشغيل الخلفية.');
        return;
      }
      const data = error.response?.data;
      const msg = data?.error || 'فشل في إنشاء النشاط';
      const details = data?.details;
      showError(details ? `${msg} — ${details}` : msg);
    } finally {
      setSaving(false);
    }
  };

  const updateActivity = async (e) => {
    e.preventDefault();
    if (!editingActivity) return;
    setSaving(true);
    const payload = { ...form };
    delete payload.image_url;
    try {
      await axios.patch(`/api/challenges/${editingActivity.id}`, payload);
      showSuccess('تم تحديث النشاط بنجاح');
      setShowEditModal(false);
      setEditingActivity(null);
      fetchActivities();
    } catch (error) {
      if (!error.response) {
        showError('فشل في الاتصال بالخادم. تأكد من تشغيل الخلفية.');
        return;
      }
      const data = error.response?.data;
      const details = data?.details;
      const msg = data?.error || 'فشل في تحديث النشاط';
      showError(details ? `${msg} — ${details}` : msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteActivity = async () => {
    if (!activityToDelete) return;
    setSaving(true);
    try {
      await axios.delete(`/api/challenges/${activityToDelete.id}`);
      showSuccess('تم حذف النشاط بنجاح');
      setShowDeleteModal(false);
      setActivityToDelete(null);
      fetchActivities();
    } catch (error) {
      showError('فشل في حذف النشاط');
    } finally {
      setSaving(false);
    }
  };

  const grouped = activities.reduce((acc, a) => {
    const cat = a.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  const renderForm = (onSubmit) => (
    <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم بالعربية *</label>
          <input
            type="text"
            value={form.name_ar}
            onChange={(e) => setForm(prev => ({ ...prev, name_ar: e.target.value }))}
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم بالإنجليزية</label>
          <input
            type="text"
            value={form.name_en}
            onChange={(e) => setForm(prev => ({ ...prev, name_en: e.target.value }))}
            className="input"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف بالعربية *</label>
          <textarea
            value={form.description_ar}
            onChange={(e) => setForm(prev => ({ ...prev, description_ar: e.target.value }))}
            className="input min-h-[80px]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف بالإنجليزية</label>
          <textarea
            value={form.description_en}
            onChange={(e) => setForm(prev => ({ ...prev, description_en: e.target.value }))}
            className="input min-h-[80px]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النقاط *</label>
          <input
            type="number"
            min="1"
            max="100"
            value={form.default_points}
            onChange={(e) => setForm(prev => ({ ...prev, default_points: parseInt(e.target.value) || 10 }))}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الصنف</label>
          <select
            value={form.category}
            onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
            className="input"
          >
            {categories.map(c => (
              <option key={c.key} value={c.key}>{c.ar}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأيقونة</label>
          <select
            value={form.icon}
            onChange={(e) => setForm(prev => ({ ...prev, icon: e.target.value }))}
            className="input"
          >
            {iconOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">لون الشارة</label>
          <select
            value={form.badge_color}
            onChange={(e) => setForm(prev => ({ ...prev, badge_color: e.target.value }))}
            className="input"
          >
            {badgeOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? <span className="spinner w-5 h-5" /> : 'حفظ'}
        </button>
        <button
          type="button"
          onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
          className="btn-secondary"
        >
          إلغاء
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <ArrowRight className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">مكتبة الأنشطة</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إنشاء وتعديل الأنشطة لاستخدامها في أي فعالية</p>
              </div>
            </div>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              نشاط جديد
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8">
          <div className="flex gap-3">
            <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">كيف تعمل مكتبة الأنشطة؟</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                أنشئ أنشطة وتحديات هنا مع النقاط والوصف. يمكنك لاحقاً اختيار أي منها لتفعيله في أي فعالية من صفحة &quot;التحديات&quot; الخاصة بالفعالية.
              </p>
            </div>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="card text-center py-16 dark:bg-gray-800 dark:border-gray-700">
            <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">لا توجد أنشطة بعد</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">أنشئ أول نشاط لاستخدامه في فعالياتك</p>
            <button onClick={openCreate} className="btn-primary">
              <Plus className="w-5 h-5 inline ml-2" />
              نشاط جديد
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map(({ key, ar }) => {
              const list = grouped[key] || [];
              if (list.length === 0) return null;

              return (
                <div key={key}>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{ar}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((activity) => {
                      const Icon = iconMap[activity.icon] || Target;
                      const colorClass = badgeColors[activity.badge_color] || badgeColors.blue;

                      return (
                        <div
                          key={activity.id}
                          className="card dark:bg-gray-800 dark:border-gray-700 flex gap-4 hover:shadow-lg transition-shadow"
                        >
                          <div className="shrink-0">
                            {activity.image_url ? (
                              <img
                                src={activity.image_url}
                                alt={activity.name_ar}
                                className="w-14 h-14 rounded-xl object-cover border"
                              />
                            ) : (
                              <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${colorClass}`}>
                                <Icon className="w-7 h-7" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-white truncate">{activity.name_ar}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{activity.description_ar}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">
                                {activity.default_points} نقطة
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={() => openEdit(activity)}
                              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDelete(activity)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">إنشاء نشاط جديد</h3>
            {renderForm(createActivity)}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">تعديل النشاط</h3>
            {renderForm(updateActivity)}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && activityToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">حذف النشاط</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">هل أنت متأكد من حذف &quot;{activityToDelete.name_ar}&quot;؟ لن يتأثر سجل الفعاليات السابقة.</p>
            <div className="flex gap-3">
              <button onClick={deleteActivity} disabled={saving} className="btn-danger flex-1">
                {saving ? <span className="spinner w-5 h-5" /> : 'حذف'}
              </button>
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityCreatorBoard;
