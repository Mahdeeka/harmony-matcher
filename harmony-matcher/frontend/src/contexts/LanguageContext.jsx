import React, { createContext, useContext, useState, useEffect } from 'react';

// Language detection and translations
const translations = {
  ar: {
    // Authentication
    'login': 'تسجيل الدخول',
    'logout': 'خروج',
    'phone': 'رقم الهاتف',
    'email': 'البريد الإلكتروني',
    'password': 'كلمة المرور',
    'otp': 'رمز التحقق',
    'send_code': 'إرسال الرمز',
    'verify': 'تحقق',
    'resend': 'إعادة إرسال',
    'welcome': 'مرحباً',
    'matches': 'التطابقات',
    'messages': 'الرسائل',

    // Navigation
    'dashboard': 'لوحة التحكم',
    'events': 'الفعاليات',
    'analytics': 'التحليلات',
    'settings': 'الإعدادات',
    'profile': 'الملف الشخصي',

    // Actions
    'save': 'حفظ',
    'cancel': 'إلغاء',
    'delete': 'حذف',
    'edit': 'تعديل',
    'create': 'إنشاء',
    'update': 'تحديث',
    'submit': 'إرسال',

    // Messages
    'success': 'تم بنجاح',
    'error': 'خطأ',
    'loading': 'جاري التحميل...',
    'no_data': 'لا توجد بيانات',
    'confirm_delete': 'هل أنت متأكد من الحذف؟',

    // Business terms
    'networking': 'التواصل الشبكي',
    'professional': 'مهني',
    'skills': 'المهارات',
    'experience': 'الخبرة',
    'industry': 'المجال',
    'company': 'الشركة',
    'position': 'المسمى الوظيفي'
  },
  en: {
    // Authentication
    'login': 'Login',
    'logout': 'Logout',
    'phone': 'Phone',
    'email': 'Email',
    'password': 'Password',
    'otp': 'OTP Code',
    'send_code': 'Send Code',
    'verify': 'Verify',
    'resend': 'Resend',
    'welcome': 'Welcome',
    'matches': 'Matches',
    'messages': 'Messages',

    // Navigation
    'dashboard': 'Dashboard',
    'events': 'Events',
    'analytics': 'Analytics',
    'settings': 'Settings',
    'profile': 'Profile',

    // Actions
    'save': 'Save',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'edit': 'Edit',
    'create': 'Create',
    'update': 'Update',
    'submit': 'Submit',

    // Messages
    'success': 'Success',
    'error': 'Error',
    'loading': 'Loading...',
    'no_data': 'No data available',
    'confirm_delete': 'Are you sure you want to delete?',

    // Business terms
    'networking': 'Networking',
    'professional': 'Professional',
    'skills': 'Skills',
    'experience': 'Experience',
    'industry': 'Industry',
    'company': 'Company',
    'position': 'Position'
  },
  he: {
    // Authentication
    'login': 'התחברות',
    'logout': 'התנתקות',
    'phone': 'טלפון',
    'email': 'דוא"ל',
    'password': 'סיסמה',
    'otp': 'קוד OTP',
    'send_code': 'שלח קוד',
    'verify': 'אימות',
    'resend': 'שלח שוב',
    'welcome': 'ברוך הבא',
    'matches': 'התאמות',
    'messages': 'הודעות',

    // Navigation
    'dashboard': 'לוח בקרה',
    'events': 'אירועים',
    'analytics': 'ניתוח',
    'settings': 'הגדרות',
    'profile': 'פרופיל',

    // Actions
    'save': 'שמור',
    'cancel': 'ביטול',
    'delete': 'מחק',
    'edit': 'ערוך',
    'create': 'צור',
    'update': 'עדכן',
    'submit': 'שלח',

    // Messages
    'success': 'הצלחה',
    'error': 'שגיאה',
    'loading': 'טוען...',
    'no_data': 'אין נתונים',
    'confirm_delete': 'האם אתה בטוח שברצונך למחוק?',

    // Business terms
    'networking': 'נטוורקינג',
    'professional': 'מקצועי',
    'skills': 'כישורים',
    'experience': 'ניסיון',
    'industry': 'תעשייה',
    'company': 'חברה',
    'position': 'תפקיד'
  }
};

// Language detection function
function detectLanguage() {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  if (langParam && ['ar', 'en', 'he'].includes(langParam)) {
    return langParam;
  }

  // Check localStorage
  const savedLang = localStorage.getItem('harmony-language');
  if (savedLang && ['ar', 'en', 'he'].includes(savedLang)) {
    return savedLang;
  }

  // Check browser language
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang.startsWith('ar')) return 'ar';
  if (browserLang.startsWith('he')) return 'he';
  if (browserLang.startsWith('en')) return 'en';

  // Check user's location (rough approximation)
  // This could be enhanced with a proper geolocation service
  if (browserLang.includes('IL')) return 'he';

  // Default to Arabic for Harmony community
  return 'ar';
}

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('ar');
  const [direction, setDirection] = useState('rtl');

  useEffect(() => {
    const detectedLang = detectLanguage();
    setLanguage(detectedLang);
  }, []);

  useEffect(() => {
    // Set document direction
    const dir = language === 'ar' || language === 'he' ? 'rtl' : 'ltr';
    setDirection(dir);
    document.documentElement.dir = dir;
    document.documentElement.lang = language;

    // Save to localStorage
    localStorage.setItem('harmony-language', language);
  }, [language]);

  const t = (key, fallback = key) => {
    return translations[language]?.[key] || translations['ar'][key] || fallback;
  };

  const changeLanguage = (newLang) => {
    if (['ar', 'en', 'he'].includes(newLang)) {
      setLanguage(newLang);
    }
  };

  const getAvailableLanguages = () => [
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'he', name: 'עברית', flag: '🇮🇱' }
  ];

  return (
    <LanguageContext.Provider value={{
      language,
      direction,
      t,
      changeLanguage,
      getAvailableLanguages,
      isRTL: direction === 'rtl',
      isLTR: direction === 'ltr'
    }}>
      {children}
    </LanguageContext.Provider>
  );
};
