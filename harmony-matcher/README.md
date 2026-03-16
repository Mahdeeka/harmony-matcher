# Harmony Matcher - نظام التواصل الذكي 🤝

نظام ذكي لمطابقة المشاركين في فعاليات Harmony Community باستخدام الذكاء الاصطناعي (Claude API).

## الميزات ✨

- **مطابقة بالذكاء الاصطناعي**: Claude يحلل الملفات الشخصية ويقترح أفضل التطابقات
- **تسجيل دخول سهل**: عبر رقم الهاتف ورمز SMS فقط
- **واجهة عربية**: تصميم RTL كامل
- **تطابق متبادل**: إظهار التطابقات المتبادلة
- **تواصل مباشر**: اتصال/واتساب بنقرة واحدة

## المتطلبات 📋

- Node.js 18+
- npm أو yarn

## التثبيت 🚀

### 1. تثبيت المكتبات

```bash
# Backend
cd harmony-matcher/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. إعداد ملف البيئة

الملف `.env` في مجلد `backend` جاهز بالفعل مع:
- Claude API Key
- Twilio Credentials
- رقم Twilio للـ SMS

### 3. تشغيل النظام

```bash
# Terminal 1 - Backend (Port 3001)
cd backend
npm run dev

# Terminal 2 - Frontend (Port 3000)
cd frontend
npm run dev
```

### 4. فتح النظام

- **لوحة التحكم**: http://localhost:3000/admin
- **صفحة المشارك**: http://localhost:3000/event/{eventId}

## كيفية الاستخدام 📖

### للمدير (منظم الفعالية)

1. افتح http://localhost:3000/admin
2. اضغط "فعالية جديدة"
3. أدخل اسم الفعالية والتاريخ
4. أضف المشاركين بإحدى الطرق:
   - **رفع Excel**: ملف يحتوي على الأسماء والهواتف والتفاصيل
   - **استيراد من Harmony**: لأعضاء Harmony
   - **إضافة يدوية**: مشارك تلو الآخر
5. اضغط "بدء المطابقة بالذكاء الاصطناعي"
6. انتظر انتهاء المطابقة
7. شارك رابط الفعالية مع المشاركين

### للمشارك

1. افتح الرابط المرسل من المنظم
2. أدخل رقم هاتفك
3. أدخل رمز التحقق المرسل عبر SMS
4. شاهد التطابقات المقترحة
5. تواصل مع الأشخاص المناسبين

## هيكل ملف Excel 📊

| العمود | مطلوب | الوصف |
|--------|-------|-------|
| الاسم / name | ✅ | الاسم الكامل |
| الهاتف / phone | ✅ | رقم الهاتف (05XXXXXXXX) |
| المسمى الوظيفي / title | - | المنصب الحالي |
| الشركة / company | - | جهة العمل |
| المجال / industry | - | مجال العمل |
| نبذة مهنية / professional_bio | - | خلفية مهنية |
| المهارات / skills | - | المهارات والخبرات |
| يبحث عن / looking_for | - | ما يبحث عنه |
| يقدم / offering | - | ما يمكنه تقديمه |
| البريد الإلكتروني / email | - | للتواصل |
| لينكدإن / linkedin | - | رابط الملف الشخصي |

## API Endpoints 🔌

### الفعاليات
- `GET /api/events` - جلب جميع الفعاليات
- `POST /api/events` - إنشاء فعالية
- `GET /api/events/:id` - جلب فعالية محددة
- `DELETE /api/events/:id` - حذف فعالية

### المشاركون
- `GET /api/events/:id/attendees` - جلب المشاركين
- `POST /api/events/:id/upload` - رفع ملف Excel
- `POST /api/events/:id/attendees` - إضافة مشارك
- `DELETE /api/attendees/:id` - حذف مشارك

### المطابقة
- `POST /api/events/:id/generate-matches` - بدء المطابقة
- `GET /api/events/:id/matching-status` - حالة المطابقة
- `GET /api/attendees/:id/matches` - جلب التطابقات
- `POST /api/attendees/:id/more-matches` - تطابقات إضافية

### المصادقة
- `POST /api/auth/request-otp` - طلب رمز التحقق
- `POST /api/auth/verify-otp` - التحقق من الرمز

## التكنولوجيا المستخدمة 🛠️

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, Vite, Tailwind CSS
- **AI**: Claude API (Anthropic)
- **SMS**: Twilio
- **Auth**: JWT + OTP

## ملاحظات هامة ⚠️

1. **Twilio**: تأكد من تفعيل رقم Twilio لإرسال SMS دولياً
2. **Claude API**: الاستخدام يخضع للتكلفة (~$0.01 لكل 5 تطابقات)
3. **الخصوصية**: أرقام الهواتف تظهر فقط للمشاركين المسجلين

## الدعم 💬

للأسئلة أو المشاكل، تواصل مع فريق Harmony Community.

---

صُنع بـ ❤️ لمجتمع Harmony
