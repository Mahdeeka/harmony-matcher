import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Shield, Sparkles, Star, TrendingUp, Users } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';
import ThemeToggle from '../components/ThemeToggle';

function Home() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-harmony-600 to-harmony-800">
      {/* Header */}
      <header className="relative container mx-auto px-4 py-6 safe-area-top">
        <div className={`flex items-center justify-between transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg animate-bounce-subtle">
              <Users className="w-7 h-7 text-harmony-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Harmony Matcher</h1>
              <p className="text-harmony-200 text-sm">نظام التواصل الذكي</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <ThemeToggle />
            <Link
              to="/admin"
              className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white px-6 py-3 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20 btn-touch"
            >
              لوحة التحكم
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative container mx-auto px-4 py-8 md:py-16">
        <div className={`text-center max-w-4xl mx-auto transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 text-white px-6 py-3 rounded-full mb-8 border border-white/20 backdrop-blur-sm animate-pulse-attention">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">639+ عضو في Harmony متصل</span>
          </div>

          {/* AI Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full mb-6 animate-bounce-subtle">
            <Sparkles className="w-5 h-5" />
            <span>مدعوم بالذكاء الاصطناعي</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            اكتشف أفضل الاتصالات المهنية
            <br />
            <span className="text-harmony-200">في فعاليات Harmony</span>
          </h1>

          <p className="text-lg sm:text-xl text-harmony-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            نظام ذكي يحلل ملفات المشاركين ويقترح أفضل التطابقات المهنية
            لتحقيق أقصى استفادة من فعاليات التواصل
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/admin"
              className="bg-white text-harmony-700 hover:bg-harmony-50 active:bg-harmony-100 font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 btn-touch"
            >
              <Sparkles className="w-5 h-5" />
              إنشاء فعالية جديدة
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <button
              type="button"
              className="bg-transparent border-2 border-white/30 hover:border-white/50 text-white font-medium py-4 px-8 rounded-xl transition-all duration-200 backdrop-blur-sm hover:bg-white/10 active:bg-white/20 flex items-center justify-center gap-2 btn-touch"
            >
              <Users className="w-5 h-5" />
              مشاهدة العرض التوضيحي
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">639+</div>
              <div className="text-sm text-harmony-200">عضو في Harmony</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">95%</div>
              <div className="text-sm text-harmony-200">رضا المستخدمين</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">500+</div>
              <div className="text-sm text-harmony-200">فعالية ناجحة</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">24/7</div>
              <div className="text-sm text-harmony-200">دعم فني</div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className={`grid md:grid-cols-3 gap-6 mt-16 md:mt-24 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 dark:border-gray-700/50 hover:bg-white/15 dark:hover:bg-gray-700/30 transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">مطابقة ذكية</h3>
            <p className="text-harmony-200 leading-relaxed">
              خوارزميات الذكاء الاصطناعي المتقدمة تحلل الملفات الشخصية وتقترح أفضل التطابقات المهنية بدقة عالية
            </p>
            <div className="flex items-center justify-center gap-1 mt-3 text-yellow-300">
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
            </div>
          </div>

          <div className="bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 dark:border-gray-700/50 hover:bg-white/15 dark:hover:bg-gray-700/30 transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">سهولة الاستخدام</h3>
            <p className="text-harmony-200 leading-relaxed">
              تجربة مستخدم سلسة مع واجهة متجاوبة تماماً. المشاركون يدخلون برقم الهاتف فقط ويرون التطابقات فوراً
            </p>
            <div className="flex items-center justify-center gap-1 mt-3 text-green-300">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">سرعة عالية</span>
            </div>
          </div>

          <div className="bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 dark:border-gray-700/50 hover:bg-white/15 dark:hover:bg-gray-700/30 transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">خصوصية وأمان</h3>
            <p className="text-harmony-200 leading-relaxed">
              أعلى معايير الأمان والخصوصية. التحقق عبر رمز SMS آمن مع تشفير شامل لبياناتك الشخصية
            </p>
            <div className="flex items-center justify-center gap-1 mt-3 text-blue-300">
              <Shield className="w-4 h-4" />
              <span className="text-sm">GDPR Compliant</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={`text-center mt-16 transition-all duration-700 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-flex items-center gap-2 text-harmony-200 animate-bounce">
            <span className="text-sm">اكتشف المزيد</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative container mx-auto px-4 py-8 text-center text-harmony-200 safe-area-bottom">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2024 Harmony Community. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4 text-sm">
            <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
            <a href="#" className="hover:text-white transition-colors">الشروط والأحكام</a>
            <a href="#" className="hover:text-white transition-colors">الدعم</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
