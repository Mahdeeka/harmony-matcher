import React from 'react';

const SkeletonLoader = ({ variant = 'default', lines = 1, className = '' }) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`card ${className}`}>
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'attendee-row':
        return (
          <div className="animate-pulse flex items-center space-x-4 rtl:space-x-reverse p-4 border-b border-gray-100">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
            <div className="w-8 h-8 bg-gray-200 rounded"></div>
          </div>
        );

      case 'event-card':
        return (
          <div className={`card hover:shadow-lg transition-all duration-300 ${className}`}>
            <div className="animate-pulse p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>

              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        );

      case 'match-card':
        return (
          <div className="card animate-pulse p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            </div>

            <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>

            <div className="flex gap-2 mt-4">
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
            </div>
          </div>
        );

      case 'text':
      default:
        return (
          <div className={`animate-pulse space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                className={`bg-gray-200 rounded ${
                  i === lines - 1 ? 'w-3/4' : 'w-full'
                } ${lines === 1 ? 'h-4' : i === 0 ? 'h-4' : 'h-3'}`}
              ></div>
            ))}
          </div>
        );
    }
  };

  return renderSkeleton();
};

export default SkeletonLoader;
