const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');

/**
 * Get all available challenges
 */
function getAllChallenges() {
  const db = getDb();
  return db.prepare(`SELECT * FROM challenges ORDER BY category, default_points`).all();
}

/**
 * Get challenges configured for a specific event
 */
function getEventChallenges(eventId) {
  const db = getDb();
  return db.prepare(`
    SELECT
      c.*,
      ec.id as event_challenge_id,
      ec.is_active,
      ec.points,
      COALESCE(ec.custom_trigger_value, c.trigger_value) as effective_trigger_value,
      ec.sort_order
    FROM challenges c
    LEFT JOIN event_challenges ec ON c.id = ec.challenge_id AND ec.event_id = ?
    ORDER BY ec.sort_order, c.category, c.default_points
  `).all(eventId);
}

/**
 * Get active challenges for an event (only enabled ones)
 */
function getActiveEventChallenges(eventId) {
  const db = getDb();
  return db.prepare(`
    SELECT
      c.*,
      ec.points,
      COALESCE(ec.custom_trigger_value, c.trigger_value) as effective_trigger_value
    FROM challenges c
    INNER JOIN event_challenges ec ON c.id = ec.challenge_id
    WHERE ec.event_id = ? AND ec.is_active = 1
    ORDER BY ec.sort_order, c.category
  `).all(eventId);
}

/**
 * Configure challenges for an event (admin function)
 */
function configureEventChallenges(eventId, challengeConfigs) {
  const db = getDb();

  // Remove existing configurations for this event
  db.prepare(`DELETE FROM event_challenges WHERE event_id = ?`).run(eventId);

  // Add new configurations
  for (let i = 0; i < challengeConfigs.length; i++) {
    const config = challengeConfigs[i];
    const id = uuidv4();
    db.prepare(`
      INSERT INTO event_challenges (id, event_id, challenge_id, is_active, points, custom_trigger_value, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, eventId, config.challenge_id, config.is_active ? 1 : 0, config.points, config.custom_trigger_value || null, i);
  }

  return { success: true };
}

/**
 * Toggle a single challenge for an event
 */
function toggleEventChallenge(eventId, challengeId, isActive, points = null) {
  const db = getDb();

  // Check if configuration exists
  const existing = db.prepare(`
    SELECT * FROM event_challenges WHERE event_id = ? AND challenge_id = ?
  `).get(eventId, challengeId);

  if (existing) {
    // Update existing
    if (points !== null) {
      db.prepare(`
        UPDATE event_challenges SET is_active = ?, points = ? WHERE event_id = ? AND challenge_id = ?
      `).run(isActive ? 1 : 0, points, eventId, challengeId);
    } else {
      db.prepare(`
        UPDATE event_challenges SET is_active = ? WHERE event_id = ? AND challenge_id = ?
      `).run(isActive ? 1 : 0, eventId, challengeId);
    }
  } else {
    // Create new with default points
    const challenge = db.prepare(`SELECT default_points FROM challenges WHERE id = ?`).get(challengeId);
    const id = uuidv4();
    db.prepare(`
      INSERT INTO event_challenges (id, event_id, challenge_id, is_active, points)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, eventId, challengeId, isActive ? 1 : 0, points || challenge.default_points);
  }

  return { success: true };
}

/**
 * Get attendee's challenge progress for an event
 */
function getAttendeeProgress(attendeeId, eventId) {
  const db = getDb();

  // Get active challenges with attendee progress
  const challenges = db.prepare(`
    SELECT
      c.*,
      ec.points,
      COALESCE(ec.custom_trigger_value, c.trigger_value) as target,
      COALESCE(ac.progress, 0) as progress,
      COALESCE(ac.is_completed, 0) as is_completed,
      ac.completed_at,
      ac.points_earned
    FROM challenges c
    INNER JOIN event_challenges ec ON c.id = ec.challenge_id
    LEFT JOIN attendee_challenges ac ON c.id = ac.challenge_id AND ac.attendee_id = ?
    WHERE ec.event_id = ? AND ec.is_active = 1
    ORDER BY ec.sort_order, c.category
  `).all(attendeeId, eventId);

  // Get total points
  const pointsData = db.prepare(`
    SELECT total_points, challenges_completed FROM attendee_points
    WHERE attendee_id = ? AND event_id = ?
  `).get(attendeeId, eventId);

  return {
    challenges,
    totalPoints: pointsData?.total_points || 0,
    challengesCompleted: pointsData?.challenges_completed || 0
  };
}

/**
 * Update attendee's challenge progress
 */
function updateChallengeProgress(attendeeId, eventId, challengeKey, progressIncrement = 1) {
  const db = getDb();

  // Find the challenge
  const challenge = db.prepare(`SELECT * FROM challenges WHERE key = ?`).get(challengeKey);
  if (!challenge) return null;

  // Check if challenge is active for this event
  const eventChallenge = db.prepare(`
    SELECT ec.*, COALESCE(ec.custom_trigger_value, c.trigger_value) as target
    FROM event_challenges ec
    JOIN challenges c ON ec.challenge_id = c.id
    WHERE ec.event_id = ? AND ec.challenge_id = ? AND ec.is_active = 1
  `).get(eventId, challenge.id);

  if (!eventChallenge) return null;

  // Get or create attendee challenge record
  let attendeeChallenge = db.prepare(`
    SELECT * FROM attendee_challenges
    WHERE attendee_id = ? AND challenge_id = ?
  `).get(attendeeId, challenge.id);

  if (!attendeeChallenge) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO attendee_challenges (id, attendee_id, event_id, challenge_id, progress)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, attendeeId, eventId, challenge.id, 0);
    attendeeChallenge = { id, progress: 0, is_completed: 0 };
  }

  // Don't update if already completed
  if (attendeeChallenge.is_completed === 1) {
    return { alreadyCompleted: true, challenge };
  }

  // Update progress
  const newProgress = attendeeChallenge.progress + progressIncrement;
  const isNowCompleted = newProgress >= eventChallenge.target;

  if (isNowCompleted) {
    db.prepare(`
      UPDATE attendee_challenges
      SET progress = ?, is_completed = 1, completed_at = ?, points_earned = ?, updated_at = ?
      WHERE attendee_id = ? AND challenge_id = ?
    `).run(eventChallenge.target, new Date().toISOString(), eventChallenge.points, new Date().toISOString(), attendeeId, challenge.id);

    // Update attendee points
    const existingPoints = db.prepare(`
      SELECT * FROM attendee_points WHERE attendee_id = ? AND event_id = ?
    `).get(attendeeId, eventId);

    if (existingPoints) {
      db.prepare(`
        UPDATE attendee_points
        SET total_points = total_points + ?, challenges_completed = challenges_completed + 1, updated_at = ?
        WHERE attendee_id = ? AND event_id = ?
      `).run(eventChallenge.points, new Date().toISOString(), attendeeId, eventId);
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO attendee_points (id, attendee_id, event_id, total_points, challenges_completed)
        VALUES (?, ?, ?, ?, 1)
      `).run(id, attendeeId, eventId, eventChallenge.points);
    }

    return {
      completed: true,
      challenge,
      pointsEarned: eventChallenge.points,
      newProgress: eventChallenge.target
    };
  } else {
    db.prepare(`
      UPDATE attendee_challenges SET progress = ?, updated_at = ?
      WHERE attendee_id = ? AND challenge_id = ?
    `).run(newProgress, new Date().toISOString(), attendeeId, challenge.id);

    return {
      completed: false,
      challenge,
      newProgress,
      target: eventChallenge.target
    };
  }
}

/**
 * Get event leaderboard
 */
function getEventLeaderboard(eventId, limit = 20) {
  const db = getDb();

  const leaderboard = db.prepare(`
    SELECT
      ap.attendee_id,
      ap.total_points,
      ap.challenges_completed,
      a.name,
      a.photo_url,
      a.title,
      a.company
    FROM attendee_points ap
    JOIN attendees a ON ap.attendee_id = a.id
    WHERE ap.event_id = ?
    ORDER BY ap.total_points DESC, ap.challenges_completed DESC
    LIMIT ?
  `).all(eventId, limit);

  // Add rank
  return leaderboard.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
}

/**
 * Get attendee's rank in leaderboard
 */
function getAttendeeRank(attendeeId, eventId) {
  const db = getDb();

  const attendeePoints = db.prepare(`
    SELECT total_points FROM attendee_points WHERE attendee_id = ? AND event_id = ?
  `).get(attendeeId, eventId);

  if (!attendeePoints) return { rank: null, totalPoints: 0 };

  const higherRanked = db.prepare(`
    SELECT COUNT(*) as count FROM attendee_points
    WHERE event_id = ? AND total_points > ?
  `).get(eventId, attendeePoints.total_points);

  return {
    rank: higherRanked.count + 1,
    totalPoints: attendeePoints.total_points
  };
}

/**
 * Get attendee's completed challenges (for badges display)
 */
function getAttendeeCompletedChallenges(attendeeId, eventId) {
  const db = getDb();

  return db.prepare(`
    SELECT
      c.*,
      ac.completed_at,
      ac.points_earned
    FROM attendee_challenges ac
    JOIN challenges c ON ac.challenge_id = c.id
    WHERE ac.attendee_id = ? AND ac.event_id = ? AND ac.is_completed = 1
    ORDER BY ac.completed_at DESC
  `).all(attendeeId, eventId);
}

/**
 * Initialize challenges for a new attendee (creates progress records)
 */
function initializeAttendeeProgress(attendeeId, eventId) {
  const db = getDb();

  // Get active challenges for this event
  const activeChallenges = getActiveEventChallenges(eventId);

  for (const challenge of activeChallenges) {
    const existing = db.prepare(`
      SELECT * FROM attendee_challenges WHERE attendee_id = ? AND challenge_id = ?
    `).get(attendeeId, challenge.id);

    if (!existing) {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO attendee_challenges (id, attendee_id, event_id, challenge_id, progress)
        VALUES (?, ?, ?, ?, 0)
      `).run(id, attendeeId, eventId, challenge.id);
    }
  }

  // Initialize points record if doesn't exist
  const existingPoints = db.prepare(`
    SELECT * FROM attendee_points WHERE attendee_id = ? AND event_id = ?
  `).get(attendeeId, eventId);

  if (!existingPoints) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO attendee_points (id, attendee_id, event_id, total_points, challenges_completed)
      VALUES (?, ?, ?, 0, 0)
    `).run(id, attendeeId, eventId);
  }
}

/**
 * Quick enable all challenges with defaults for an event
 */
function enableAllChallengesForEvent(eventId) {
  const db = getDb();
  const allChallenges = getAllChallenges();

  for (let i = 0; i < allChallenges.length; i++) {
    const challenge = allChallenges[i];
    const existing = db.prepare(`
      SELECT * FROM event_challenges WHERE event_id = ? AND challenge_id = ?
    `).get(eventId, challenge.id);

    if (!existing) {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO event_challenges (id, event_id, challenge_id, is_active, points, sort_order)
        VALUES (?, ?, ?, 1, ?, ?)
      `).run(id, eventId, challenge.id, challenge.default_points, i);
    }
  }

  return { success: true };
}

module.exports = {
  getAllChallenges,
  getEventChallenges,
  getActiveEventChallenges,
  configureEventChallenges,
  toggleEventChallenge,
  getAttendeeProgress,
  updateChallengeProgress,
  getEventLeaderboard,
  getAttendeeRank,
  getAttendeeCompletedChallenges,
  initializeAttendeeProgress,
  enableAllChallengesForEvent
};
