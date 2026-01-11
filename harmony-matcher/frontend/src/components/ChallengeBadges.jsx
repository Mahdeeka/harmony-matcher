import React, { useState, useEffect } from 'react';
import {
  Trophy, Target, Star, Zap, Users, MessageCircle,
  Eye, Bookmark, Heart, Crown, Hand, Sparkles, CheckCircle,
  Lightbulb, Briefcase, GraduationCap, Handshake, MessageSquare
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
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  gold: 'bg-amber-500',
  orange: 'bg-orange-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-500'
};

// Small badge for displaying on match cards
function SmallBadge({ challenge }) {
  const Icon = iconMap[challenge.icon] || Trophy;
  const bgColor = badgeColors[challenge.badge_color] || 'bg-purple-500';

  return (
    <div
      className={`w-6 h-6 rounded-full ${bgColor} flex items-center justify-center shadow-sm`}
      title={challenge.name_ar}
    >
      <Icon className="w-3 h-3 text-white" />
    </div>
  );
}

// Badge row for displaying multiple badges
function ChallengeBadgesRow({ badges, maxDisplay = 5 }) {
  if (!badges || badges.length === 0) return null;

  const displayBadges = badges.slice(0, maxDisplay);
  const remaining = badges.length - maxDisplay;

  return (
    <div className="flex items-center gap-1">
      {displayBadges.map((badge) => (
        <SmallBadge key={badge.id} challenge={badge} />
      ))}
      {remaining > 0 && (
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
          +{remaining}
        </div>
      )}
    </div>
  );
}

// Compact badges display for profile cards
function CompactBadgesDisplay({ attendeeId, eventId }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [attendeeId, eventId]);

  const fetchBadges = async () => {
    try {
      const token = localStorage.getItem(`harmony_token_${eventId}`);
      const response = await axios.get(`/api/attendees/${attendeeId}/badges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBadges(response.data.badges || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || badges.length === 0) return null;

  return <ChallengeBadgesRow badges={badges} maxDisplay={4} />;
}

// Points and rank display for profile
function PointsDisplay({ totalPoints, rank, challengesCompleted }) {
  if (!totalPoints && !rank) return null;

  return (
    <div className="flex items-center gap-3 text-sm">
      {totalPoints > 0 && (
        <div className="flex items-center gap-1 text-purple-600">
          <Star className="w-4 h-4" />
          <span className="font-medium">{totalPoints}</span>
          <span className="text-gray-500">نقطة</span>
        </div>
      )}
      {rank && (
        <div className="flex items-center gap-1 text-amber-600">
          <Trophy className="w-4 h-4" />
          <span className="font-medium">#{rank}</span>
        </div>
      )}
      {challengesCompleted > 0 && (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">{challengesCompleted}</span>
        </div>
      )}
    </div>
  );
}

// Full badge showcase (for expanded profile view)
function BadgeShowcase({ badges, maxDisplay = 8, showEmpty = false }) {
  if (!badges || badges.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className="text-center text-gray-500 text-sm py-2">
        لا توجد شارات مكتسبة بعد
      </div>
    );
  }

  const displayBadges = badges.slice(0, maxDisplay);
  const remaining = badges.length - maxDisplay;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Trophy className="w-4 h-4" />
        <span>الشارات المكتسبة ({badges.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayBadges.map((badge) => {
          const Icon = iconMap[badge.icon] || Trophy;
          const bgColor = badgeColors[badge.badge_color] || 'bg-purple-500';

          return (
            <div
              key={badge.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor} text-white text-sm`}
              title={badge.description_ar}
            >
              <Icon className="w-4 h-4" />
              <span>{badge.name_ar}</span>
            </div>
          );
        })}
        {remaining > 0 && (
          <div className="flex items-center px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm">
            +{remaining} أخرى
          </div>
        )}
      </div>
    </div>
  );
}

// Challenge completion notification toast
function ChallengeCompletedToast({ challenge, points, onClose }) {
  const Icon = iconMap[challenge.icon] || Trophy;
  const bgColor = badgeColors[challenge.badge_color] || 'bg-purple-500';

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-in">
      <div className="bg-white rounded-xl shadow-2xl border border-green-200 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-white" />
          <span className="text-white font-bold">تحدي مكتمل!</span>
        </div>
        <div className="p-4 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">{challenge.name_ar}</p>
            <p className="text-sm text-gray-600">{challenge.description_ar}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">+{points}</div>
            <div className="text-xs text-gray-500">نقطة</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export {
  SmallBadge,
  ChallengeBadgesRow,
  CompactBadgesDisplay,
  PointsDisplay,
  BadgeShowcase,
  ChallengeCompletedToast
};

export default ChallengeBadgesRow;
