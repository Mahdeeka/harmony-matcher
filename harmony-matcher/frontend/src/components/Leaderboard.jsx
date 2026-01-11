import React, { useState, useEffect } from 'react';
import {
  Trophy, Crown, Medal, Award, Star, TrendingUp, X, Users
} from 'lucide-react';
import axios from 'axios';

// Rank icons and colors
const rankConfig = {
  1: { icon: Crown, bg: 'bg-gradient-to-br from-yellow-400 to-amber-500', text: 'text-yellow-900' },
  2: { icon: Medal, bg: 'bg-gradient-to-br from-gray-300 to-gray-400', text: 'text-gray-700' },
  3: { icon: Award, bg: 'bg-gradient-to-br from-orange-400 to-orange-500', text: 'text-orange-900' }
};

function LeaderboardEntry({ entry, isCurrentUser = false }) {
  const isTopThree = entry.rank <= 3;
  const config = rankConfig[entry.rank];

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
      isCurrentUser
        ? 'bg-purple-50 border-2 border-purple-200'
        : isTopThree
        ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200'
        : 'bg-white border border-gray-100'
    }`}>
      {/* Rank */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
        isTopThree
          ? `${config.bg} text-white shadow-lg`
          : 'bg-gray-100 text-gray-600'
      }`}>
        {isTopThree ? (
          <config.icon className="w-5 h-5" />
        ) : (
          <span>{entry.rank}</span>
        )}
      </div>

      {/* Avatar & Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {entry.photo_url ? (
          <img
            src={entry.photo_url}
            alt={entry.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
          />
        ) : (
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center border-2 border-white shadow">
            <span className="text-purple-600 font-bold text-lg">
              {entry.name?.charAt(0)}
            </span>
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-bold truncate ${isCurrentUser ? 'text-purple-700' : 'text-gray-900'}`}>
              {entry.name}
            </span>
            {isCurrentUser && (
              <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">أنت</span>
            )}
          </div>
          {(entry.title || entry.company) && (
            <p className="text-sm text-gray-500 truncate">
              {entry.title}{entry.title && entry.company && ' @ '}{entry.company}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="text-left">
        <div className={`text-xl font-bold ${isTopThree ? 'text-amber-600' : 'text-purple-600'}`}>
          {entry.total_points}
        </div>
        <div className="text-xs text-gray-500">نقطة</div>
      </div>

      {/* Challenges completed badge */}
      <div className="hidden sm:flex flex-col items-center">
        <div className="flex items-center gap-1 text-green-600">
          <Trophy className="w-4 h-4" />
          <span className="font-medium">{entry.challenges_completed}</span>
        </div>
        <div className="text-xs text-gray-500">تحدي</div>
      </div>
    </div>
  );
}

function Leaderboard({ eventId, currentUserId, isOpen, onClose }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
      if (currentUserId) {
        fetchUserRank();
      }
    }
  }, [isOpen, eventId, currentUserId]);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}/leaderboard?limit=20`);
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRank = async () => {
    try {
      const token = localStorage.getItem(`harmony_token_${eventId}`);
      const response = await axios.get(`/api/attendees/${currentUserId}/rank`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserRank(response.data);
    } catch (error) {
      console.error('Error fetching user rank:', error);
    }
  };

  if (!isOpen) return null;

  // Check if current user is in the displayed leaderboard
  const isUserInLeaderboard = leaderboard.some(e => e.attendee_id === currentUserId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">لوحة المتصدرين</h2>
              <p className="text-sm text-gray-500">أفضل المتواصلين في الفعالية</p>
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
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">لا يوجد متصدرين بعد</h3>
            <p className="text-gray-500">كن أول من يكمل تحدياً ويظهر هنا!</p>
          </div>
        ) : (
          <>
            {/* User's Rank Card (if not in top 20) */}
            {userRank && userRank.rank && !isUserInLeaderboard && (
              <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-purple-800">ترتيبك الحالي</p>
                    <p className="text-sm text-purple-600">
                      المركز #{userRank.rank} بـ {userRank.totalPoints} نقطة
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-purple-700">
                    #{userRank.rank}
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="flex items-end justify-center gap-4 mb-8 px-4">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-gray-300 shadow-lg mb-2">
                    {leaderboard[1]?.photo_url ? (
                      <img src={leaderboard[1].photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-600 font-bold text-xl">
                          {leaderboard[1]?.name?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="w-16 bg-gradient-to-b from-gray-300 to-gray-400 rounded-t-lg flex items-center justify-center h-16">
                    <span className="text-white font-bold text-2xl">2</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-1 truncate max-w-20">
                    {leaderboard[1]?.name?.split(' ')[0]}
                  </p>
                  <p className="text-xs text-gray-500">{leaderboard[1]?.total_points} نقطة</p>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center -mt-4">
                  <Crown className="w-8 h-8 text-yellow-500 mb-1" />
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-yellow-400 shadow-lg mb-2">
                    {leaderboard[0]?.photo_url ? (
                      <img src={leaderboard[0].photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-yellow-100 flex items-center justify-center">
                        <span className="text-yellow-600 font-bold text-2xl">
                          {leaderboard[0]?.name?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="w-20 bg-gradient-to-b from-yellow-400 to-amber-500 rounded-t-lg flex items-center justify-center h-24">
                    <span className="text-white font-bold text-3xl">1</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mt-1 truncate max-w-24">
                    {leaderboard[0]?.name?.split(' ')[0]}
                  </p>
                  <p className="text-xs text-amber-600 font-medium">{leaderboard[0]?.total_points} نقطة</p>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-orange-400 shadow-lg mb-2">
                    {leaderboard[2]?.photo_url ? (
                      <img src={leaderboard[2].photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-xl">
                          {leaderboard[2]?.name?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="w-16 bg-gradient-to-b from-orange-400 to-orange-500 rounded-t-lg flex items-center justify-center h-12">
                    <span className="text-white font-bold text-2xl">3</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-1 truncate max-w-20">
                    {leaderboard[2]?.name?.split(' ')[0]}
                  </p>
                  <p className="text-xs text-gray-500">{leaderboard[2]?.total_points} نقطة</p>
                </div>
              </div>
            )}

            {/* Full Leaderboard List */}
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <LeaderboardEntry
                  key={entry.attendee_id}
                  entry={entry}
                  isCurrentUser={entry.attendee_id === currentUserId}
                />
              ))}
            </div>

            {/* Encouragement Message */}
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-800">كيف تتصدر؟</p>
                  <p className="text-sm text-purple-700">
                    أكمل التحديات، تواصل مع المشاركين، واكسب المزيد من النقاط!
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

export default Leaderboard;
