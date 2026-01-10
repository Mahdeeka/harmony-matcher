const { getDb } = require('../database');
const { v4: uuidv4 } = require('uuid');

function extractSkills(member) {
  const acf = member.acf || {};
  const skills = [];

  // Add selected skills (these are IDs, we'll store them as is)
  if (acf.selected_skills && Array.isArray(acf.selected_skills)) {
    skills.push(...acf.selected_skills.filter(skill => skill));
  }

  // Add new skills (text skills)
  if (acf.new_skills) {
    skills.push(acf.new_skills);
  }

  return skills.length > 0 ? skills.join(', ') : null;
}

function extractCompany(member) {
  const acf = member.acf || {};

  // Try to extract company from pro_resume
  if (acf.pro_resume) {
    // Look for company names in quotes or common patterns
    const companyMatch = acf.pro_resume.match(/["""](\w+ \w+)["""]/g) ||
                        acf.pro_resume.match(/شركة\s+([^،\n\r]+)/g) ||
                        acf.pro_resume.match(/في\s+([^،\n\r]+)/g);

    if (companyMatch && companyMatch[0]) {
      return companyMatch[0].replace(/["""]/g, '').trim();
    }
  }

  return null;
}

function extractIndustry(member) {
  const acf = member.acf || {};

  // Simple industry inference based on job title or resume
  if (acf.job_title) {
    const title = acf.job_title.toLowerCase();
    if (title.includes('مطور') || title.includes('برمجة') || title.includes('تطوير')) return 'تكنولوجيا المعلومات';
    if (title.includes('محاسب') || title.includes('مالي')) return 'المالية والمحاسبة';
    if (title.includes('تسويق') || title.includes('marketing')) return 'التسويق';
    if (title.includes('إدارة') || title.includes('مدير')) return 'الإدارة';
    if (title.includes('مدرس') || title.includes('تعليم')) return 'التعليم';
    if (title.includes('طبي') || title.includes('دكتور')) return 'الرعاية الصحية';
    if (title.includes('محامي') || title.includes('قانون')) return 'القانون';
  }

  return null;
}

async function importFromHarmonyAPI(eventId, selectedIds = null) {
  const response = await fetch(process.env.HARMONY_API_URL);
  const data = await response.json();

  let members = data.items || [];
  if (selectedIds?.length > 0) {
    members = members.filter((m, idx) => selectedIds.includes(idx));
  }

  const db = getDb();
  let count = 0;

  for (const member of members) {
    try {
      const acf = member.acf || {};

      // Extract and map all available data
      const attendeeData = {
        id: uuidv4(),
        event_id: eventId,
        name: acf.full_name || member.title || '',
        phone: acf.phone || '',
        email: acf.email || '',
        title: acf.job_title || '',
        company: extractCompany(member) || '',
        industry: extractIndustry(member) || '',
        professional_bio: acf.pro_resume || '',
        personal_bio: acf.personal_resume || '',
        skills: extractSkills(member) || '',
        looking_for: acf.connect_with || '',
        offering: acf.motivation || '',
        linkedin_url: acf.linkedin || '',
        photo_url: member.thumbnail_url || '',
        location: acf.current_country || '',
        languages: '', // Could be inferred from content if needed
        harmony_id: member.id?.toString() || ''
      };

      console.log(`Importing member: ${attendeeData.name} (${member.id})`);

      db.prepare(`INSERT OR IGNORE INTO attendees (
        id, event_id, name, phone, email, title, company, industry,
        professional_bio, personal_bio, skills, looking_for, offering,
        linkedin_url, photo_url, location, languages, harmony_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        attendeeData.id,
        attendeeData.event_id,
        attendeeData.name,
        attendeeData.phone,
        attendeeData.email,
        attendeeData.title,
        attendeeData.company,
        attendeeData.industry,
        attendeeData.professional_bio,
        attendeeData.personal_bio,
        attendeeData.skills,
        attendeeData.looking_for,
        attendeeData.offering,
        attendeeData.linkedin_url,
        attendeeData.photo_url,
        attendeeData.location,
        attendeeData.languages,
        attendeeData.harmony_id
      );

      count++;
    } catch (e) {
      console.error(`Error importing member ${member.title || member.id}:`, e);
    }
  }

  return { count };
}

module.exports = { importFromHarmonyAPI };
