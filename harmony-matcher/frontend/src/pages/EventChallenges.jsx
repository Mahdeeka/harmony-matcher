import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight, Trophy, Target, Star, Zap, Users, MessageCircle,
  Eye, Bookmark, Heart, Crown, Hand, Sparkles, CheckCircle,
  Lightbulb, Briefcase, GraduationCap, Handshake, MessageSquare,
  ToggleLeft, ToggleRight, Save, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

// Icon mapping for challenges
const iconMap = {
  MessageCircle, Users, Star, Zap, Eye, Bookmark, Heart, Crown, Hand,
  Sparkles, CheckCircle, Lightbulb, Briefcase, GraduationCap, Handshake,
  MessageSquare, Target, Trophy
};

// Badge color classes
const badgeColors = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  gold: 'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  teal: 'bg-teal-100 text-teal-700 border-teal-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200'
};

// Category labels
const categoryLabels = {
  connection: { ar: 'تحديات التواصل', en: 'Connection Challenges', icon: Users },
  quality: { ar: 'تحديات الجودة', en: 'Quality Challenges', icon: Star },
  discovery: { ar: 'تحديات الاستكشاف', en: 'Discovery Challenges', icon: Eye },
  match_type: { ar: 'تحديات نوع التطابق', en: 'Match Type Challenges', icon: Target },
  engagement: { ar: 'تحديات التفاعل', en: 'Engagement Challenges', icon: Zap }
};

function EventChallenges() {
  const { eventId } = useParams();
  const { showSuccess, showError, showInfo } = useToast();
  const [event, setEvent] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchEvent();
    fetchChallenges();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}`);
      setEvent(response.data.event);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchChallenges = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}/challenges`);
      setChallenges(response.data.challenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      showError('فشل في جلب التحديات');
    } finally {
      setLoading(false);
    }
  };

  const toggleChallenge = (challengeId) => {
    setChallenges(prev => prev.map(c => {
      if (c.id === challengeId) {
        return { ...c, is_active: c.is_active ? 0 : 1 };
      }
      return c;
    }));
    setHasChanges(true);
  };

  const updatePoints = (challengeId, points) => {
    setChallenges(prev => prev.map(c => {
      if (c.id === challengeId) {
        return { ...c, points: parseInt(points) || c.default_points };
      }
      return c;
    }));
    setHasChanges(true);
  };

  const enableAll = async () => {
    try {
      await axios.post(`/api/events/${eventId}/challenges/enable-all`);
      showSuccess('تم تفعيل جميع التحديات');
      fetchChallenges();
    } catch (error) {
      showError('فشل في تفعيل التحديات');
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const challengeConfigs = challenges.map(c => ({
        challenge_id: c.id,
        is_active: c.is_active === 1,
        points: c.points || c.default_points,
        custom_trigger_value: c.custom_trigger_value
      }));

      await axios.post(`/api/events/${eventId}/challenges`, { challenges: challengeConfigs });
      showSuccess('تم حفظ التغييرات');
      setHasChanges(false);
    } catch (error) {
      showError('فشل في حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  // Group challenges by category
  const groupedChallenges = challenges.reduce((acc, challenge) => {
    const category = challenge.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(challenge);
    return acc;
  }, {});

  const activeCount = challenges.filter(c => c.is_active === 1).length;
  const totalPoints = challenges.filter(c => c.is_active === 1).reduce((sum, c) => sum + (c.points || c.default_points), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={`/admin/event/${eventId}`} className="text-gray-400 hover:text-gray-600">
                <ArrowRight className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  إدارة التحديات
                </h1>
                <p className="text-gray-500 text-sm">{event?.name_ar || event?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={enableAll}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                تفعيل الكل
              </button>
              {hasChanges && (
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <div className="spinner w-4 h-4"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  حفظ التغييرات
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{challenges.length}</p>
                <p className="text-gray-500 text-sm">تحدي متاح</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
                <p className="text-gray-500 text-sm">تحدي مفعّل</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalPoints}</p>
                <p className="text-gray-500 text-sm">مجموع النقاط</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800 mb-1">كيف تعمل التحديات؟</h3>
              <p className="text-sm text-blue-700">
                اختر التحديات التي تريد تفعيلها لهذه الفعالية. يمكنك تعديل النقاط لكل تحدي.
                سيرى المشاركون هذه التحديات ويمكنهم إكمالها لكسب النقاط والظهور في لوحة المتصدرين.
              </p>
            </div>
          </div>
        </div>

        {/* Challenges by Category */}
        {Object.entries(categoryLabels).map(([category, label]) => {
          const categoryChallenges = groupedChallenges[category] || [];
          if (categoryChallenges.length === 0) return null;

          const CategoryIcon = label.icon;
          const activeInCategory = categoryChallenges.filter(c => c.is_active === 1).length;

          return (
            <div key={category} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <CategoryIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{label.ar}</h2>
                  <p className="text-sm text-gray-500">{activeInCategory} من {categoryChallenges.length} مفعّل</p>
                </div>
              </div>

              <div className="space-y-3">
                {categoryChallenges.map((challenge) => {
                  const Icon = iconMap[challenge.icon] || Target;
                  const colorClass = badgeColors[challenge.badge_color] || badgeColors.blue;
                  const isActive = challenge.is_active === 1;

                  return (
                    <div
                      key={challenge.id}
                      className={`card flex items-center gap-4 transition-all ${
                        isActive ? 'border-green-200 bg-green-50/30' : 'opacity-60'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{challenge.name_ar}</h3>
                          <span className="text-xs text-gray-400">({challenge.name_en})</span>
                        </div>
                        <p className="text-sm text-gray-600">{challenge.description_ar}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>الهدف: {challenge.trigger_value}</span>
                          <span>•</span>
                          <span>النوع: {challenge.trigger_type}</span>
                        </div>
                      </div>

                      {/* Points Input */}
                      <div className="flex flex-col items-center">
                        <label className="text-xs text-gray-500 mb-1">النقاط</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={challenge.points || challenge.default_points}
                          onChange={(e) => updatePoints(challenge.id, e.target.value)}
                          className="w-16 text-center input py-1 px-2"
                          disabled={!isActive}
                        />
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={() => toggleChallenge(challenge.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isActive
                            ? 'text-green-600 hover:bg-green-100'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {isActive ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Save Button (Mobile Fixed) */}
        {hasChanges && (
          <div className="fixed bottom-4 left-4 right-4 md:hidden">
            <button
              onClick={saveChanges}
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4"
            >
              {saving ? (
                <div className="spinner w-5 h-5"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default EventChallenges;
