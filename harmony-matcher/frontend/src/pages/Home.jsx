import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Sparkles, Shield, ArrowLeft } from 'lucide-react';

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-harmony-600 to-harmony-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-harmony-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Harmony Matcher</h1>
              <p className="text-harmony-200 text-sm">نظام التواصل الذكي</p>
            </div>
          </div>
          <Link 
            to="/admin" 
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all"
          >
            لوحة التحكم
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-5 h-5" />
            <span>مدعوم بالذكاء الاصطناعي</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            اكتشف أفضل الاتصالات المهنية
            <br />
            في فعاليات Harmony
          </h2>
          
          <p className="text-xl text-harmony-100 mb-10">
            نظام ذكي يحلل ملفات المشاركين ويقترح أفضل التطابقات المهنية
            لتحقيق أقصى استفادة من فعاليات التواصل
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/admin" 
              className="bg-white text-harmony-700 hover:bg-harmony-50 font-bold py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              إنشاء فعالية جديدة
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">مطابقة ذكية</h3>
            <p className="text-harmony-200">
              الذكاء الاصطناعي يحلل الملفات الشخصية ويقترح أفضل التطابقات
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">سهولة الاستخدام</h3>
            <p className="text-harmony-200">
              المشاركون يدخلون برقم الهاتف فقط ويرون التطابقات فوراً
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">خصوصية وأمان</h3>
            <p className="text-harmony-200">
              بياناتك محمية والتحقق عبر رمز SMS
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-harmony-200">
        <p>© 2024 Harmony Community. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}

export default Home;
