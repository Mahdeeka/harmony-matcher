const twilio = require('twilio');
const { getDb } = require('../database');
const { v4: uuidv4 } = require('uuid');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

function generateOTPCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('972')) return '+' + cleaned;
  if (cleaned.startsWith('0')) return '+972' + cleaned.substring(1);
  if (cleaned.length === 9) return '+972' + cleaned;
  return phone.startsWith('+') ? phone : '+' + cleaned;
}

async function sendOTP(phone) {
  const db = getDb();
  const formattedPhone = formatPhoneNumber(phone);
  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  
  db.prepare(`INSERT INTO otp_codes (id, phone, code, expires_at) VALUES (?, ?, ?, ?)`).run(uuidv4(), formattedPhone, code, expiresAt);
  
  try {
    await client.messages.create({
      body: `رمز التحقق الخاص بك في Harmony Matcher: ${code}\nصالح لمدة 10 دقائق`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    console.log(`✅ OTP sent to ${formattedPhone}`);
    return { success: true };
  } catch (error) {
    console.error('Twilio error:', error);
    console.log(`📱 DEV MODE - OTP for ${formattedPhone}: ${code}`);
    return { success: true, devCode: code };
  }
}

function verifyOTP(phone, code) {
  const db = getDb();
  const formattedPhone = formatPhoneNumber(phone);
  const otp = db.prepare(`SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND verified = 0 ORDER BY created_at DESC LIMIT 1`).get(formattedPhone, code);
  
  if (!otp || new Date(otp.expires_at) < new Date()) return false;
  
  db.prepare(`UPDATE otp_codes SET verified = 1 WHERE id = ?`).run(otp.id);
  return true;
}

module.exports = { sendOTP, verifyOTP, formatPhoneNumber };
