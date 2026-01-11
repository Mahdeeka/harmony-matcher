import React, { useState, useEffect } from 'react';
import { Trophy, Target, TrendingUp, Award } from 'lucide-react';
import AchievementBadge from './AchievementBadge';
import axios from 'axios';

const GamificationDashboard = ({ attendee, matches, onClose }) => {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState({
    totalMatches: 0,
    mutualMatches: 0,
    messagesSent: 0,
    profileViews: 0
  });

  useEffect(() => {
    const load = async () => {
      if (!attendee?.id) return;

      // Fetch server-sourced stats (no mock/random)
      const res = await axios.get(`/api/attendees/${attendee.id}/gamification`);
      const s = res.data?.stats || {};

      setStats({
        totalMatches: s.totalMatches || matches.length || 0,
        mutualMatches: s.mutualMatches || 0,
        messagesSent: s.messagesSent || 0,
        profileViews: s.profileViews || 0,
        savedMatches: s.savedMatches || 0,
        hiddenMatches: s.hiddenMatches || 0,
        highQualityMatches: s.highQualityMatches || 0,
        firstLoginAt: s.firstLoginAt || null,
        eventDate: s.eventDate || null
      });

      const isEarlyBird = (() => {
        if (!s.firstLoginAt || !s.eventDate) return false;
        const login = new Date(s.firstLoginAt);
        const eventDate = new Date(s.eventDate);
        if (Number.isNaN(login.getTime()) || Number.isNaN(eventDate.getTime())) return false;
        return Math.abs(login.getTime() - eventDate.getTime()) <= 60 * 60 * 1000; // 1 hour
      })();

      const userAchievements = [
        {
          id: 'first-match',
          type: 'first-match',
          title: 'أول تطابق',
          description: 'تهانينا! حصلت على تطابقك الأول',
          earned: (s.totalMatches || matches.length) > 0
        },
        {
          id: 'social-butterfly',
          type: 'social-butterfly',
          title: 'فراشة اجتماعية',
          description: 'تواصلت مع 5 أشخاص أو أكثر',
          earned: (s.totalMatches || matches.length) >= 5
        },
        {
          id: 'conversation-starter',
          type: 'conversation-starter',
          title: 'مبتدئ حوار',
          description: 'أرسلت أكثر من 10 رسائل',
          earned: (s.messagesSent || 0) >= 10,
          progress: Math.min(((s.messagesSent || 0) / 10) * 100, 100)
        },
        {
          id: 'networking-champion',
          type: 'networking-champion',
          title: 'بطل التواصل',
          description: 'حصلت على أكثر من 15 تطابق',
          earned: (s.totalMatches || matches.length) >= 15
        },
        {
          id: 'early-bird',
          type: 'early-bird',
          title: 'مبكر النشاط',
          description: 'سجلت الدخول في أول ساعة من الفعالية',
          earned: isEarlyBird
        },
        {
          id: 'quality-connections',
          type: 'quality-connections',
          title: 'اتصالات عالية الجودة',
          description: 'حصلت على تطابقات بدرجة 80% أو أعلى',
          earned: (s.highQualityMatches || 0) > 0,
          progress: (s.totalMatches || matches.length) > 0 ? ((s.highQualityMatches || 0) / (s.totalMatches || matches.length)) * 100 : 0
        },
        {
          id: 'mutual-match',
          type: 'mutual-match',
          title: 'تطابق متبادل',
          description: 'حصلت على تطابق متبادل مع شخص آخر',
          earned: (s.mutualMatches || 0) > 0
        }
      ];

      setAchievements(userAchievements);
    };

    load().catch(() => {
      // fallback to local calculations if API fails
      setStats({
        totalMatches: matches.length,
        mutualMatches: matches.filter(m => m.is_mutual === 1).length,
        messagesSent: 0,
        profileViews: 0
      });
    });
  }, [matches, attendee]);

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalAchievements = achievements.length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">إنجازاتك</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">تابع تقدمك في رحلة التواصل</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{stats.totalMatches}</div>
            <div className="text-sm text-gray-500">تطابقات</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{stats.mutualMatches}</div>
            <div className="text-sm text-gray-500">متبادلة</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{earnedCount}</div>
            <div className="text-sm text-gray-500">إنجازات</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">{stats.messagesSent}</div>
            <div className="text-sm text-gray-500">رسائل</div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">تقدمك</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">الإنجازات المكتسبة</span>
              <span className="font-medium text-gray-900 dark:text-white">{earnedCount}/{totalAchievements}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(earnedCount / totalAchievements) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-yellow-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">الإنجازات</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                type={achievement.type}
                title={achievement.title}
                description={achievement.description}
                earned={achievement.earned}
                progress={achievement.progress}
              />
            ))}
          </div>
        </div>

        {/* Motivational Message */}
        <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">استمر في التواصل!</p>
              <p className="text-sm text-green-700 dark:text-green-400">
                كل تطابق جديد يقربك من إنجازات أكبر في رحلتك المهنية
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamificationDashboard;
