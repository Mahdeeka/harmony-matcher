import React, { useState, useEffect } from 'react';
import {
  Trophy, Target, Star, Zap, Users, MessageCircle,
  Eye, Bookmark, Heart, Crown, Hand, Sparkles, CheckCircle,
  Lightbulb, Briefcase, GraduationCap, Handshake, MessageSquare,
  ChevronDown, ChevronUp, Award, TrendingUp, X
} from 'lucide-react';
import axios from 'axios';

// Icon mapping for challenges
const iconMap = {
  MessageCircle, Users, Star, Zap, Eye, Bookmark, Heart, Crown, Hand,
  Sparkles, CheckCircle, Lightbulb, Briefcase, GraduationCap, Handshake,
  MessageSquare, Target, Trophy
};

// Badge color classes
const badgeColors = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', progress: 'bg-blue-500' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', progress: 'bg-green-500' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', progress: 'bg-yellow-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', progress: 'bg-purple-500' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', progress: 'bg-pink-500' },
  gold: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', progress: 'bg-amber-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', progress: 'bg-orange-500' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', progress: 'bg-teal-500' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', progress: 'bg-cyan-500' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', progress: 'bg-indigo-500' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', progress: 'bg-emerald-500' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', progress: 'bg-violet-500' }
};

// Category labels
const categoryLabels = {
  connection: 'تحديات التواصل',
  quality: 'تحديات الجودة',
  discovery: 'تحديات الاستكشاف',
  match_type: 'تحديات نوع التطابق',
  engagement: 'تحديات التفاعل'
};

function ChallengeCard({ challenge, compact = false }) {
  const Icon = iconMap[challenge.icon] || Target;
  const colors = badgeColors[challenge.badge_color] || badgeColors.blue;
  const isCompleted = challenge.is_completed === 1;
  const progress = challenge.target > 0 ? Math.min((challenge.progress / challenge.target) * 100, 100) : 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${
        isCompleted ? 'bg-green-50 border-green-200' : `${colors.bg} ${colors.border}`
      }`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isCompleted ? 'bg-green-500 text-white' : `${colors.bg} ${colors.text}`
        }`}>
          {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm truncate">{challenge.name_ar}</span>
            {isCompleted && (
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">+{challenge.points}</span>
            )}
          </div>
          {!isCompleted && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.progress} transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{challenge.progress}/{challenge.target}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`card transition-all ${
      isCompleted ? 'border-green-200 bg-green-50/50' : ''
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
          isCompleted
            ? 'bg-green-500 text-white border-green-500'
            : `${colors.bg} ${colors.text} ${colors.border}`
        }`}>
          {isCompleted ? <CheckCircle className="w-7 h-7" /> : <Icon className="w-7 h-7" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-bold text-gray-900">{challenge.name_ar}</h3>
            <div className={`px-2 py-1 rounded-lg text-sm font-bold ${
              isCompleted ? 'bg-green-500 text-white' : `${colors.bg} ${colors.text}`
            }`}>
              {isCompleted ? `+${challenge.points_earned || challenge.points}` : `${challenge.points} نقطة`}
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3">{challenge.description_ar}</p>

          {!isCompleted && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>التقدم</span>
                <span>{challenge.progress} / {challenge.target}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.progress} transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {isCompleted && challenge.completed_at && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>تم إكماله</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChallengesPanel({ attendeeId, eventId, isOpen, onClose }) {
  const [challenges, setChallenges] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [challengesCompleted, setChallengesCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(null);

  useEffect(() => {
    if (isOpen && attendeeId) {
      fetchChallenges();
    }
  }, [isOpen, attendeeId, eventId]);

  const fetchChallenges = async () => {
    try {
      const token = localStorage.getItem(`harmony_token_${eventId}`);
      const response = await axios.get(`/api/attendees/${attendeeId}/challenges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChallenges(response.data.challenges || []);
      setTotalPoints(response.data.totalPoints || 0);
      setChallengesCompleted(response.data.challengesCompleted || 0);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group challenges by category
  const groupedChallenges = challenges.reduce((acc, challenge) => {
    const category = challenge.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(challenge);
    return acc;
  }, {});

  // Separate completed and in-progress
  const completedChallenges = challenges.filter(c => c.is_completed === 1);
  const inProgressChallenges = challenges.filter(c => c.is_completed !== 1 && c.progress > 0);
  const pendingChallenges = challenges.filter(c => c.is_completed !== 1 && c.progress === 0);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">التحديات</h2>
              <p className="text-sm text-gray-500">أكمل التحديات واكسب النقاط</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">لا توجد تحديات</h3>
            <p className="text-gray-500">لم يتم تفعيل أي تحديات لهذه الفعالية بعد</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card text-center bg-gradient-to-br from-purple-50 to-purple-100">
                <div className="text-2xl font-bold text-purple-600">{totalPoints}</div>
                <div className="text-xs text-purple-700">نقطة</div>
              </div>
              <div className="card text-center bg-gradient-to-br from-green-50 to-green-100">
                <div className="text-2xl font-bold text-green-600">{challengesCompleted}</div>
                <div className="text-xs text-green-700">مكتمل</div>
              </div>
              <div className="card text-center bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="text-2xl font-bold text-blue-600">{challenges.length - challengesCompleted}</div>
                <div className="text-xs text-blue-700">متبقي</div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-900">تقدمك الكلي</span>
                <span className="text-sm text-gray-500 mr-auto">
                  {challengesCompleted} من {challenges.length}
                </span>
              </div>
              <div className="h-3 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${(challengesCompleted / challenges.length) * 100}%` }}
                />
              </div>
            </div>

            {/* In Progress Challenges */}
            {inProgressChallenges.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-bold text-gray-900">قيد التقدم</h3>
                  <span className="text-sm text-gray-500">({inProgressChallenges.length})</span>
                </div>
                <div className="space-y-3">
                  {inProgressChallenges.map(challenge => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Challenges */}
            {completedChallenges.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === 'completed' ? null : 'completed')}
                  className="flex items-center gap-2 mb-3 w-full text-right"
                >
                  <Award className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-gray-900">مكتملة</h3>
                  <span className="text-sm text-gray-500">({completedChallenges.length})</span>
                  <span className="mr-auto">
                    {expandedCategory === 'completed' ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </span>
                </button>
                {expandedCategory === 'completed' && (
                  <div className="space-y-2">
                    {completedChallenges.map(challenge => (
                      <ChallengeCard key={challenge.id} challenge={challenge} compact />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Available Challenges by Category */}
            {pendingChallenges.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900">تحديات متاحة</h3>
                  <span className="text-sm text-gray-500">({pendingChallenges.length})</span>
                </div>
                <div className="space-y-3">
                  {pendingChallenges.slice(0, 5).map(challenge => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                  {pendingChallenges.length > 5 && (
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === 'all' ? null : 'all')}
                      className="w-full text-center text-purple-600 text-sm py-2 hover:underline"
                    >
                      {expandedCategory === 'all'
                        ? 'عرض أقل'
                        : `عرض ${pendingChallenges.length - 5} تحديات أخرى`}
                    </button>
                  )}
                  {expandedCategory === 'all' && pendingChallenges.slice(5).map(challenge => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              </div>
            )}

            {/* Motivational Message */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">استمر!</p>
                  <p className="text-sm text-green-700">
                    {challengesCompleted === 0
                      ? 'ابدأ بإرسال رسالة لأحد تطابقاتك لكسب أول نقاطك!'
                      : challengesCompleted < challenges.length / 2
                      ? 'أحسنت! أنت في الطريق الصحيح. استمر في التواصل!'
                      : 'رائع! أنت من المتصدرين. واصل التقدم!'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ChallengesPanel;
