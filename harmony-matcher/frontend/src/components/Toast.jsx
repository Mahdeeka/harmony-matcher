import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'info', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow animation to complete
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getToastClasses = () => {
    const baseClasses = "toast flex items-center gap-3 p-4 rounded-xl shadow-lg border transition-all duration-300";
    const typeClasses = {
      success: "toast-success border-green-200 bg-green-50",
      error: "toast-error border-red-200 bg-red-50",
      warning: "border-yellow-200 bg-yellow-50",
      info: "border-blue-200 bg-blue-50"
    };

    return `${baseClasses} ${typeClasses[type]} ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`;
  };

  return (
    <div className={getToastClasses()}>
      {getIcon()}
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
