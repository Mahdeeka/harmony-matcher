import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Phone, ArrowLeft, Shield } from 'lucide-react';
import axios from 'axios';

function AttendeeLogin() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    fetchEvent();
    
    // Check if already logged in
    const token = localStorage.getItem(`harmony_token_${eventId}`);
    if (token) {
      navigate(`/event/${eventId}/matches`);
    }
  }, [eventId]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}`);
      setEvent(response.data.event);
    } catch (error) {
      setError('الفعالية غير موجودة');
    }
  };

  const formatPhone = (value) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as 05X-XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setError('');
  };

  const requestOTP = async (e) => {
    e.preventDefault();
    
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setError('رقم الهاتف غير صالح');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('/api/auth/request-otp', { 
        phone: cleanPhone, 
        eventId 
      });
      setStep('otp');
      setCountdown(60);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (error) {
      setError(error.response?.data?.error || 'فشل في إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 4);
      const newOtp = [...otp];
      digits.split('').forEach((digit, i) => {
        if (i < 4) newOtp[i] = digit;
      });
      setOtp(newOtp);
      if (digits.length === 4) {
        verifyOTP(newOtp.join(''));
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 3) {
      otpRefs[index + 1].current?.focus();
    }

    // Auto-submit when complete
    if (digit && index === 3) {
      verifyOTP(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const verifyOTP = async (code) => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/verify-otp', {
        phone: cleanPhone,
        code,
        eventId
      });

      // Store token
      localStorage.setItem(`harmony_token_${eventId}`, response.data.token);
      localStorage.setItem(`harmony_attendee_${eventId}`, JSON.stringify(response.data.attendee));

      // Navigate to matches
      navigate(`/event/${eventId}/matches`);
    } catch (error) {
      setError(error.response?.data?.error || 'رمز التحقق غير صحيح');
      setOtp(['', '', '', '']);
      otpRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (countdown > 0) return;
    
    const cleanPhone = phone.replace(/\D/g, '');
    setLoading(true);

    try {
      await axios.post('/api/auth/request-otp', { 
        phone: cleanPhone, 
        eventId 
      });
      setCountdown(60);
      setError('');
    } catch (error) {
      setError('فشل في إعادة الإرسال');
    } finally {
      setLoading(false);
    }
  };

  if (!event && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-harmony-600 to-harmony-800 flex items-center justify-center">
        <div className="spinner border-white border-t-harmony-200"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-harmony-600 to-harmony-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-xl fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-harmony-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-harmony-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {event?.name_ar || event?.name || 'Harmony Matcher'}
          </h1>
          <p className="text-gray-500">اكتشف الأشخاص المناسبين للتواصل معهم</p>
        </div>

        {step === 'phone' ? (
          // Phone Input Step
          <form onSubmit={requestOTP}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف
              </label>
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="05X-XXX-XXXX"
                  className="input pr-12 text-lg"
                  dir="ltr"
                  autoComplete="tel"
                  required
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-lg py-4"
            >
              {loading ? (
                <div className="spinner border-white border-t-harmony-200"></div>
              ) : (
                <>
                  إرسال رمز التحقق
                  <ArrowLeft className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        ) : (
          // OTP Verification Step
          <div>
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-1">أدخل الرمز المرسل إلى</p>
              <p className="font-bold text-gray-900 dir-ltr" dir="ltr">{phone}</p>
              <button
                onClick={() => setStep('phone')}
                className="text-harmony-600 text-sm hover:underline mt-1"
              >
                تغيير الرقم
              </button>
            </div>

            <div className="flex justify-center gap-3 mb-6" dir="ltr">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={otpRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="otp-input"
                  disabled={loading}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-gray-500 text-sm">
                  إعادة الإرسال بعد {countdown} ثانية
                </p>
              ) : (
                <button
                  onClick={resendOTP}
                  disabled={loading}
                  className="text-harmony-600 hover:underline text-sm"
                >
                  إعادة إرسال الرمز
                </button>
              )}
            </div>

            {loading && (
              <div className="flex justify-center mt-4">
                <div className="spinner"></div>
              </div>
            )}
          </div>
        )}

        {/* Security Note */}
        <div className="flex items-center justify-center gap-2 mt-8 text-gray-400 text-sm">
          <Shield className="w-4 h-4" />
          <span>رقمك يستخدم للتحقق فقط</span>
        </div>
      </div>
    </div>
  );
}

export default AttendeeLogin;
