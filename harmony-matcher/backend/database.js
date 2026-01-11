const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'harmony-matcher.db');

let db = null;

// Wrapper to make sql.js compatible with better-sqlite3 API
class DatabaseWrapper {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    const self = this;
    return {
      run: (...params) => {
        try {
          console.log('Executing SQL:', sql, 'with params:', params);
          const result = self.database.run(sql, params);
          console.log('SQL execution result:', result);
        self.save();

          // For INSERT/UPDATE/DELETE, sql.js doesn't have getRowsModified
          // We need to check if the operation was successful
          // For INSERT, we can check if the result has insertId or changes
          let changes = 0;
          if (result.insertId !== undefined) {
            changes = 1; // INSERT operation successful
          } else if (sql.toUpperCase().includes('UPDATE') || sql.toUpperCase().includes('DELETE')) {
            // For UPDATE/DELETE, we could try to count affected rows differently
            changes = 1; // Assume successful for now
          }

          console.log('Changes detected:', changes);
          return { changes };
        } catch (error) {
          console.error('Database run error:', error);
          throw error;
        }
      },
      get: (...params) => {
        const stmt = self.database.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        const results = [];
        const stmt = self.database.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }

  exec(sql) {
    this.database.exec(sql);
    this.save();
  }

  pragma(sql) {
    this.database.exec(`PRAGMA ${sql}`);
  }

  transaction(fn) {
    return (...args) => {
      this.database.exec('BEGIN TRANSACTION');
      try {
        fn(...args);
        this.database.exec('COMMIT');
        this.save();
      } catch (error) {
        this.database.exec('ROLLBACK');
        throw error;
      }
    };
  }

  save() {
    const data = this.database.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new DatabaseWrapper(new SQL.Database(fileBuffer));
  } else {
    db = new DatabaseWrapper(new SQL.Database());
  }

  // Create tables
  db.exec(`
    -- Events table
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_ar TEXT,
      description TEXT,
      date TEXT,
      location TEXT,
      created_by TEXT,
      matching_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Attendees table
    CREATE TABLE IF NOT EXISTS attendees (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      title TEXT,
      company TEXT,
      industry TEXT,
      professional_bio TEXT,
      personal_bio TEXT,
      skills TEXT,
      looking_for TEXT,
      offering TEXT,
      linkedin_url TEXT,
      photo_url TEXT,
      location TEXT,
      languages TEXT,
      harmony_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE(event_id, phone)
    );

    -- Matches table
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      attendee_id TEXT NOT NULL,
      matched_attendee_id TEXT NOT NULL,
      match_score REAL,
      match_type TEXT,
      reasoning TEXT,
      reasoning_ar TEXT,
      conversation_starters TEXT,
      batch_number INTEGER DEFAULT 1,
      is_mutual INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE,
      FOREIGN KEY (matched_attendee_id) REFERENCES attendees(id) ON DELETE CASCADE
    );

    -- OTP codes table
    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Conversations table
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      participant1_id TEXT NOT NULL,
      participant2_id TEXT NOT NULL,
      last_message TEXT,
      last_message_time TEXT,
      unread_count1 INTEGER DEFAULT 0,
      unread_count2 INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (participant1_id) REFERENCES attendees(id) ON DELETE CASCADE,
      FOREIGN KEY (participant2_id) REFERENCES attendees(id) ON DELETE CASCADE,
      UNIQUE(event_id, participant1_id, participant2_id)
    );

    -- Messages table
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES attendees(id) ON DELETE CASCADE
    );

    -- Admin users table
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Challenges master table (predefined challenges)
    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      description_ar TEXT NOT NULL,
      description_en TEXT NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_value INTEGER DEFAULT 1,
      default_points INTEGER DEFAULT 10,
      badge_color TEXT DEFAULT 'blue',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Event challenges (which challenges are active for each event)
    CREATE TABLE IF NOT EXISTS event_challenges (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      points INTEGER NOT NULL,
      custom_trigger_value INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
      UNIQUE(event_id, challenge_id)
    );

    -- Attendee challenge progress
    CREATE TABLE IF NOT EXISTS attendee_challenges (
      id TEXT PRIMARY KEY,
      attendee_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      completed_at TEXT,
      points_earned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
      UNIQUE(attendee_id, challenge_id)
    );

    -- Attendee points summary (for leaderboard)
    CREATE TABLE IF NOT EXISTS attendee_points (
      id TEXT PRIMARY KEY,
      attendee_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      total_points INTEGER DEFAULT 0,
      challenges_completed INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE(attendee_id, event_id)
    );
  `);

  // Create indexes
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_attendees_event ON attendees(event_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_attendees_phone ON attendees(phone)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_matches_attendee ON matches(attendee_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_matches_event ON matches(event_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_event_challenges_event ON event_challenges(event_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_attendee_challenges_attendee ON attendee_challenges(attendee_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_attendee_points_event ON attendee_points(event_id)`);
  } catch (e) {
    // Indexes might already exist
  }

  // Seed default challenges if they don't exist
  const existingChallenges = db.prepare(`SELECT COUNT(*) as count FROM challenges`).get();
  if (existingChallenges.count === 0) {
    const defaultChallenges = [
      // Connection Challenges
      { key: 'first_contact', name_ar: 'أول تواصل', name_en: 'First Contact', description_ar: 'أرسل رسالتك الأولى', description_en: 'Send your first message', icon: 'MessageCircle', category: 'connection', trigger_type: 'messages_sent', trigger_value: 1, default_points: 10, badge_color: 'blue' },
      { key: 'conversation_starter', name_ar: 'محفز الحوار', name_en: 'Conversation Starter', description_ar: 'استخدم 3 نقاط نقاش مقترحة', description_en: 'Use 3 suggested conversation starters', icon: 'Lightbulb', category: 'connection', trigger_type: 'starters_used', trigger_value: 3, default_points: 15, badge_color: 'yellow' },
      { key: 'the_trio', name_ar: 'الثلاثي', name_en: 'The Trio', description_ar: 'تواصل مع 3 أشخاص', description_en: 'Connect with 3 people', icon: 'Users', category: 'connection', trigger_type: 'connections_made', trigger_value: 3, default_points: 20, badge_color: 'green' },
      { key: 'high_five', name_ar: 'الخماسي', name_en: 'High Five', description_ar: 'تواصل مع 5 أشخاص', description_en: 'Connect with 5 people', icon: 'Hand', category: 'connection', trigger_type: 'connections_made', trigger_value: 5, default_points: 30, badge_color: 'purple' },
      { key: 'network_master', name_ar: 'سيد الشبكات', name_en: 'Network Master', description_ar: 'تواصل مع 10 أشخاص', description_en: 'Connect with 10 people', icon: 'Crown', category: 'connection', trigger_type: 'connections_made', trigger_value: 10, default_points: 50, badge_color: 'gold' },

      // Quality Challenges
      { key: 'perfect_match', name_ar: 'التطابق المثالي', name_en: 'Perfect Match', description_ar: 'راسل شخص بتوافق 90%+', description_en: 'Message someone with 90%+ match', icon: 'Star', category: 'quality', trigger_type: 'high_score_contact', trigger_value: 90, default_points: 25, badge_color: 'gold' },
      { key: 'mutual_connection', name_ar: 'تطابق متبادل', name_en: 'Mutual Connection', description_ar: 'حقق تطابق متبادل', description_en: 'Achieve a mutual match', icon: 'Heart', category: 'quality', trigger_type: 'mutual_match', trigger_value: 1, default_points: 30, badge_color: 'pink' },
      { key: 'deep_conversation', name_ar: 'حوار عميق', name_en: 'Deep Conversation', description_ar: 'تبادل 5+ رسائل مع شخص', description_en: 'Exchange 5+ messages with someone', icon: 'MessageSquare', category: 'quality', trigger_type: 'conversation_depth', trigger_value: 5, default_points: 35, badge_color: 'indigo' },

      // Discovery Challenges
      { key: 'industry_hopper', name_ar: 'مستكشف القطاعات', name_en: 'Industry Hopper', description_ar: 'تواصل مع 3 قطاعات مختلفة', description_en: 'Connect with 3 different industries', icon: 'Briefcase', category: 'discovery', trigger_type: 'industries_contacted', trigger_value: 3, default_points: 25, badge_color: 'teal' },
      { key: 'the_explorer', name_ar: 'المستكشف', name_en: 'The Explorer', description_ar: 'استعرض 20 ملف شخصي', description_en: 'View 20 profiles', icon: 'Eye', category: 'discovery', trigger_type: 'profiles_viewed', trigger_value: 20, default_points: 15, badge_color: 'cyan' },
      { key: 'bookmark_collector', name_ar: 'جامع المفضلات', name_en: 'Bookmark Collector', description_ar: 'احفظ 5 تطابقات', description_en: 'Save 5 matches', icon: 'Bookmark', category: 'discovery', trigger_type: 'matches_saved', trigger_value: 5, default_points: 10, badge_color: 'orange' },

      // Match Type Challenges
      { key: 'find_mentor', name_ar: 'ابحث عن مرشد', name_en: 'Find a Mentor', description_ar: 'تواصل مع تطابق من نوع إرشاد', description_en: 'Connect with a mentorship match', icon: 'GraduationCap', category: 'match_type', trigger_type: 'match_type_contact', trigger_value: 1, default_points: 20, badge_color: 'emerald' },
      { key: 'collaboration_mode', name_ar: 'وضع التعاون', name_en: 'Collaboration Mode', description_ar: 'راسل تطابق تعاوني', description_en: 'Message a collaborative match', icon: 'Handshake', category: 'match_type', trigger_type: 'match_type_contact', trigger_value: 1, default_points: 20, badge_color: 'blue' },
      { key: 'serendipity_seeker', name_ar: 'باحث الصدفة', name_en: 'Serendipity Seeker', description_ar: 'استكشف تطابق صدفة', description_en: 'Explore a serendipity match', icon: 'Sparkles', category: 'match_type', trigger_type: 'match_type_contact', trigger_value: 1, default_points: 25, badge_color: 'violet' },

      // Engagement Challenges
      { key: 'quick_responder', name_ar: 'سريع الرد', name_en: 'Quick Responder', description_ar: 'رد على رسالة خلال 5 دقائق', description_en: 'Reply to a message within 5 minutes', icon: 'Zap', category: 'engagement', trigger_type: 'quick_reply', trigger_value: 1, default_points: 15, badge_color: 'yellow' },
      { key: 'profile_complete', name_ar: 'ملف مكتمل', name_en: 'Profile Complete', description_ar: 'أكمل جميع معلومات ملفك', description_en: 'Complete all profile information', icon: 'CheckCircle', category: 'engagement', trigger_type: 'profile_complete', trigger_value: 100, default_points: 20, badge_color: 'green' }
    ];

    for (const challenge of defaultChallenges) {
      const id = require('uuid').v4();
      db.prepare(`
        INSERT INTO challenges (id, key, name_ar, name_en, description_ar, description_en, icon, category, trigger_type, trigger_value, default_points, badge_color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, challenge.key, challenge.name_ar, challenge.name_en, challenge.description_ar, challenge.description_en, challenge.icon, challenge.category, challenge.trigger_type, challenge.trigger_value, challenge.default_points, challenge.badge_color);
    }
    console.log('✅ Default challenges seeded');
  }

  console.log('✅ Database initialized successfully');
  return db;
}

// Get database instance
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

module.exports = { initDatabase, getDb };
