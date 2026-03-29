const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const { formatPhoneNumber } = require('./sms');

const COLUMN_MAP = {
  'name': 'name', 'الاسم': 'name', 'full name': 'name', 'الاسم الكامل': 'name',
  'phone': 'phone', 'الهاتف': 'phone', 'رقم الهاتف': 'phone', 'mobile': 'phone', 'الجوال': 'phone',
  'email': 'email', 'البريد الإلكتروني': 'email', 'الايميل': 'email',
  'title': 'title', 'المسمى الوظيفي': 'title', 'job title': 'title', 'الوظيفة': 'title',
  'company': 'company', 'الشركة': 'company', 'organization': 'company', 'المؤسسة': 'company',
  'industry': 'industry', 'المجال': 'industry', 'sector': 'industry',
  'professional_bio': 'professional_bio', 'نبذة مهنية': 'professional_bio', 'bio': 'professional_bio',
  'personal_bio': 'personal_bio', 'نبذة شخصية': 'personal_bio',
  'skills': 'skills', 'المهارات': 'skills', 'expertise': 'skills',
  'looking_for': 'looking_for', 'يبحث عن': 'looking_for', 'looking for': 'looking_for',
  'offering': 'offering', 'يقدم': 'offering', 'can offer': 'offering',
  'linkedin': 'linkedin_url', 'linkedin_url': 'linkedin_url', 'لينكدإن': 'linkedin_url',
  'photo': 'photo_url', 'photo_url': 'photo_url', 'الصورة': 'photo_url',
  'location': 'location', 'الموقع': 'location', 'city': 'location', 'المدينة': 'location',
  'languages': 'languages', 'اللغات': 'languages'
};

// Positional column mapping for Harmony platform exports (headerless format).
// Indices correspond to columns A..AD in the exported spreadsheet.
const HARMONY_POSITION_MAP = {
  0: 'harmony_id',
  1: 'name',
  2: '_education_bio',
  10: 'email',
  13: '_fun_fact',
  17: 'title',
  19: 'linkedin_url',
  24: 'location',
  26: '_personal_hobbies',
  27: 'phone',
  28: '_work_experience',
  29: 'skills'
};

function isPhoneLike(val) {
  if (val === undefined || val === null) return false;
  const s = String(val).trim();
  return /^[\d\+\-\(\)\s]{7,15}$/.test(s);
}

function tryHeaderBasedParse(data, eventId) {
  const columns = Object.keys(data[0]);
  const columnMap = {};
  for (const col of columns) {
    const normalized = col.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
    if (COLUMN_MAP[normalized]) columnMap[col] = COLUMN_MAP[normalized];
  }

  const mappedFields = Object.values(columnMap);
  if (!mappedFields.includes('name') || !mappedFields.includes('phone')) return null;

  const attendees = [];
  const seenPhones = new Set();

  for (const row of data) {
    const attendee = { id: uuidv4(), event_id: eventId };

    for (const [col, field] of Object.entries(columnMap)) {
      let value = row[col];
      if (value !== undefined && value !== null && value !== '') {
        if (field === 'phone') value = formatPhoneNumber(String(value));
        attendee[field] = String(value).trim();
      }
    }

    if (!attendee.name || !attendee.phone || seenPhones.has(attendee.phone)) continue;
    seenPhones.add(attendee.phone);
    attendees.push(attendee);
  }

  return attendees;
}

function tryPositionalParse(rawData, eventId) {
  const checkCount = Math.min(rawData.length, 10);
  let phoneHits = 0;
  let nameHits = 0;

  for (let i = 0; i < checkCount; i++) {
    const row = rawData[i];
    if (!row) continue;
    if (row[27] && isPhoneLike(row[27])) phoneHits++;
    if (row[1] && typeof row[1] === 'string' && row[1].length > 1) nameHits++;
  }

  if (phoneHits < checkCount * 0.5 || nameHits < checkCount * 0.5) return null;

  const attendees = [];
  const seenHarmonyIds = new Set();
  const phoneCounts = {};

  for (const row of rawData) {
    if (!row || !row[1] || !row[27]) continue;

    const raw = {};
    for (const [posStr, field] of Object.entries(HARMONY_POSITION_MAP)) {
      const pos = parseInt(posStr, 10);
      const val = row[pos];
      if (val !== undefined && val !== null && val !== '') {
        raw[field] = String(val).trim();
      }
    }

    if (!raw.name || !raw.phone) continue;

    if (raw.harmony_id) {
      if (seenHarmonyIds.has(raw.harmony_id)) continue;
      seenHarmonyIds.add(raw.harmony_id);
    }

    let phone = formatPhoneNumber(raw.phone);
    phoneCounts[phone] = (phoneCounts[phone] || 0) + 1;
    if (phoneCounts[phone] > 1) {
      phone = phone + String(phoneCounts[phone]).padStart(3, '0');
    }

    const proBioParts = [raw._education_bio, raw._work_experience].filter(Boolean);
    const persBioParts = [raw._fun_fact, raw._personal_hobbies].filter(Boolean);

    attendees.push({
      id: uuidv4(),
      event_id: eventId,
      harmony_id: raw.harmony_id,
      name: raw.name,
      phone,
      email: raw.email,
      title: raw.title,
      professional_bio: proBioParts.join('\n\n') || undefined,
      personal_bio: persBioParts.join('\n\n') || undefined,
      skills: raw.skills,
      linkedin_url: raw.linkedin_url,
      location: raw.location,
    });
  }

  return attendees.length > 0 ? attendees : null;
}

function parseExcel(filePath, eventId) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const headerData = XLSX.utils.sheet_to_json(sheet);
  if (headerData.length > 0) {
    const result = tryHeaderBasedParse(headerData, eventId);
    if (result && result.length > 0) return result;
  }

  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rawData.length > 0) {
    const result = tryPositionalParse(rawData, eventId);
    if (result && result.length > 0) return result;
  }

  throw new Error('لم يتم التعرف على تنسيق الملف. تأكد من وجود أعمدة "الاسم" و"الهاتف"');
}

const TEMPLATE_HEADERS = [
  'الاسم', 'الهاتف', 'البريد الإلكتروني', 'المسمى الوظيفي',
  'الشركة', 'المجال', 'نبذة مهنية', 'نبذة شخصية',
  'المهارات', 'يبحث عن', 'يقدم', 'لينكدإن',
  'الموقع', 'اللغات'
];

function generateTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, 'المشاركين');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function generateExample() {
  const rows = [
    TEMPLATE_HEADERS,
    [
      'أحمد محمد', '0501234567', 'ahmad@example.com', 'مطور برمجيات أول',
      'شركة تكنولوجيا', 'تكنولوجيا المعلومات',
      'مطور Full-Stack بخبرة 5 سنوات في React و Node.js',
      'شغوف بالتكنولوجيا والابتكار',
      'React, Node.js, Python, AWS', 'شراكات تقنية، فرص استثمار',
      'استشارات تقنية، تطوير تطبيقات', 'https://linkedin.com/in/ahmad',
      'تل أبيب', 'العربية، العبرية، الإنجليزية'
    ],
    [
      'فاطمة علي', '0529876543', 'fatima@example.com', 'مصممة UX/UI',
      'استوديو التصميم الإبداعي', 'تصميم وإبداع',
      'مصممة واجهات مستخدم بخبرة 3 سنوات في شركات ناشئة',
      'محبة للفن والتصميم والطبيعة',
      'Figma, Adobe XD, User Research', 'فرص عمل في شركات ناشئة',
      'تصميم واجهات، بحث المستخدمين', 'https://linkedin.com/in/fatima',
      'حيفا', 'العربية، الإنجليزية'
    ],
    [
      'محمد حسن', '0545678901', 'mohammad@example.com', 'مدير مشاريع',
      'شركة استشارات', 'استشارات إدارية',
      'مدير مشاريع بخبرة 7 سنوات في إدارة فرق متعددة التخصصات',
      'يهوى القراءة والسفر واستكشاف ثقافات جديدة',
      'إدارة المشاريع, Agile, Scrum, التخطيط الاستراتيجي',
      'شبكة علاقات مهنية، فرص تدريب',
      'إرشاد مهني، استشارات إدارية', 'https://linkedin.com/in/mohammad',
      'الناصرة', 'العربية، العبرية، الإنجليزية'
    ],
    [
      'سارة يوسف', '0507654321', 'sara@example.com', 'محامية',
      'مكتب محاماة', 'قانون',
      'محامية متخصصة في قانون العمل والشركات',
      'شخصية طموحة تحب العمل التطوعي والمساهمة المجتمعية',
      'القانون التجاري, التفاوض, كتابة العقود',
      'تعاون مع شركات ناشئة، شبكة مهنية',
      'استشارات قانونية، مراجعة عقود', 'https://linkedin.com/in/sara',
      'القدس', 'العربية، العبرية، الإنجليزية، الفرنسية'
    ],
    [
      'خالد إبراهيم', '0523456789', 'khaled@example.com', 'طبيب أسنان',
      'عيادة خاصة', 'طب وصحة',
      'طبيب أسنان بخبرة 4 سنوات مع تخصص في جراحة الفم',
      'يستمتع بالرياضة والسفر والتصوير الفوتوغرافي',
      'طب الأسنان, جراحة الفم, التخدير الموضعي',
      'شراكات مع عيادات، فرص بحث علمي',
      'استشارات طبية، محاضرات في مجال الصحة', 'https://linkedin.com/in/khaled',
      'عكا', 'العربية، العبرية، الإنجليزية'
    ]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, 'المشاركين');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { parseExcel, generateTemplate, generateExample };
