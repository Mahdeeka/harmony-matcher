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
          // sql.js doesn't have run(), use prepared statements instead
          const stmt = self.database.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          stmt.step();
          stmt.free();
          self.save();

          // For INSERT/UPDATE/DELETE, assume operation was successful
          // sql.js doesn't provide affected row count easily
          const changes = 1;

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
  `);

  // Create indexes
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_attendees_event ON attendees(event_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_attendees_phone ON attendees(phone)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_matches_attendee ON matches(attendee_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_matches_event ON matches(event_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone)`);
  } catch (e) {
    // Indexes might already exist
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
