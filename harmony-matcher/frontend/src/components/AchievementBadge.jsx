import React from 'react';
import {
  Trophy, Users, MessageSquare, Star, Target,
  Award, Zap, Heart, Link2, Crown
} from 'lucide-react';

const AchievementBadge = ({
  type,
  title,
  description,
  earned = false,
  progress = null,
  className = ''
}) => {
  const getBadgeIcon = () => {
    switch (type) {
      case 'first-match':
        return <Link2 className="w-6 h-6" />;
      case 'social-butterfly':
        return <Users className="w-6 h-6" />;
      case 'conversation-starter':
        return <MessageSquare className="w-6 h-6" />;
      case 'networking-champion':
        return <Trophy className="w-6 h-6" />;
      case 'early-bird':
        return <Zap className="w-6 h-6" />;
      case 'quality-connections':
        return <Star className="w-6 h-6" />;
      case 'mutual-match':
        return <Heart className="w-6 h-6" />;
      case 'event-organizer':
        return <Target className="w-6 h-6" />;
      case 'harmony-ambassador':
        return <Crown className="w-6 h-6" />;
      default:
        return <Award className="w-6 h-6" />;
    }
  };

  const getBadgeColors = () => {
    if (!earned) {
      return {
        container: 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600',
        icon: 'text-gray-400 dark:text-gray-500',
        title: 'text-gray-400 dark:text-gray-500',
        description: 'text-gray-400 dark:text-gray-500'
      };
    }

    switch (type) {
      case 'first-match':
        return {
          container: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
          title: 'text-blue-700 dark:text-blue-300',
          description: 'text-blue-600 dark:text-blue-400'
        };
      case 'social-butterfly':
        return {
          container: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
          icon: 'text-purple-600 dark:text-purple-400',
          title: 'text-purple-700 dark:text-purple-300',
          description: 'text-purple-600 dark:text-purple-400'
        };
      case 'conversation-starter':
        return {
          container: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
          icon: 'text-green-600 dark:text-green-400',
          title: 'text-green-700 dark:text-green-300',
          description: 'text-green-600 dark:text-green-400'
        };
      case 'networking-champion':
        return {
          container: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-700 dark:text-yellow-300',
          description: 'text-yellow-600 dark:text-yellow-400'
        };
      case 'early-bird':
        return {
          container: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
          icon: 'text-orange-600 dark:text-orange-400',
          title: 'text-orange-700 dark:text-orange-300',
          description: 'text-orange-600 dark:text-orange-400'
        };
      case 'quality-connections':
        return {
          container: 'bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800',
          icon: 'text-pink-600 dark:text-pink-400',
          title: 'text-pink-700 dark:text-pink-300',
          description: 'text-pink-600 dark:text-pink-400'
        };
      case 'mutual-match':
        return {
          container: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-red-700 dark:text-red-300',
          description: 'text-red-600 dark:text-red-400'
        };
      case 'event-organizer':
        return {
          container: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800',
          icon: 'text-indigo-600 dark:text-indigo-400',
          title: 'text-indigo-700 dark:text-indigo-300',
          description: 'text-indigo-600 dark:text-indigo-400'
        };
      case 'harmony-ambassador':
        return {
          container: 'bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-700 dark:text-yellow-300',
          description: 'text-yellow-600 dark:text-yellow-400'
        };
      default:
        return {
          container: 'bg-harmony-100 dark:bg-harmony-900/30 border-harmony-200 dark:border-harmony-800',
          icon: 'text-harmony-600 dark:text-harmony-400',
          title: 'text-harmony-700 dark:text-harmony-300',
          description: 'text-harmony-600 dark:text-harmony-400'
        };
    }
  };

  const colors = getBadgeColors();

  return (
    <div className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${colors.container} ${className}`}>
      {earned && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        </div>
      )}

      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${earned ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-gray-200 dark:bg-gray-600'}`}>
          <div className={colors.icon}>
            {getBadgeIcon()}
          </div>
        </div>

        <h3 className={`font-semibold text-sm mb-1 ${colors.title}`}>
          {title}
        </h3>

        <p className={`text-xs leading-relaxed ${colors.description}`}>
          {description}
        </p>

        {progress !== null && progress < 100 && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-1">
              <div
                className="bg-current h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className={`text-xs ${colors.description}`}>
              {progress}% مكتمل
            </span>
          </div>
        )}

        {earned && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            مكتسب
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementBadge;
