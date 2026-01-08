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
  'location': 'location', 'الموقع': 'location', 'city': 'location',
  'languages': 'languages', 'اللغات': 'languages'
};

function parseExcel(filePath, eventId) {
  const workbook = XLSX.readFile(filePath);
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  
  if (data.length === 0) throw new Error('الملف فارغ');
  
  const columns = Object.keys(data[0]);
  const columnMap = {};
  for (const col of columns) {
    const normalized = col.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
    if (COLUMN_MAP[normalized]) columnMap[col] = COLUMN_MAP[normalized];
  }
  
  const mappedFields = Object.values(columnMap);
  if (!mappedFields.includes('name')) throw new Error('الملف يجب أن يحتوي على عمود "الاسم"');
  if (!mappedFields.includes('phone')) throw new Error('الملف يجب أن يحتوي على عمود "الهاتف"');
  
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

module.exports = { parseExcel };
