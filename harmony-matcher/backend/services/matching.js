const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../database');
const { v4: uuidv4 } = require('uuid');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `أنت خبير في بناء العلاقات المهنية والتواصل الشبكي لمجتمع Harmony Community - منصة للمحترفين العرب.

مهمتك: تحليل ملفات المشاركين واقتراح أفضل 5 تطابقات بناءً على:
1. المهارات المتكاملة (شخص يقدم ما يبحث عنه الآخر)
2. التآزر في الصناعة (إمكانية التعاون المهني)
3. المستوى الوظيفي المتشابه
4. فرص الإرشاد (ربط الخبراء بالمبتدئين)
5. الاهتمامات المشتركة

أجب بصيغة JSON فقط.`;

function formatProfile(a) {
  const parts = [`معرف: ${a.id}`, `الاسم: ${a.name}`];
  if (a.title) parts.push(`المسمى: ${a.title}`);
  if (a.company) parts.push(`الشركة: ${a.company}`);
  if (a.industry) parts.push(`المجال: ${a.industry}`);
  if (a.professional_bio) parts.push(`نبذة مهنية: ${a.professional_bio}`);
  if (a.skills) parts.push(`المهارات: ${a.skills}`);
  if (a.looking_for) parts.push(`يبحث عن: ${a.looking_for}`);
  if (a.offering) parts.push(`يقدم: ${a.offering}`);
  return parts.join('\n');
}

async function getMatchesForAttendee(attendee, allAttendees, excludeIds = []) {
  const potential = allAttendees.filter(a => a.id !== attendee.id && !excludeIds.includes(a.id));
  if (potential.length === 0) return [];

  const prompt = `المشارك:
${formatProfile(attendee)}

---
المشاركون المحتملون:
${potential.map(formatProfile).join('\n---\n')}

---
اقترح أفضل 5 تطابقات. لكل تطابق قدم:
- id: معرف المشارك
- score: نسبة التطابق (0-100)
- type: نوع (complementary/similar/mentorship/serendipity)
- reasoning: السبب (2-3 جمل بالعربية)
- conversation_starters: نقاط للنقاش (2-3 مواضيع)

أجب بـ JSON فقط:
{"matches": [{"id": "...", "score": 85, "type": "complementary", "reasoning": "...", "conversation_starters": ["...", "..."]}]}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    
    const result = JSON.parse(jsonMatch[0]);
    return result.matches || [];
  } catch (error) {
    console.error('Claude API error:', error);
    return [];
  }
}

async function generateMatches(eventId) {
  const db = getDb();
  console.log(`🤖 Starting AI matching for event: ${eventId}`);
  
  const attendees = db.prepare(`SELECT * FROM attendees WHERE event_id = ?`).all(eventId);
  if (attendees.length < 2) {
    console.log('Not enough attendees');
    return;
  }

  console.log(`📊 Processing ${attendees.length} attendees...`);
  db.prepare(`DELETE FROM matches WHERE event_id = ?`).run(eventId);

  for (let i = 0; i < attendees.length; i++) {
    const attendee = attendees[i];
    console.log(`Processing ${i + 1}/${attendees.length}: ${attendee.name}`);
    
    try {
      const matches = await getMatchesForAttendee(attendee, attendees);
      
      for (const match of matches) {
        const matchedAttendee = attendees.find(a => a.id === match.id);
        if (!matchedAttendee) continue;
        
        db.prepare(`INSERT INTO matches (id, event_id, attendee_id, matched_attendee_id, match_score, match_type, reasoning_ar, conversation_starters, batch_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          uuidv4(), eventId, attendee.id, match.id, match.score, match.type,
          match.reasoning, JSON.stringify(match.conversation_starters || []), 1
        );
      }
      
      await new Promise(r => setTimeout(r, 500)); // Rate limit
    } catch (error) {
      console.error(`Error matching ${attendee.name}:`, error);
    }
  }

  // Mark mutual matches
  db.prepare(`UPDATE matches SET is_mutual = 1 WHERE event_id = ? AND EXISTS (SELECT 1 FROM matches m2 WHERE m2.attendee_id = matches.matched_attendee_id AND m2.matched_attendee_id = matches.attendee_id AND m2.event_id = matches.event_id)`).run(eventId);
  
  console.log(`✅ Matching complete for event: ${eventId}`);
}

async function generateMoreMatches(attendeeId, batchNumber) {
  const db = getDb();
  const attendee = db.prepare(`SELECT * FROM attendees WHERE id = ?`).get(attendeeId);
  if (!attendee) return;

  const allAttendees = db.prepare(`SELECT * FROM attendees WHERE event_id = ?`).all(attendee.event_id);
  const existing = db.prepare(`SELECT matched_attendee_id FROM matches WHERE attendee_id = ?`).all(attendeeId);
  const excludeIds = existing.map(m => m.matched_attendee_id);

  const matches = await getMatchesForAttendee(attendee, allAttendees, excludeIds);

  for (const match of matches) {
    if (!allAttendees.find(a => a.id === match.id)) continue;
    db.prepare(`INSERT INTO matches (id, event_id, attendee_id, matched_attendee_id, match_score, match_type, reasoning_ar, conversation_starters, batch_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      uuidv4(), attendee.event_id, attendeeId, match.id, match.score, match.type,
      match.reasoning, JSON.stringify(match.conversation_starters || []), batchNumber
    );
  }

  db.prepare(`UPDATE matches SET is_mutual = 1 WHERE event_id = ? AND EXISTS (SELECT 1 FROM matches m2 WHERE m2.attendee_id = matches.matched_attendee_id AND m2.matched_attendee_id = matches.attendee_id AND m2.event_id = matches.event_id)`).run(attendee.event_id);
}

module.exports = { generateMatches, generateMoreMatches };
