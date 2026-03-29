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

// ============================================
// REGION & INDUSTRY LOOKUP TABLES
// ============================================

const REGION_GROUPS = {
  north: ['حيفا', 'عكا', 'الناصرة', 'نهاريا', 'طبريا', 'كرمئيل', 'شفاعمرو', 'عرابة', 'سخنين', 'دير حنا', 'كفركنا', 'المغار', 'طمرة', 'دبورية', 'الرينة', 'كابول', 'جديدة المكر', 'يافة الناصرة', 'البعينة', 'ناصرة', 'قانا الجليل', 'مجد الكروم', 'نحف', 'البقيعة', 'يركا', 'جولس', 'كسرى سميع'],
  haifa_area: ['نيشر', 'عتليت', 'الطيرة', 'دالية الكرمل', 'عسفيا', 'جت المثلث'],
  triangle: ['الطيبة', 'الطيرة', 'قلنسوة', 'كفر قاسم', 'جلجولية', 'باقة الغربية', 'أم الفحم', 'عرعرة', 'كفر قرع', 'الطيبة المثلث', 'كفر برا', 'طيبة المثلث'],
  center: ['تل أبيب', 'يافا', 'تل ابيب', 'رمات غان', 'هرتسليا', 'بتاح تكفا', 'رعنانا', 'كفر سابا', 'نتانيا', 'حولون', 'بات يام', 'ريشون لتسيون', 'رحوفوت'],
  jerusalem: ['القدس', 'بيت لحم', 'رام الله', 'بيت صفافا'],
  south: ['بئر السبع', 'اشدود', 'عسقلان', 'رهط', 'اللد', 'الرملة'],
  negev: ['عراد', 'ديمونا', 'النقب'],
};

const ADJACENT_REGIONS = {
  north: ['haifa_area', 'triangle'],
  haifa_area: ['north', 'triangle', 'center'],
  center: ['haifa_area', 'triangle', 'jerusalem'],
  triangle: ['north', 'haifa_area', 'center'],
  jerusalem: ['center', 'south'],
  south: ['jerusalem', 'negev', 'center'],
  negev: ['south'],
};

function getRegion(location) {
  const loc = (location || '').toLowerCase().trim();
  if (!loc) return null;
  for (const [region, cities] of Object.entries(REGION_GROUPS)) {
    if (cities.some(city => loc.includes(city.toLowerCase()) || city.toLowerCase().includes(loc))) {
      return region;
    }
  }
  return null;
}

const INDUSTRY_SYNERGY = {
  'تكنولوجيا': ['تصميم', 'ريادة أعمال', 'تعليم', 'طب', 'هندسة', 'بحث علمي', 'ذكاء اصطناعي'],
  'تصميم': ['تكنولوجيا', 'تسويق', 'إعلام', 'ريادة أعمال', 'فن'],
  'قانون': ['ريادة أعمال', 'عقارات', 'مالية', 'حقوق إنسان', 'استشارات'],
  'طب': ['تكنولوجيا', 'بحث علمي', 'صيدلة', 'علم نفس', 'هندسة'],
  'تعليم': ['تكنولوجيا', 'علم نفس', 'مجتمع', 'ريادة أعمال'],
  'ريادة أعمال': ['تكنولوجيا', 'تسويق', 'مالية', 'قانون', 'تصميم'],
  'تسويق': ['تصميم', 'تكنولوجيا', 'إعلام', 'ريادة أعمال'],
  'مالية': ['قانون', 'ريادة أعمال', 'استشارات', 'عقارات'],
  'بحث علمي': ['طب', 'تكنولوجيا', 'تعليم', 'هندسة'],
  'استشارات': ['قانون', 'مالية', 'ريادة أعمال', 'إدارة'],
  'علم نفس': ['طب', 'تعليم', 'مجتمع', 'بحث علمي'],
  'هندسة': ['تكنولوجيا', 'بحث علمي', 'ريادة أعمال'],
  'إعلام': ['تسويق', 'تصميم', 'تكنولوجيا'],
};

function hasIndustrySynergy(ind1, ind2) {
  const norm = s => (s || '').toLowerCase().trim();
  const a = norm(ind1);
  const b = norm(ind2);
  for (const [key, synergies] of Object.entries(INDUSTRY_SYNERGY)) {
    const k = key.toLowerCase();
    if (a.includes(k) || k.includes(a)) {
      if (synergies.some(s => b.includes(s.toLowerCase()) || s.toLowerCase().includes(b))) return true;
    }
    if (b.includes(k) || k.includes(b)) {
      if (synergies.some(s => a.includes(s.toLowerCase()) || s.toLowerCase().includes(a))) return true;
    }
  }
  return false;
}

// ============================================
// INTEREST EXTRACTION FROM PERSONAL BIO
// ============================================

const INTEREST_CATEGORIES = {
  'رياضة': ['رياضة', 'كرة', 'ركض', 'سباحة', 'هايكينغ', 'تنس', 'يوغا', 'كايت', 'غوص', 'مشي', 'جيم', 'لياقة', 'تسلق', 'دراجة', 'sport', 'fitness', 'hiking', 'running', 'swimming', 'gym'],
  'فن وإبداع': ['فن', 'رسم', 'تصوير', 'موسيقى', 'عزف', 'رقص', 'غناء', 'تطريز', 'كعك', 'طبخ', 'طهي', 'حلويات', 'art', 'music', 'dance', 'photography', 'painting', 'cooking'],
  'تطوع ومجتمع': ['تطوع', 'جمعية', 'تأهيل', 'إرشاد مجتمعي', 'volunteer', 'community', 'social impact'],
  'سفر واستكشاف': ['سفر', 'ترحال', 'استكشاف', 'مغامرة', 'travel', 'explore', 'adventure'],
  'قراءة وثقافة': ['قراءة', 'كتب', 'أدب', 'فلسفة', 'ثقافة', 'شعر', 'reading', 'books', 'literature', 'philosophy'],
  'تكنولوجيا وابتكار': ['ذكاء اصطناعي', 'برمجة', 'تطوير', 'تكنولوجيا', 'ابتكار', 'هاكاثون', 'AI', 'programming', 'tech', 'innovation'],
  'ريادة أعمال': ['ريادة', 'ستارتاب', 'مبادرة', 'startup', 'entrepreneur'],
};

function extractInterestTags(attendee) {
  const text = `${attendee.personal_bio || ''} ${attendee.skills || ''} ${attendee.offering || ''}`.toLowerCase();
  const tags = [];
  for (const [category, keywords] of Object.entries(INTEREST_CATEGORIES)) {
    if (keywords.some(kw => text.includes(kw))) tags.push(category);
  }
  return tags;
}

// ============================================
// SYSTEM PROMPT & PROFILE FORMATTING
// ============================================

const SYSTEM_PROMPT = `أنت خبير في بناء العلاقات المهنية والتواصل الشبكي لمجتمع Harmony Community - منصة للمحترفين العرب.

مهمتك المتقدمة: تحليل ملفات المشاركين واقتراح أفضل 5 تطابقات باستخدام خوارزمية ذكية تشمل:

1. التكامل المتبادل (شخص يقدم ما يبحث عنه الآخر والعكس)
2. التآزر في الصناعة (إمكانية التعاون بين مجالات مختلفة أو متشابهة)
3. المستوى الوظيفي المتشابه أو فرص الإرشاد (ربط الخبراء بالمبتدئين)
4. الاهتمامات الشخصية المشتركة (هوايات، قيم، نشاطات)
5. التوافق الجغرافي واللغوي
6. إمكانية الشراكة التجارية أو التعاون المهني

معايير التقييم:
- تحليل التكامل: هل ما يقدمه أحدهم يلبي حاجة الآخر؟ (ثنائي الاتجاه)
- تحليل المهارات: تطابق أو تكامل المهارات المطلوبة مع المعروضة
- تحليل الصناعة: تقييم التآزر بين الصناعات المختلفة (مثلاً: تكنولوجيا + طب، قانون + ريادة أعمال)
- تحليل الشخصية: استنتاج من النبذة الشخصية والاهتمامات المشتركة (رياضة، فن، سفر، تطوع)
- تحليل جغرافي: الأولوية للمشاركين في نفس المنطقة أو مناطق قريبة
- تحليل لغوي: اللغات المشتركة تعزز إمكانية التواصل

أجب بصيغة JSON فقط.`;

function formatProfile(a, compact = false) {
  if (compact) {
    return `${a.name}${a.title ? ` - ${a.title}` : ''}${a.company ? ` @ ${a.company}` : ''}${a.industry ? ` (${a.industry})` : ''}`;
  }

  const parts = [`الاسم: ${a.name}`];
  if (a.title) parts.push(`المسمى: ${a.title}`);
  if (a.company) parts.push(`الشركة: ${a.company}`);
  if (a.industry) parts.push(`المجال: ${a.industry}`);
  if (a.location) parts.push(`الموقع: ${a.location}`);
  if (a.professional_bio) {
    const bio = a.professional_bio.length > 200 ? a.professional_bio.substring(0, 200) + '...' : a.professional_bio;
    parts.push(`نبذة مهنية: ${bio}`);
  }
  if (a.personal_bio) {
    const bio = a.personal_bio.length > 150 ? a.personal_bio.substring(0, 150) + '...' : a.personal_bio;
    parts.push(`نبذة شخصية: ${bio}`);
  }
  if (a.skills) parts.push(`المهارات: ${a.skills}`);
  if (a.looking_for) parts.push(`يبحث عن: ${a.looking_for}`);
  if (a.offering) parts.push(`يقدم: ${a.offering}`);
  if (a.languages) parts.push(`اللغات: ${a.languages}`);
  const interests = extractInterestTags(a);
  if (interests.length) parts.push(`اهتمامات: ${interests.join('، ')}`);
  return parts.join('\n');
}

const ALL_METRICS = {
  complementarity:    { key: 'complementarity',    nameAr: 'التكامل المتبادل',     descAr: 'مطابقة ما يبحث عنه كل مشارك مع ما يقدمه الآخر' },
  skills:             { key: 'skills',             nameAr: 'تطابق المهارات',        descAr: 'تقاطع المهارات بين المشاركين' },
  industry:           { key: 'industry',           nameAr: 'التآزر المهني',         descAr: 'التوافق بين المجالات المهنية' },
  location:           { key: 'location',           nameAr: 'القرب الجغرافي',        descAr: 'الأولوية للمشاركين في نفس المنطقة' },
  experience:         { key: 'experience',         nameAr: 'المستوى الوظيفي',       descAr: 'التوافق في المستوى المهني والخبرة' },
  professional_bio:   { key: 'professional_bio',   nameAr: 'التشابه المهني',        descAr: 'تشابه الخلفية المهنية والأكاديمية' },
  personal_interests: { key: 'personal_interests', nameAr: 'الاهتمامات الشخصية',    descAr: 'هوايات واهتمامات مشتركة (رياضة، فن، سفر...)' },
  languages:          { key: 'languages',          nameAr: 'التوافق اللغوي',        descAr: 'اللغات المشتركة بين المشاركين' },
};

const DEFAULT_METRICS = Object.keys(ALL_METRICS);

function calculateCompatibilityScore(attendee, potential, enabledMetrics = DEFAULT_METRICS) {
  const on = (k) => enabledMetrics.includes(k);
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

  // --- Bidirectional complementarity (max 40: 20 forward + 20 backward) ---
  if (on('complementarity')) {
    const hasForward = attendee.looking_for && potential.offering;
    const hasBackward = potential.looking_for && attendee.offering;
    if (hasForward || hasBackward) {
      if (hasForward) {
        possible += 20;
        score += Math.round(20 * overlapRatio(attendee.looking_for, potential.offering));
      }
      if (hasBackward) {
        possible += 20;
        score += Math.round(20 * overlapRatio(potential.looking_for, attendee.offering));
      }
    } else if (attendee.skills && potential.offering) {
      possible += 15;
      score += Math.round(15 * overlapRatio(attendee.skills, potential.offering));
    } else if (potential.skills && attendee.offering) {
      possible += 15;
      score += Math.round(15 * overlapRatio(potential.skills, attendee.offering));
    }
  }

  // --- Skills overlap (max 15) ---
  if (on('skills') && attendee.skills && potential.skills) {
    possible += 15;
    score += Math.round(15 * overlapRatio(attendee.skills, potential.skills));
  }

  // --- Industry synergy (max 15) ---
  if (on('industry') && attendee.industry && potential.industry) {
    possible += 15;
    const aInd = norm(attendee.industry);
    const pInd = norm(potential.industry);
    if (aInd === pInd) {
      score += 15;
    } else if (hasIndustrySynergy(attendee.industry, potential.industry)) {
      score += 10;
    } else {
      score += Math.round(15 * overlapRatio(aInd, pInd));
    }
  }

  // --- Location proximity with region clustering (max 10) ---
  if (on('location') && attendee.location && potential.location) {
    possible += 10;
    const aLoc = norm(attendee.location);
    const pLoc = norm(potential.location);
    if (aLoc === pLoc) {
      score += 10;
    } else {
      const aRegion = getRegion(attendee.location);
      const pRegion = getRegion(potential.location);
      if (aRegion && pRegion && aRegion === pRegion) {
        score += 7;
      } else if (aRegion && pRegion && ADJACENT_REGIONS[aRegion]?.includes(pRegion)) {
        score += 4;
      } else {
        score += Math.round(10 * overlapRatio(aLoc, pLoc));
      }
    }
  }

  // --- Experience compatibility (max 10) ---
  if (on('experience') && attendee.title && potential.title) {
    possible += 10;
    const diff = Math.abs(getExperienceLevel(attendee.title) - getExperienceLevel(potential.title));
    if (diff === 0) score += 10;
    else if (diff === 1) score += 8;
    else if (diff === 2) score += 5;
    else score += 2;
  }

  // --- Professional bio similarity (max 10) ---
  if (on('professional_bio') && attendee.professional_bio && potential.professional_bio) {
    possible += 10;
    score += Math.round(10 * overlapRatio(attendee.professional_bio, potential.professional_bio));
  }

  // --- Personal interests overlap (max 15) ---
  if (on('personal_interests')) {
    const aInterests = extractInterestTags(attendee);
    const pInterests = extractInterestTags(potential);
    if (aInterests.length > 0 && pInterests.length > 0) {
      possible += 15;
      const shared = aInterests.filter(t => pInterests.includes(t)).length;
      const ratio = shared / Math.max(aInterests.length, pInterests.length);
      score += Math.round(15 * ratio);
    } else if (attendee.personal_bio && potential.personal_bio) {
      possible += 10;
      score += Math.round(10 * overlapRatio(attendee.personal_bio, potential.personal_bio));
    }
  }

  // --- Language compatibility (max 5) ---
  if (on('languages') && attendee.languages && potential.languages) {
    possible += 5;
    const parseLangs = (s) => new Set(norm(s).split(/[,،;/]+/).map(l => l.trim()).filter(Boolean));
    const aLangs = parseLangs(attendee.languages);
    const bLangs = parseLangs(potential.languages);
    let shared = 0;
    for (const l of aLangs) if (bLangs.has(l)) shared++;
    if (shared >= 3) score += 5;
    else if (shared >= 2) score += 3;
    else if (shared >= 1) score += 1;
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
  if (attendee.looking_for && candidate.offering) factors.push('تكامل متبادل: يقدم ما يبحث عنه الآخر');
  if (candidate.looking_for && attendee.offering) factors.push('تكامل عكسي: يلبي احتياج الطرف الآخر');
  if (attendee.industry && candidate.industry) {
    if (attendee.industry === candidate.industry) factors.push('مجال مهني مشابه');
    else if (hasIndustrySynergy(attendee.industry, candidate.industry)) factors.push('تآزر بين المجالات');
  }
  if (attendee.location && candidate.location) {
    const aR = getRegion(attendee.location);
    const cR = getRegion(candidate.location);
    if (attendee.location.toLowerCase() === candidate.location.toLowerCase() || (aR && cR && aR === cR)) {
      factors.push('موقع قريب');
    }
  }
  const aInterests = extractInterestTags(attendee);
  const cInterests = extractInterestTags(candidate);
  const sharedInterests = aInterests.filter(t => cInterests.includes(t));
  if (sharedInterests.length) factors.push(`اهتمامات مشتركة: ${sharedInterests.join('، ')}`);
  const aTags = extractMustMeetTags(attendee);
  const cTags = extractMustMeetTags(candidate);
  const overlap = aTags.filter(t => cTags.includes(t));
  if (overlap.length) factors.push(`أهداف مشتركة: ${overlap.join(', ')}`);
  return factors.slice(0, 5);
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

async function getMatchesForAttendee(attendee, allAttendees, excludeIds = [], enabledMetrics = DEFAULT_METRICS) {
  const potential = allAttendees.filter(a => a.id !== attendee.id && !excludeIds.includes(a.id));
  if (potential.length === 0) return [];

  const scoredPotential = potential.map(p => ({
    ...p,
    compatibilityScore: calculateCompatibilityScore(attendee, p, enabledMetrics)
  })).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  // Take top 10 candidates for AI analysis (diversified by industry)
  const topCandidates = selectDiverseCandidates(scoredPotential, 10);

  const formatCandidate = (p, index) => {
    const lines = [`المرتبة ${index + 1} (توافق أساسي: ${p.compatibilityScore}%):`];
    lines.push(formatProfile(p, true));
    lines.push(`نبذة مهنية: ${p.professional_bio?.substring(0, 100) || 'غير محدد'}`);
    if (p.personal_bio) lines.push(`نبذة شخصية: ${p.personal_bio.substring(0, 80)}`);
    lines.push(`مهارات: ${p.skills || 'غير محدد'}`);
    lines.push(`يبحث عن: ${p.looking_for || 'غير محدد'}`);
    lines.push(`يقدم: ${p.offering || 'غير محدد'}`);
    if (p.location) lines.push(`الموقع: ${p.location}`);
    if (p.languages) lines.push(`اللغات: ${p.languages}`);
    const interests = extractInterestTags(p);
    if (interests.length) lines.push(`اهتمامات: ${interests.join('، ')}`);
    return lines.join('\n');
  };

  const prompt = `المشارك الرئيسي:
${formatProfile(attendee)}

---
المرشحون المحتملون (مرتبون حسب التوافق الأساسي):
${topCandidates.map((p, index) => formatCandidate(p, index)).join('\n---\n')}

---
اقترح أفضل 5 تطابقات من المرشحين أعلاه. لكل تطابق قدم:
- id: معرف المشارك
- score: نسبة التطابق النهائية (دمج التوافق الأساسي مع التحليل الذكي)
- type: نوع (complementary/collaborative/mentorship/mentee/serendipity)
- reasoning: السبب التفصيلي (2-3 جمل بالعربية) مع ذكر التكامل المتبادل والاهتمامات المشتركة
- conversation_starters: نقاط للنقاش (3-4 مواضيع محددة مبنية على الاهتمامات والمهارات المشتركة)
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

async function generateMatches(eventId, enabledMetrics = DEFAULT_METRICS) {
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
        const matches = await getMatchesForAttendee(attendee, attendees, [], enabledMetrics);
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

module.exports = { generateMatches, generateMoreMatches, cancelMatching, getMatchingStatus, ALL_METRICS, DEFAULT_METRICS };
