require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createServer } = require('http');
const { Server } = require('socket.io');

const { initDatabase, getDb } = require('./database');
const { sendOTP, verifyOTP } = require('./services/sms');
const { generateMatches, generateMoreMatches, cancelMatching, getMatchingStatus } = require('./services/matching');
const { importFromHarmonyAPI } = require('./services/harmony');
const { parseExcel } = require('./services/excel');
const { generateToken, verifyToken } = require('./services/auth');
const {
  createOrGetConversation,
  sendMessage,
  getConversationsForUser,
  getMessages,
  markMessagesAsRead,
  getUnreadCount
} = require('./services/messaging');

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:4000",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3001;

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('authenticate', (data) => {
    try {
      const { token } = data;
      const decoded = verifyToken(token);

      if (decoded) {
        socket.userId = decoded.attendeeId;
        socket.eventId = decoded.eventId;
        connectedUsers.set(decoded.attendeeId, socket.id);

        // Join user to their event room
        socket.join(`event_${decoded.eventId}`);

        // Notify others that user is online
        socket.to(`event_${decoded.eventId}`).emit('user_online', decoded.attendeeId);

        console.log(`User ${decoded.attendeeId} authenticated for event ${decoded.eventId}`);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  });

  socket.on('join_conversation', (data) => {
    const { conversationId } = data;
    socket.join(`conversation_${conversationId}`);
    console.log(`User joined conversation: ${conversationId}`);
  });

  socket.on('leave_conversation', (data) => {
    const { conversationId } = data;
    socket.leave(`conversation_${conversationId}`);
    console.log(`User left conversation: ${conversationId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { conversationId, content, messageType = 'text' } = data;

      if (!socket.userId || !content?.trim()) {
        return;
      }

      // Save message to database
      const message = await sendMessage(conversationId, socket.userId, content.trim(), messageType);

      // Get sender info
      const db = getDb();
      const sender = db.prepare(`SELECT name, photo_url FROM attendees WHERE id = ?`).get(socket.userId);

      const messageData = {
        ...message,
        sender_name: sender.name,
        sender_photo: sender.photo_url
      };

      // Broadcast to conversation participants
      io.to(`conversation_${conversationId}`).emit('new_message', {
        conversationId,
        message: messageData
      });

      console.log(`Message sent in conversation ${conversationId} by ${socket.userId}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', { error: 'فشل في إرسال الرسالة' });
    }
  });

  socket.on('start_typing', (data) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      userId: socket.userId,
      conversationId
    });
  });

  socket.on('stop_typing', (data) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
      userId: socket.userId,
      conversationId
    });
  });

  socket.on('mark_conversation_read', async (data) => {
    try {
      const { conversationId } = data;
      if (!socket.userId) return;

      await markMessagesAsRead(conversationId, socket.userId);

      // Notify conversation participants about read status
      socket.to(`conversation_${conversationId}`).emit('conversation_read', {
        conversationId,
        userId: socket.userId
      });
    } catch (error) {
      console.error('Mark conversation read error:', error);
    }
  });

  socket.on('typing_start', (data) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('typing', {
      userId: socket.userId,
      conversationId
    });
  });

  socket.on('typing_stop', (data) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('typing_stop', {
      userId: socket.userId,
      conversationId
    });
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);

      // Notify others that user is offline
      socket.to(`event_${socket.eventId}`).emit('user_offline', socket.userId);
    }

    console.log('User disconnected:', socket.id);
  });
});

// Middleware

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
    const { method = 'phone', phone, email, eventId, rememberDevice } = req.body;
    const db = getDb();

    let attendee;
    let contactValue;

    if (method === 'email') {
      if (!email) return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
      contactValue = email;
      attendee = db.prepare(`SELECT * FROM attendees WHERE email = ? AND event_id = ?`).get(email, eventId);
      if (!attendee) return res.status(404).json({ error: 'لم يتم العثور على البريد الإلكتروني في قائمة المشاركين' });

      // For email, we'll send a magic link instead of OTP
      // In a real implementation, you'd send an email with a secure link
      console.log(`Sending magic link to ${email} for event ${eventId}`);
    } else {
      // Phone method (default)
      if (!phone) return res.status(400).json({ error: 'رقم الهاتف مطلوب' });
      contactValue = phone;
      attendee = db.prepare(`SELECT * FROM attendees WHERE phone = ? AND event_id = ?`).get(phone, eventId);
      if (!attendee) return res.status(404).json({ error: 'لم يتم العثور على رقم الهاتف في قائمة المشاركين' });

      await sendOTP(phone);
    }

    res.json({
      success: true,
      message: method === 'email' ? 'تم إرسال رابط تسجيل الدخول' : 'تم إرسال رمز التحقق'
    });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ error: 'فشل في إرسال رمز التحقق' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { method = 'phone', phone, email, code, eventId, rememberDevice } = req.body;
    const db = getDb();

    let attendee;
    let contactValue;

    if (method === 'email') {
      if (!email) return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
      contactValue = email;

      // For email magic links, we'll accept any code for now
      // In production, you'd verify a secure token from the email link
      if (!code || code.length < 6) return res.status(400).json({ error: 'رمز التحقق غير صالح' });

      attendee = db.prepare(`SELECT * FROM attendees WHERE email = ? AND event_id = ?`).get(email, eventId);
      if (!attendee) return res.status(404).json({ error: 'لم يتم العثور على المشارك' });
    } else {
      // Phone method (default)
      if (!phone) return res.status(400).json({ error: 'رقم الهاتف مطلوب' });
      contactValue = phone;

      const isValid = verifyOTP(phone, code);
      if (!isValid) return res.status(400).json({ error: 'رمز التحقق غير صحيح أو منتهي الصلاحية' });

      attendee = db.prepare(`SELECT * FROM attendees WHERE phone = ? AND event_id = ?`).get(phone, eventId);
      if (!attendee) return res.status(404).json({ error: 'لم يتم العثور على المشارك' });
    }

    const token = generateToken({ attendeeId: attendee.id, eventId });
    res.json({
      success: true, token,
      attendee: {
        id: attendee.id,
        name: attendee.name,
        phone: attendee.phone,
        email: attendee.email,
        photo_url: attendee.photo_url
      }
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
    console.log('Received event creation request:', req.body);
    const db = getDb();
    const { name, name_ar, description = '', date, location } = req.body;
    console.log('Extracted values:', { name, name_ar, description, date, location });

    // Validate required fields
    if (!name || !name_ar) {
      console.error('Missing required fields: name or name_ar');
      return res.status(400).json({ error: 'اسم الفعالية مطلوب' });
    }

    const id = uuidv4();
    console.log('Generated ID:', id);

    console.log('About to execute SQL insert...');
    try {
      // Try using sql.js directly
      const dbInstance = getDb();
      const stmt = dbInstance.database.prepare(`INSERT INTO events (id, name, name_ar, description, date, location) VALUES (?, ?, ?, ?, ?, ?)`);
      stmt.bind([id, name, name_ar, description, date, location]);
      const result = stmt.step();
      stmt.free();
      dbInstance.save();

      console.log('SQL.js insert result:', result);

      // Verify the insert by checking if we can retrieve the event
      console.log('Verifying insert by querying for the new event...');
      const verifyEvent = db.prepare(`SELECT * FROM events WHERE id = ?`).get(id);
      console.log('Verification result:', verifyEvent);

      if (!verifyEvent) {
        console.error('Insert verification failed: event not found after insert');
        return res.status(500).json({ error: 'فشل في إنشاء الحدث - لم يتم حفظ البيانات' });
      }
    } catch (error) {
      console.error('Direct SQL insert error:', error);
      return res.status(500).json({ error: 'فشل في إنشاء الحدث', details: error.message });
    }

    console.log('Event created successfully');
    res.json({ success: true, event: { id, name, name_ar, description, date, location } });
  } catch (error) {
    console.error('Create event error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'فشل في إنشاء الحدث', details: error.message });
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
// MESSAGING ROUTES
// ============================================

app.get('/api/events/:eventId/conversations', async (req, res) => {
  try {
    const { eventId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const decoded = verifyToken(token);
    const conversations = await getConversationsForUser(decoded.attendeeId, eventId);

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'فشل في جلب المحادثات' });
  }
});

app.get('/api/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { limit = 50, offset = 0 } = req.query;

    if (!token) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const messages = await getMessages(conversationId, parseInt(limit), parseInt(offset));
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'فشل في جلب الرسائل' });
  }
});

app.post('/api/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = 'text' } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    if (!content?.trim()) {
      return res.status(400).json({ error: 'محتوى الرسالة مطلوب' });
    }

    const decoded = verifyToken(token);
    const message = await sendMessage(conversationId, decoded.attendeeId, content.trim(), messageType);

    // Emit to Socket.IO for real-time updates
    const db = getDb();
    const conversation = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(conversationId);
    const otherParticipantId = conversation.participant1_id === decoded.attendeeId
      ? conversation.participant2_id
      : conversation.participant1_id;

    // Notify the other participant if they're online
    if (connectedUsers.has(otherParticipantId)) {
      io.to(connectedUsers.get(otherParticipantId)).emit('new_message', {
        conversationId,
        message: {
          ...message,
          sender_name: db.prepare(`SELECT name FROM attendees WHERE id = ?`).get(decoded.attendeeId).name,
          sender_photo: db.prepare(`SELECT photo_url FROM attendees WHERE id = ?`).get(decoded.attendeeId).photo_url
        }
      });
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'فشل في إرسال الرسالة' });
  }
});

app.post('/api/conversations/:conversationId/read', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const decoded = verifyToken(token);
    await markMessagesAsRead(conversationId, decoded.attendeeId);

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'فشل في تحديث حالة القراءة' });
  }
});

app.get('/api/events/:eventId/messages/unread', async (req, res) => {
  try {
    const { eventId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const decoded = verifyToken(token);
    const unreadCount = await getUnreadCount(decoded.attendeeId, eventId);

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'فشل في جلب عدد الرسائل غير المقروءة' });
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
    const { eventId } = req.params;
    const status = getMatchingStatus(eventId);
    res.json(status);
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'فشل في جلب الحالة' });
  }
});

app.post('/api/events/:eventId/cancel-matching', async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await cancelMatching(eventId);
    res.json(result);
  } catch (error) {
    console.error('Cancel matching error:', error);
    res.status(400).json({ error: error.message || 'فشل في إلغاء المطابقة' });
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
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Admin Dashboard: http://localhost:3000/admin`);
      console.log(`💬 WebSocket server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
