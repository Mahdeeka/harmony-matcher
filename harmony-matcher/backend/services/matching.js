const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../database');
const { v4: uuidv4 } = require('uuid');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Increase timeout for large prompts
  timeout: 60000, // 60 seconds
});

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make API call with retry on rate limit
async function callAnthropicWithRetry(prompt, maxRetries = 1) {
  // Keep retries minimal to avoid long pauses that look like the job stopped.
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      });
      return response;
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        // Short wait (max 5s) then retry once; otherwise fall back immediately.
        const retryAfter = Math.min(5, Number(error.headers?.['retry-after']) || 2);
        console.log(`⏳ Rate limited. Quick retry in ${retryAfter}s (${attempt}/${maxRetries})`);
        await delay(retryAfter * 1000);
      } else {
        throw error;
      }
    }
  }
}

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

function formatProfile(a, compact = false) {
  if (compact) {
    // Compact version for candidates (essential info only)
    return `${a.name}${a.title ? ` - ${a.title}` : ''}${a.company ? ` @ ${a.company}` : ''}${a.industry ? ` (${a.industry})` : ''}`;
  }

  // Full version for main attendee
  const parts = [`الاسم: ${a.name}`];
  if (a.title) parts.push(`المسمى: ${a.title}`);
  if (a.company) parts.push(`الشركة: ${a.company}`);
  if (a.industry) parts.push(`المجال: ${a.industry}`);
  if (a.professional_bio && a.professional_bio.length > 200) {
    parts.push(`نبذة مهنية: ${a.professional_bio.substring(0, 200)}...`);
  } else if (a.professional_bio) {
    parts.push(`نبذة مهنية: ${a.professional_bio}`);
  }
  if (a.skills) parts.push(`المهارات: ${a.skills}`);
  if (a.looking_for) parts.push(`يبحث عن: ${a.looking_for}`);
  if (a.offering) parts.push(`يقدم: ${a.offering}`);
  return parts.join('\n');
}

function calculateCompatibilityScore(attendee, potential) {
  // Normalize scoring by available signals so we don't end up with 0% for most people.
  const norm = (s) => (s || '').toString().toLowerCase();
  const tokenize = (s) => {
    return norm(s)
      .replace(/[^\p{L}\p{N}\s,.-]/gu, ' ')
      .split(/[\s,.-]+/g)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);
  };
  const overlapRatio = (a, b) => {
    const A = new Set(tokenize(a));
    const B = new Set(tokenize(b));
    if (A.size === 0 || B.size === 0) return 0;
    let inter = 0;
    for (const t of A) if (B.has(t)) inter++;
    return inter / Math.max(A.size, B.size);
  };

  let score = 0;
  let possible = 0;

  // Complementarity: attendee looking_for vs potential offering (max 40)
  if (attendee.looking_for && potential.offering) {
    possible += 40;
    const r = overlapRatio(attendee.looking_for, potential.offering);
    score += Math.round(40 * r);
  } else if (attendee.skills && potential.offering) {
    possible += 25;
    const r = overlapRatio(attendee.skills, potential.offering);
    score += Math.round(25 * r);
  }

  // Mutual interests: skills overlap (max 20)
  if (attendee.skills && potential.skills) {
    possible += 20;
    const r = overlapRatio(attendee.skills, potential.skills);
    score += Math.round(20 * r);
  }

  // Industry synergy (max 15)
  if (attendee.industry && potential.industry) {
    possible += 15;
    const aInd = norm(attendee.industry);
    const pInd = norm(potential.industry);
    if (aInd === pInd) score += 15;
    else if (aInd.includes('تطوير') && pInd.includes('تصميم')) score += 10;
    else score += Math.round(15 * overlapRatio(aInd, pInd));
  }

  // Location proximity (max 10)
  if (attendee.location && potential.location) {
    possible += 10;
    const aLoc = norm(attendee.location);
    const pLoc = norm(potential.location);
    if (aLoc === pLoc) score += 10;
    else if ((aLoc.includes('تل') && pLoc.includes('القدس')) || (aLoc.includes('القدس') && pLoc.includes('تل'))) score += 7;
    else score += Math.round(10 * overlapRatio(aLoc, pLoc));
  }

  // Experience compatibility (max 15)
  if (attendee.title && potential.title) {
    possible += 15;
    const attendeeLevel = getExperienceLevel(attendee.title);
    const potentialLevel = getExperienceLevel(potential.title);
    const diff = Math.abs(attendeeLevel - potentialLevel);
    if (diff === 0) score += 15;
    else if (diff === 1) score += 12;
    else if (diff === 2) score += 7;
    else score += 3;
  }

  // Bio similarity (max 10)
  if (attendee.professional_bio && potential.professional_bio) {
    possible += 10;
    score += Math.round(10 * overlapRatio(attendee.professional_bio, potential.professional_bio));
  }

  if (possible === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((score / possible) * 100)));
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

function extractMustMeetTags(attendee) {
  const text = `${attendee.looking_for || ''} ${attendee.offering || ''} ${attendee.skills || ''}`.toLowerCase();
  const tags = new Set();
  const rules = [
    ['funding', ['تمويل', 'مستثمر', 'investment', 'investor', 'fund', 'funding']],
    ['hiring', ['توظيف', 'موظف', 'موظفين', 'hiring', 'hire', 'recruit']],
    ['partnership', ['شراكة', 'شراكات', 'partnership', 'partner', 'collaboration', 'تعاون']],
    ['sales', ['مبيعات', 'sales', 'customers', 'عملاء', 'customer']],
    ['marketing', ['تسويق', 'marketing', 'growth', 'نمو']],
    ['tech', ['تقني', 'تطوير', 'برمجة', 'developer', 'engineering', 'tech']],
    ['design', ['تصميم', 'designer', 'design', 'ui', 'ux']],
    ['mentorship', ['إرشاد', 'mentor', 'mentorship', 'coaching']],
  ];
  for (const [tag, words] of rules) {
    if (words.some(w => text.includes(w))) tags.add(tag);
  }
  return [...tags];
}

function buildSynergyFactors(attendee, candidate) {
  const factors = [];
  if (attendee.looking_for && candidate.offering) factors.push('مهارات/احتياج متكامل');
  if (attendee.industry && candidate.industry && attendee.industry === candidate.industry) factors.push('مجال مشابه');
  if (attendee.location && candidate.location && attendee.location === candidate.location) factors.push('موقع قريب');
  const aTags = extractMustMeetTags(attendee);
  const cTags = extractMustMeetTags(candidate);
  const overlap = aTags.filter(t => cTags.includes(t));
  if (overlap.length) factors.push(`أهداف مشتركة: ${overlap.join(', ')}`);
  return factors.slice(0, 4);
}

function selectDiverseCandidates(scored, limit) {
  // Round-robin by industry (or unknown) to avoid mono-industry lists
  const groups = new Map();
  for (const c of scored) {
    const key = (c.industry || 'other').toString().trim() || 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  for (const arr of groups.values()) arr.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  const keys = [...groups.keys()].sort((a, b) => (groups.get(b).length - groups.get(a).length));
  const result = [];
  while (result.length < limit) {
    let added = false;
    for (const k of keys) {
      const arr = groups.get(k);
      if (arr && arr.length) {
        result.push(arr.shift());
        added = true;
        if (result.length >= limit) break;
      }
    }
    if (!added) break;
  }
  // Fallback: fill remaining by score
  if (result.length < limit) {
    const used = new Set(result.map(r => r.id));
    for (const c of scored) {
      if (used.has(c.id)) continue;
      result.push(c);
      if (result.length >= limit) break;
    }
  }
  return result;
}

async function getMatchesForAttendee(attendee, allAttendees, excludeIds = []) {
  const potential = allAttendees.filter(a => a.id !== attendee.id && !excludeIds.includes(a.id));
  if (potential.length === 0) return [];

  // First, calculate compatibility scores for all potential matches
  const scoredPotential = potential.map(p => ({
    ...p,
    compatibilityScore: calculateCompatibilityScore(attendee, p)
  })).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  // Take top 10 candidates for AI analysis (diversified by industry)
  const topCandidates = selectDiverseCandidates(scoredPotential, 10);

  const prompt = `المشارك الرئيسي:
${formatProfile(attendee)}

---
المرشحون المحتملون (مرتبون حسب التوافق الأساسي):
${topCandidates.map((p, index) => `المرتبة ${index + 1} (توافق أساسي: ${p.compatibilityScore}%):
${formatProfile(p, true)}
نبذة: ${p.professional_bio?.substring(0, 100) || 'غير محدد'}
مهارات: ${p.skills || 'غير محدد'}
يبحث عن: ${p.looking_for || 'غير محدد'}`).join('\n---\n')}

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
    const response = await callAnthropicWithRetry(prompt);

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
        compatibility_score: candidate?.compatibilityScore || 0,
        match_source: 'ai',
        synergy_factors: match.synergy_factors || buildSynergyFactors(attendee, candidate || {})
      };
    });

  } catch (error) {
    console.error('Claude API error:', error);

    // Fallback to compatibility-based matching if AI fails
    console.log('Falling back to compatibility-based matching');
    const diverseTop5 = selectDiverseCandidates(scoredPotential, 5);
    return diverseTop5.map(candidate => ({
      id: candidate.id,
      score: candidate.compatibilityScore,
      type: 'compatibility',
      reasoning: `تطابق مبني على التوافق الأساسي (${candidate.compatibilityScore}%)`,
      reasoning_ar: `تم اقتراح هذا التطابق لأن هناك عوامل مشتركة مثل: ${buildSynergyFactors(attendee, candidate).join('، ') || 'اهتمامات مهنية عامة'}.`,
      conversation_starters: [
        candidate.industry ? `التحديات في مجال ${candidate.industry}` : 'المشاريع الحالية',
        candidate.skills ? 'المهارات والخبرات' : 'الخبرات المهنية',
        attendee.looking_for ? 'ما الذي تبحث عنه في هذا الحدث؟' : 'الأهداف المستقبلية'
      ].slice(0, 4),
      match_source: 'fallback',
      synergy_factors: buildSynergyFactors(attendee, candidate)
    }));
  }
}

async function generateMatches(eventId) {
  const db = getDb();
  const startTime = Date.now();
  const jobId = uuidv4();

  console.log(`🚀 Starting AI matching for event: ${eventId} (Job: ${jobId})`);

  // Batch size for concurrent matching requests
  // (balance between speed and API rate limits)
  const batchSize = 3;
  let fallbackCount = 0;

  // Create matching job record
  db.prepare(`INSERT INTO matching_jobs (id, event_id, total_count, total_batches) VALUES (?, ?, ?, ?)`).run(
    jobId, eventId, 0, 0
  );

  try {
    const attendees = db.prepare(`SELECT * FROM attendees WHERE event_id = ?`).all(eventId);
    if (attendees.length < 2) {
      console.log('❌ Not enough attendees for matching');
      db.prepare(`UPDATE matching_jobs SET status = 'failed', error_message = 'Not enough attendees' WHERE id = ?`).run(jobId);
      return;
    }

    // If matches already exist, clear them and regenerate
    const existingMatches = db.prepare(`SELECT COUNT(*) as count FROM matches WHERE event_id = ?`).get(eventId);
    if (existingMatches.count > 0) {
      console.log(`🗑️ Clearing ${existingMatches.count} existing matches before regeneration`);
      db.prepare(`DELETE FROM matches WHERE event_id = ?`).run(eventId);
    }

    // Update job with actual counts
    const totalBatches = Math.ceil(attendees.length / batchSize);
    db.prepare(`UPDATE matching_jobs SET total_count = ?, total_batches = ? WHERE id = ?`).run(
      attendees.length, totalBatches, jobId
    );

    console.log(`📊 Processing ${attendees.length} attendees with optimized batch processing...`);
    console.log(`⚡ Performance improvements: Concurrent batches + Reduced API calls + Compact prompts`);

  // Process in batches
  for (let i = 0; i < attendees.length; i += batchSize) {
    // Check if job was cancelled
    const jobStatus = db.prepare(`SELECT status FROM matching_jobs WHERE id = ?`).get(jobId);
    if (jobStatus.status === 'cancelled') {
      console.log(`🛑 Matching cancelled for event: ${eventId}`);
      db.prepare(`UPDATE matching_jobs SET cancelled_at = CURRENT_TIMESTAMP WHERE id = ?`).run(jobId);
      return;
    }

    const currentBatch = Math.floor(i / batchSize) + 1;
    const batch = attendees.slice(i, i + batchSize);
    console.log(`Processing batch ${currentBatch}/${totalBatches}: ${batch.length} attendees`);

    // Update current batch immediately (progress will be updated AFTER batch completes)
    db.prepare(`UPDATE matching_jobs SET current_batch = ? WHERE id = ?`).run(currentBatch, jobId);

    // Process batch concurrently
    const batchPromises = batch.map(async (attendee, index) => {
      const globalIndex = i + index;
      console.log(`Processing ${globalIndex + 1}/${attendees.length}: ${attendee.name}`);

      try {
        const matches = await getMatchesForAttendee(attendee, attendees);
        if (matches.some(m => m.match_source === 'fallback' || m.type === 'compatibility')) {
          fallbackCount += 1;
        }

        // Insert matches for this attendee
        for (const match of matches) {
          const matchedAttendee = attendees.find(a => a.id === match.id);
          if (!matchedAttendee) continue;

          db.prepare(`INSERT INTO matches (id, event_id, attendee_id, matched_attendee_id, match_score, match_type, match_source, reasoning_ar, conversation_starters, synergy_factors, batch_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            uuidv4(), eventId, attendee.id, match.id, match.score, match.type,
            match.match_source || (match.type === 'compatibility' ? 'fallback' : 'ai'),
            match.reasoning_ar || match.reasoning,
            JSON.stringify(match.conversation_starters || []),
            JSON.stringify(match.synergy_factors || []),
            1
          );
        }

        return { success: true, name: attendee.name };
      } catch (error) {
        console.error(`Error matching ${attendee.name}:`, error);
        return { success: false, name: attendee.name, error };
      }
    });

    // Wait for batch to complete
    await Promise.all(batchPromises);

    // Update progress AFTER the batch completes.
    // Keep progress < 100 while status is still "running" to avoid UI looking "stuck at 100%".
    const processedCount = i + batch.length;
    const progress = Math.min(99, Math.round((processedCount / attendees.length) * 100));
    db.prepare(`UPDATE matching_jobs SET progress = ?, processed_count = ? WHERE id = ?`).run(
      progress, processedCount, jobId
    );

    // Rate limit between batches (kept short to avoid perceived stall)
    if (i + batchSize < attendees.length) {
      await delay(1000); // 1 second between batches
    }
  }

  // Mark mutual matches
  db.prepare(`UPDATE matches SET is_mutual = 1 WHERE event_id = ? AND EXISTS (SELECT 1 FROM matches m2 WHERE m2.attendee_id = matches.matched_attendee_id AND m2.matched_attendee_id = matches.attendee_id AND m2.event_id = matches.event_id)`).run(eventId);

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  const avgTimePerAttendee = (duration / attendees.length).toFixed(1);

  // Update job as completed
  db.prepare(`UPDATE matching_jobs SET status = 'completed', progress = 100, completed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(jobId);
  if (fallbackCount > 0) {
    db.prepare(`UPDATE matching_jobs SET used_fallback = 1, fallback_count = ? WHERE id = ?`).run(fallbackCount, jobId);
  }

  console.log(`✅ Matching complete for event: ${eventId}`);
  console.log(`⏱️  Total time: ${duration}s (${avgTimePerAttendee}s per attendee)`);
  console.log(`📈 Performance: ${attendees.length} attendees processed in parallel batches`);

  } catch (error) {
    console.error(`❌ Matching failed for event: ${eventId}`, error);
    db.prepare(`UPDATE matching_jobs SET status = 'failed', error_message = ? WHERE id = ?`).run(error.message, jobId);
    throw error;
  }
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
    db.prepare(`INSERT INTO matches (id, event_id, attendee_id, matched_attendee_id, match_score, match_type, match_source, reasoning_ar, conversation_starters, synergy_factors, batch_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      uuidv4(), attendee.event_id, attendeeId, match.id, match.score, match.type,
      match.match_source || (match.type === 'compatibility' ? 'fallback' : 'ai'),
      match.reasoning_ar || match.reasoning,
      JSON.stringify(match.conversation_starters || []),
      JSON.stringify(match.synergy_factors || []),
      batchNumber
    );
  }

  db.prepare(`UPDATE matches SET is_mutual = 1 WHERE event_id = ? AND EXISTS (SELECT 1 FROM matches m2 WHERE m2.attendee_id = matches.matched_attendee_id AND m2.matched_attendee_id = matches.attendee_id AND m2.event_id = matches.event_id)`).run(attendee.event_id);
}

async function cancelMatching(eventId) {
  const db = getDb();

  // Find the running job for this event
  const runningJob = db.prepare(`SELECT id FROM matching_jobs WHERE event_id = ? AND status = 'running'`).get(eventId);

  if (!runningJob) {
    throw new Error('No running matching job found for this event');
  }

  // Update job status to cancelled
  db.prepare(`UPDATE matching_jobs SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?`).run(runningJob.id);

  // Update event status
  db.prepare(`UPDATE events SET matching_status = 'cancelled' WHERE id = ?`).run(eventId);

  console.log(`🛑 Matching cancelled for event: ${eventId} (Job: ${runningJob.id})`);
  return { success: true, message: 'Matching process cancelled successfully' };
}

function getMatchingStatus(eventId) {
  const db = getDb();

  // Get the latest job for this event
  const job = db.prepare(`
    SELECT * FROM matching_jobs
    WHERE event_id = ?
    ORDER BY started_at DESC
    LIMIT 1
  `).get(eventId);

  if (!job) {
    return { status: 'idle', progress: 0 };
  }

  return {
    status: job.status,
    progress: job.progress || 0,
    currentBatch: job.current_batch || 0,
    totalBatches: job.total_batches || 0,
    processedCount: job.processed_count || 0,
    totalCount: job.total_count || 0,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    cancelledAt: job.cancelled_at,
    errorMessage: job.error_message
  };
}

module.exports = { generateMatches, generateMoreMatches, cancelMatching, getMatchingStatus };
