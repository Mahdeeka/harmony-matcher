import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-lg w-full text-center">
        <div className="w-14 h-14 bg-harmony-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Home className="w-7 h-7 text-harmony-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">الصفحة غير موجودة</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">الرابط غير صحيح أو تم نقل الصفحة.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary">
            <Home className="w-5 h-5" />
            الرئيسية
          </Link>
          <button type="button" onClick={() => window.history.back()} className="btn-secondary">
            <ArrowLeft className="w-5 h-5" />
            رجوع
          </button>
        </div>
      </div>
    </div>
  );
}


