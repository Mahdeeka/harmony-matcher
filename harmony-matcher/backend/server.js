require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { initDatabase, getDb } = require('./database');
const { sendOTP, verifyOTP } = require('./services/sms');
const { generateMatches, generateMoreMatches } = require('./services/matching');
const { importFromHarmonyAPI } = require('./services/harmony');
const { parseExcel } = require('./services/excel');
const { generateToken, verifyToken } = require('./services/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { phone, eventId } = req.body;
    const db = getDb();
    
    if (!phone) return res.status(400).json({ error: 'رقم الهاتف مطلوب' });

    const attendee = db.prepare(`SELECT * FROM attendees WHERE phone = ? AND event_id = ?`).get(phone, eventId);
    if (!attendee) return res.status(404).json({ error: 'لم يتم العثور على رقم الهاتف في قائمة المشاركين' });

    await sendOTP(phone);
    res.json({ success: true, message: 'تم إرسال رمز التحقق' });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ error: 'فشل في إرسال رمز التحقق' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, code, eventId } = req.body;
    const db = getDb();
    
    const isValid = verifyOTP(phone, code);
    if (!isValid) return res.status(400).json({ error: 'رمز التحقق غير صحيح أو منتهي الصلاحية' });

    const attendee = db.prepare(`SELECT * FROM attendees WHERE phone = ? AND event_id = ?`).get(phone, eventId);
    if (!attendee) return res.status(404).json({ error: 'لم يتم العثور على المشارك' });

    const token = generateToken({ attendeeId: attendee.id, eventId });
    res.json({ 
      success: true, token,
      attendee: { id: attendee.id, name: attendee.name, phone: attendee.phone, photo_url: attendee.photo_url }
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ error: 'فشل في التحقق' });
  }
});

// ============================================
// EVENT ROUTES
// ============================================

app.post('/api/events', (req, res) => {
  try {
    const db = getDb();
    const { name, name_ar, description, date, location } = req.body;
    const id = uuidv4();
    db.prepare(`INSERT INTO events (id, name, name_ar, description, date, location) VALUES (?, ?, ?, ?, ?, ?)`).run(id, name, name_ar, description, date, location);
    res.json({ success: true, event: { id, name, name_ar, description, date, location } });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'فشل في إنشاء الحدث' });
  }
});

app.get('/api/events', (req, res) => {
  try {
    const db = getDb();
    const events = db.prepare(`SELECT e.*, (SELECT COUNT(*) FROM attendees WHERE event_id = e.id) as attendee_count FROM events e ORDER BY created_at DESC`).all();
    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'فشل في جلب الأحداث' });
  }
});

app.get('/api/events/:id', (req, res) => {
  try {
    const db = getDb();
    const event = db.prepare(`SELECT e.*, (SELECT COUNT(*) FROM attendees WHERE event_id = e.id) as attendee_count FROM events e WHERE e.id = ?`).get(req.params.id);
    if (!event) return res.status(404).json({ error: 'الحدث غير موجود' });
    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'فشل في جلب الحدث' });
  }
});

app.delete('/api/events/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'فشل في حذف الحدث' });
  }
});

// ============================================
// ATTENDEE ROUTES
// ============================================

app.post('/api/events/:eventId/upload', upload.single('file'), async (req, res) => {
  try {
    const db = getDb();
    const { eventId } = req.params;
    const attendees = parseExcel(req.file.path, eventId);
    
    for (const a of attendees) {
      db.prepare(`INSERT OR REPLACE INTO attendees (id, event_id, name, phone, email, title, company, industry, professional_bio, personal_bio, skills, looking_for, offering, linkedin_url, photo_url, location, languages) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(a.id, eventId, a.name, a.phone, a.email, a.title, a.company, a.industry, a.professional_bio, a.personal_bio, a.skills, a.looking_for, a.offering, a.linkedin_url, a.photo_url, a.location, a.languages);
    }
    
    res.json({ success: true, message: `تم استيراد ${attendees.length} مشارك بنجاح`, count: attendees.length });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'فشل في استيراد الملف: ' + error.message });
  }
});

app.post('/api/events/:eventId/import-harmony', async (req, res) => {
  try {
    const result = await importFromHarmonyAPI(req.params.eventId, req.body.selectedIds);
    res.json({ success: true, message: `تم استيراد ${result.count} عضو من Harmony`, count: result.count });
  } catch (error) {
    console.error('Harmony import error:', error);
    res.status(500).json({ error: 'فشل في الاستيراد من Harmony' });
  }
});

app.get('/api/harmony/members', async (req, res) => {
  try {
    const response = await fetch(process.env.HARMONY_API_URL);
    const data = await response.json();
    res.json({ members: data.items, total: data.total });
  } catch (error) {
    console.error('Harmony fetch error:', error);
    res.status(500).json({ error: 'فشل في جلب أعضاء Harmony' });
  }
});

app.get('/api/events/:eventId/attendees', (req, res) => {
  try {
    const db = getDb();
    const attendees = db.prepare(`SELECT * FROM attendees WHERE event_id = ? ORDER BY name`).all(req.params.eventId);
    res.json({ attendees });
  } catch (error) {
    console.error('Get attendees error:', error);
    res.status(500).json({ error: 'فشل في جلب المشاركين' });
  }
});

app.post('/api/events/:eventId/attendees', (req, res) => {
  try {
    const db = getDb();
    const { eventId } = req.params;
    const a = req.body;
    const id = uuidv4();
    db.prepare(`INSERT INTO attendees (id, event_id, name, phone, email, title, company, industry, professional_bio, personal_bio, skills, looking_for, offering, linkedin_url, photo_url, location, languages) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, eventId, a.name, a.phone, a.email, a.title, a.company, a.industry, a.professional_bio, a.personal_bio, a.skills, a.looking_for, a.offering, a.linkedin_url, a.photo_url, a.location, a.languages);
    res.json({ success: true, attendee: { id, ...a } });
  } catch (error) {
    console.error('Add attendee error:', error);
    res.status(500).json({ error: 'فشل في إضافة المشارك' });
  }
});

app.delete('/api/attendees/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM attendees WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete attendee error:', error);
    res.status(500).json({ error: 'فشل في حذف المشارك' });
  }
});

// ============================================
// MATCHING ROUTES
// ============================================

app.post('/api/events/:eventId/generate-matches', async (req, res) => {
  try {
    const db = getDb();
    const { eventId } = req.params;
    db.prepare(`UPDATE events SET matching_status = 'processing' WHERE id = ?`).run(eventId);
    
    generateMatches(eventId)
      .then(() => getDb().prepare(`UPDATE events SET matching_status = 'completed' WHERE id = ?`).run(eventId))
      .catch((error) => {
        console.error('Matching error:', error);
        getDb().prepare(`UPDATE events SET matching_status = 'failed' WHERE id = ?`).run(eventId);
      });
    
    res.json({ success: true, message: 'بدأت عملية المطابقة' });
  } catch (error) {
    console.error('Generate matches error:', error);
    res.status(500).json({ error: 'فشل في بدء المطابقة' });
  }
});

app.get('/api/events/:eventId/matching-status', (req, res) => {
  try {
    const db = getDb();
    const event = db.prepare(`SELECT matching_status FROM events WHERE id = ?`).get(req.params.eventId);
    const matchCount = db.prepare(`SELECT COUNT(DISTINCT attendee_id) as count FROM matches WHERE event_id = ?`).get(req.params.eventId);
    const totalAttendees = db.prepare(`SELECT COUNT(*) as count FROM attendees WHERE event_id = ?`).get(req.params.eventId);
    res.json({ status: event?.matching_status || 'pending', processed: matchCount?.count || 0, total: totalAttendees?.count || 0 });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'فشل في جلب الحالة' });
  }
});

app.get('/api/attendees/:attendeeId/matches', (req, res) => {
  try {
    const db = getDb();
    const matches = db.prepare(`
      SELECT m.*, a.name, a.phone, a.email, a.title, a.company, a.industry, a.professional_bio, a.personal_bio, a.photo_url, a.linkedin_url, a.skills, a.looking_for, a.offering
      FROM matches m JOIN attendees a ON m.matched_attendee_id = a.id
      WHERE m.attendee_id = ? ORDER BY m.match_score DESC
    `).all(req.params.attendeeId);
    res.json({ matches });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'فشل في جلب المطابقات' });
  }
});

app.post('/api/attendees/:attendeeId/more-matches', async (req, res) => {
  try {
    const db = getDb();
    const { attendeeId } = req.params;
    const currentBatch = db.prepare(`SELECT MAX(batch_number) as max_batch FROM matches WHERE attendee_id = ?`).get(attendeeId);
    const nextBatch = (currentBatch?.max_batch || 1) + 1;
    
    await generateMoreMatches(attendeeId, nextBatch);
    
    const newMatches = db.prepare(`
      SELECT m.*, a.name, a.phone, a.email, a.title, a.company, a.industry, a.professional_bio, a.personal_bio, a.photo_url, a.linkedin_url
      FROM matches m JOIN attendees a ON m.matched_attendee_id = a.id
      WHERE m.attendee_id = ? AND m.batch_number = ? ORDER BY m.match_score DESC
    `).all(attendeeId, nextBatch);
    
    res.json({ matches: newMatches, batch: nextBatch });
  } catch (error) {
    console.error('More matches error:', error);
    res.status(500).json({ error: 'فشل في جلب مطابقات إضافية' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Start server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Admin Dashboard: http://localhost:3000/admin`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
