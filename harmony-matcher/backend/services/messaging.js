const { getDb } = require('../database');
const { v4: uuidv4 } = require('uuid');

async function createOrGetConversation(eventId, participant1Id, participant2Id) {
  const db = getDb();

  // Ensure consistent ordering of participant IDs
  const [p1, p2] = participant1Id < participant2Id ? [participant1Id, participant2Id] : [participant2Id, participant1Id];

  // Try to find existing conversation
  let conversation = db.prepare(`
    SELECT * FROM conversations
    WHERE event_id = ? AND participant1_id = ? AND participant2_id = ?
  `).get(eventId, p1, p2);

  if (!conversation) {
    // Create new conversation
    const conversationId = uuidv4();
    db.prepare(`
      INSERT INTO conversations (id, event_id, participant1_id, participant2_id)
      VALUES (?, ?, ?, ?)
    `).run(conversationId, eventId, p1, p2);

    conversation = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(conversationId);
  }

  return conversation;
}

async function sendMessage(conversationId, senderId, content, messageType = 'text') {
  const db = getDb();
  const messageId = uuidv4();

  // Insert message
  db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_id, content, message_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(messageId, conversationId, senderId, content, messageType);

  // Update conversation's last message
  db.prepare(`
    UPDATE conversations
    SET last_message = ?, last_message_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(content, conversationId);

  // Update unread count for the other participant
  const conversation = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(conversationId);
  const isParticipant1 = conversation.participant1_id === senderId;

  // Use separate queries to avoid SQL injection - column names cannot be parameterized
  if (isParticipant1) {
    db.prepare(`
      UPDATE conversations
      SET unread_count2 = unread_count2 + 1
      WHERE id = ?
    `).run(conversationId);
  } else {
    db.prepare(`
      UPDATE conversations
      SET unread_count1 = unread_count1 + 1
      WHERE id = ?
    `).run(conversationId);
  }

  return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(messageId);
}

async function getConversationsForUser(attendeeId, eventId) {
  const db = getDb();

  const conversations = db.prepare(`
    SELECT
      c.*,
      CASE
        WHEN c.participant1_id = ? THEN a2.name
        ELSE a1.name
      END as other_participant_name,
      CASE
        WHEN c.participant1_id = ? THEN a2.photo_url
        ELSE a1.photo_url
      END as other_participant_photo,
      CASE
        WHEN c.participant1_id = ? THEN c.unread_count1
        ELSE c.unread_count2
      END as unread_count
    FROM conversations c
    JOIN attendees a1 ON c.participant1_id = a1.id
    JOIN attendees a2 ON c.participant2_id = a2.id
    WHERE c.event_id = ? AND (c.participant1_id = ? OR c.participant2_id = ?)
    ORDER BY c.last_message_time DESC
  `).all(attendeeId, attendeeId, attendeeId, eventId, attendeeId, attendeeId);

  return conversations;
}

async function getMessages(conversationId, limit = 50, offset = 0) {
  const db = getDb();

  const messages = db.prepare(`
    SELECT
      m.*,
      a.name as sender_name,
      a.photo_url as sender_photo
    FROM messages m
    JOIN attendees a ON m.sender_id = a.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `).all(conversationId, limit, offset);

  return messages.reverse(); // Return in chronological order
}

async function markMessagesAsRead(conversationId, userId) {
  const db = getDb();

  // Mark messages as read
  db.prepare(`
    UPDATE messages
    SET is_read = 1
    WHERE conversation_id = ? AND sender_id != ?
  `).run(conversationId, userId);

  // Reset unread count for this user
  const conversation = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(conversationId);
  const isParticipant1 = conversation.participant1_id === userId;

  // Use separate queries to avoid SQL injection - column names cannot be parameterized
  if (isParticipant1) {
    db.prepare(`
      UPDATE conversations
      SET unread_count1 = 0
      WHERE id = ?
    `).run(conversationId);
  } else {
    db.prepare(`
      UPDATE conversations
      SET unread_count2 = 0
      WHERE id = ?
    `).run(conversationId);
  }
}

async function getUnreadCount(attendeeId, eventId) {
  const db = getDb();

  const result = db.prepare(`
    SELECT SUM(unread_count) as total_unread
    FROM (
      SELECT
        CASE
          WHEN participant1_id = ? THEN unread_count1
          ELSE unread_count2
        END as unread_count
      FROM conversations
      WHERE event_id = ? AND (participant1_id = ? OR participant2_id = ?)
    )
  `).get(attendeeId, eventId, attendeeId, attendeeId);

  return result?.total_unread || 0;
}

module.exports = {
  createOrGetConversation,
  sendMessage,
  getConversationsForUser,
  getMessages,
  markMessagesAsRead,
  getUnreadCount
};
