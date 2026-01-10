const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../database');
const { v4: uuidv4 } = require('uuid');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `أنت خبير في بناء العلاقات المهنية والتواصل الشبكي لمجتمع Harmony Community - منصة للمحترفين العرب.

مهمتك المتقدمة: تحليل ملفات المشاركين واقتراح أفضل 5 تطابقات باستخدام خوارزمية ذكية تشمل:

1. المهارات المتكاملة (شخص يقدم ما يبحث عنه الآخر)
2. التآزر في الصناعة (إمكانية التعاون المهني)
3. المستوى الوظيفي المتشابه
4. فرص الإرشاد (ربط الخبراء بالمبتدئين)
5. الاهتمامات المشتركة والقيم المشتركة
6. التوافق الثقافي والجغرافي
7. إمكانية الشراكة التجارية

معايير التقييم المتقدم:
- تحليل الخبرة: مقارنة المستويات الوظيفية وسنوات الخبرة
- تحليل المهارات: تطابق المهارات المطلوبة مع المعروضة
- تحليل الصناعة: تقييم إمكانية التعاون بين الصناعات المختلفة
- تحليل الشخصية: استنتاج من النبذة الشخصية
- تحليل التواصل: تقييم أسلوب التواصل من الملف الشخصي

أجب بصيغة JSON فقط.`;

function formatProfile(a) {
  const parts = [`معرف: ${a.id}`, `الاسم: ${a.name}`];
  if (a.title) parts.push(`المسمى: ${a.title}`);
  if (a.company) parts.push(`الشركة: ${a.company}`);
  if (a.industry) parts.push(`المجال: ${a.industry}`);
  if (a.professional_bio) parts.push(`نبذة مهنية: ${a.professional_bio}`);
  if (a.personal_bio) parts.push(`نبذة شخصية: ${a.personal_bio}`);
  if (a.skills) parts.push(`المهارات: ${a.skills}`);
  if (a.looking_for) parts.push(`يبحث عن: ${a.looking_for}`);
  if (a.offering) parts.push(`يقدم: ${a.offering}`);
  if (a.location) parts.push(`الموقع: ${a.location}`);
  if (a.languages) parts.push(`اللغات: ${a.languages}`);
  return parts.join('\n');
}

function calculateCompatibilityScore(attendee, potential) {
  let score = 0;
  let factors = 0;

  // Skills complementarity (40% weight)
  if (attendee.skills && potential.offering) {
    const attendeeSkills = attendee.skills.toLowerCase();
    const potentialOffering = potential.offering.toLowerCase();
    if (attendeeSkills.includes(potentialOffering) || potentialOffering.includes(attendeeSkills)) {
      score += 40;
    }
    factors++;
  }

  // Industry synergy (25% weight)
  if (attendee.industry && potential.industry) {
    if (attendee.industry === potential.industry) {
      score += 25;
    } else if (attendee.industry.includes('تطوير') && potential.industry.includes('تصميم')) {
      score += 15; // Cross-industry collaboration
    }
  }

  // Location proximity (15% weight)
  if (attendee.location && potential.location) {
    if (attendee.location === potential.location) {
      score += 15;
    } else if (attendee.location.includes('تل أبيب') && potential.location.includes('القدس')) {
      score += 10; // Regional proximity
    }
  }

  // Experience level compatibility (20% weight)
  if (attendee.title && potential.title) {
    const attendeeLevel = getExperienceLevel(attendee.title);
    const potentialLevel = getExperienceLevel(potential.title);

    if (Math.abs(attendeeLevel - potentialLevel) <= 1) {
      score += 20; // Similar experience levels
    } else if ((attendeeLevel > potentialLevel && attendee.offering?.includes('إرشاد')) ||
               (potentialLevel > attendeeLevel && potential.offering?.includes('إرشاد'))) {
      score += 15; // Mentorship opportunity
    }
  }

  return factors > 0 ? Math.round(score / factors) : 0;
}

function getExperienceLevel(title) {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('مدير') || titleLower.includes('رئيس') || titleLower.includes('مؤسس')) {
    return 5; // Senior Executive
  } else if (titleLower.includes('رئيس قسم') || titleLower.includes('team lead')) {
    return 4; // Senior Manager
  } else if (titleLower.includes('مطور رئيسي') || titleLower.includes('senior')) {
    return 3; // Senior Individual Contributor
  } else if (titleLower.includes('مطور') || titleLower.includes('مصمم') || titleLower.includes('محلل')) {
    return 2; // Mid-level
  } else {
    return 1; // Junior/Entry level
  }
}

async function getMatchesForAttendee(attendee, allAttendees, excludeIds = []) {
  const potential = allAttendees.filter(a => a.id !== attendee.id && !excludeIds.includes(a.id));
  if (potential.length === 0) return [];

  // First, calculate compatibility scores for all potential matches
  const scoredPotential = potential.map(p => ({
    ...p,
    compatibilityScore: calculateCompatibilityScore(attendee, p)
  })).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  // Take top 10 candidates for AI analysis
  const topCandidates = scoredPotential.slice(0, 10);

  const prompt = `المشارك الرئيسي:
${formatProfile(attendee)}

---
المرشحون المحتملون (مرتبون حسب التوافق الأساسي):
${topCandidates.map((p, index) => `المرتبة ${index + 1} (توافق أساسي: ${p.compatibilityScore}%):\n${formatProfile(p)}`).join('\n---\n')}

---
اقترح أفضل 5 تطابقات من المرشحين أعلاه. لكل تطابق قدم:
- id: معرف المشارك
- score: نسبة التطابق النهائية (دمج التوافق الأساسي مع التحليل الذكي)
- type: نوع (complementary/collaborative/mentorship/mentee/serendipity)
- reasoning: السبب التفصيلي (2-3 جمل بالعربية)
- conversation_starters: نقاط للنقاش (3-4 مواضيع محددة)
- synergy_factors: العوامل المساهمة في التطابق

أجب بـ JSON فقط:
{"matches": [{"id": "...", "score": 85, "type": "complementary", "reasoning": "...", "conversation_starters": ["...", "..."], "synergy_factors": ["مهارات متكاملة", "تجربة مشتركة"]}]}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const result = JSON.parse(jsonMatch[0]);
    const aiMatches = result.matches || [];

    // Enhance scores by combining AI analysis with compatibility algorithm
    return aiMatches.map(match => {
      const candidate = topCandidates.find(c => c.id === match.id);
      const finalScore = Math.round((match.score * 0.7) + (candidate?.compatibilityScore || 0) * 0.3);
      return {
        ...match,
        score: Math.min(finalScore, 100), // Cap at 100%
        compatibility_score: candidate?.compatibilityScore || 0
      };
    });

  } catch (error) {
    console.error('Claude API error:', error);

    // Fallback to compatibility-based matching if AI fails
    console.log('Falling back to compatibility-based matching');
    return scoredPotential.slice(0, 5).map(candidate => ({
      id: candidate.id,
      score: candidate.compatibilityScore,
      type: 'compatibility',
      reasoning: `تطابق مبني على التوافق الأساسي (${candidate.compatibilityScore}%)`,
      conversation_starters: ['المشاريع الحالية', 'الخبرات المهنية', 'الأهداف المستقبلية']
    }));
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
