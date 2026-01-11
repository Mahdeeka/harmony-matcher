import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Phone, ArrowLeft, Shield, Mail, CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

function AttendeeLogin() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  const [event, setEvent] = useState(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('phone'); // 'phone', 'otp', 'method'
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

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

  // Phone-only login (NO OTP)
  const requestOTP = async (e) => {
    e.preventDefault();

    let cleanContact = '';
    let contactType = '';

    if (authMethod === 'phone') {
      cleanContact = phone.replace(/\D/g, '');
      contactType = 'phone';
      if (cleanContact.length < 9) {
        setError('رقم الهاتف غير صالح');
        return;
      }
    } else {
      setError('تسجيل الدخول متاح برقم الهاتف فقط حالياً');
      return;
    }

    setLoading(true);
    setError('');
    setLoginAttempts(prev => prev + 1);

    try {
      const response = await axios.post('/api/auth/phone-login', {
        eventId,
        phone: cleanContact
      });

      // Store authentication data
      localStorage.setItem(`harmony_token_${eventId}`, response.data.token);
      localStorage.setItem(`harmony_attendee_${eventId}`, JSON.stringify(response.data.attendee));

      showSuccess('تم تسجيل الدخول بنجاح!');
      navigate(`/event/${eventId}/matches`);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'فشل في تسجيل الدخول';
      setError(errorMsg);
      showError(errorMsg);
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
    const cleanContact = authMethod === 'phone' ? phone.replace(/\D/g, '') : email;

    setLoading(true);
    setError('');

    try {
      const payload = {
        code,
        eventId,
        method: authMethod,
        [authMethod]: cleanContact,
        rememberDevice
      };

      const response = await axios.post('/api/auth/verify-otp', payload);

      // Store authentication data
      localStorage.setItem(`harmony_token_${eventId}`, response.data.token);
      localStorage.setItem(`harmony_attendee_${eventId}`, JSON.stringify(response.data.attendee));

      if (rememberDevice) {
        localStorage.setItem(`harmony_device_${eventId}`, 'remembered');
      }

      showSuccess('تم تسجيل الدخول بنجاح!');

      // Navigate to matches with a slight delay for better UX
      setTimeout(() => {
        navigate(`/event/${eventId}/matches`);
      }, 500);

    } catch (error) {
      const errorMsg = error.response?.data?.error || 'رمز التحقق غير صحيح';
      setError(errorMsg);
      showError(errorMsg);
      setOtp(['', '', '', '']);
      otpRefs[0].current?.focus();

      // Track failed attempts
      setLoginAttempts(prev => prev + 1);

      // Show additional help after multiple failures
      if (loginAttempts >= 2) {
        showInfo('تلميح: تأكد من إدخال الرمز الصحيح أو اطلب رمزاً جديداً');
      }
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (countdown > 0) return;

    const cleanContact = authMethod === 'phone' ? phone.replace(/\D/g, '') : email;
    setLoading(true);

    try {
      const payload = {
        eventId,
        method: authMethod,
        [authMethod]: cleanContact
      };

      await axios.post('/api/auth/request-otp', payload);
      setCountdown(60);
      setError('');
      showInfo(authMethod === 'phone' ? 'تم إرسال رمز جديد' : 'تم إرسال رابط جديد');
    } catch (error) {
      const errorMsg = `فشل في ${authMethod === 'phone' ? 'إعادة الإرسال' : 'إرسال الرابط الجديد'}`;
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const switchAuthMethod = () => {
    setAuthMethod(authMethod === 'phone' ? 'email' : 'phone');
    setStep('phone');
    setError('');
    setPhone('');
    setEmail('');
    setOtp(['', '', '', '']);
    setCountdown(0);
  };

  if (!event && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-harmony-600 to-harmony-800 flex items-center justify-center">
        <div className="spinner border-white border-t-harmony-200"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-harmony-600 to-harmony-800 flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className={`bg-white rounded-3xl max-w-md w-full shadow-xl fade-in transition-all duration-300 ${
        step === 'method' ? 'p-6' : 'p-8'
      }`}>
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-harmony-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce-subtle">
            <Users className="w-8 h-8 text-harmony-600" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
            {event?.name_ar || event?.name || 'Harmony Matcher'}
          </h1>
          <p className="text-gray-500 text-sm">اكتشف الأشخاص المناسبين للتواصل معهم</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step === 'method' || step === 'phone' ? 'bg-harmony-600 text-white' : 'bg-harmony-100 text-harmony-600'
            }`}>
              1
            </div>
            <div className={`w-6 h-0.5 transition-colors ${
              step === 'otp' || step === 'email-sent' ? 'bg-harmony-600' : 'bg-gray-200'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step === 'otp' || step === 'email-sent' ? 'bg-harmony-600 text-white' : 'bg-harmony-100 text-harmony-600'
            }`}>
              2
            </div>
          </div>
        </div>

        {step === 'method' ? (
          // Method Selection Step
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
                اختر طريقة تسجيل الدخول
              </h2>
              <p className="text-gray-500 text-center text-sm">
                يمكنك الدخول برقم هاتفك أو بريدك الإلكتروني
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setAuthMethod('phone');
                  setStep('phone');
                }}
                className="w-full p-4 border border-gray-200 rounded-xl hover:border-harmony-300 hover:bg-harmony-50 transition-all flex items-center gap-4 group"
              >
                <div className="w-10 h-10 bg-harmony-100 rounded-lg flex items-center justify-center group-hover:bg-harmony-200 transition-colors">
                  <Phone className="w-5 h-5 text-harmony-600" />
                </div>
                <div className="text-right flex-1">
                  <div className="font-medium text-gray-900">رقم الهاتف</div>
                  <div className="text-sm text-gray-500">استلام رمز تحقق عبر SMS</div>
                </div>
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-harmony-600 transition-colors" />
              </button>

              <button
                onClick={() => {
                  setAuthMethod('email');
                  setStep('phone'); // Reuse the same form
                }}
                className="w-full p-4 border border-gray-200 rounded-xl hover:border-harmony-300 hover:bg-harmony-50 transition-all flex items-center gap-4 group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-right flex-1">
                  <div className="font-medium text-gray-900">البريد الإلكتروني</div>
                  <div className="text-sm text-gray-500">استلام رابط آمن عبر البريد</div>
                </div>
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </button>
            </div>

            <div className="text-center pt-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                العودة للصفحة الرئيسية
              </button>
            </div>
          </div>
        ) : step === 'phone' ? (
          // Contact Input Step
          <form onSubmit={requestOTP}>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {authMethod === 'phone' ? 'رقم الهاتف' : 'البريد الإلكتروني'}
                </label>
                <button
                  type="button"
                  onClick={switchAuthMethod}
                  className="text-harmony-600 hover:text-harmony-700 text-sm font-medium transition-colors"
                >
                  {authMethod === 'phone' ? 'استخدم البريد الإلكتروني' : 'استخدم رقم الهاتف'}
                </button>
              </div>

              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {authMethod === 'phone' ? (
                    <Phone className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Mail className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {authMethod === 'phone' ? (
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
                ) : (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="your@email.com"
                    className="input pr-12 text-lg"
                    dir="ltr"
                    autoComplete="email"
                    required
                  />
                )}
              </div>

              {/* Remember Device Option */}
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="rememberDevice"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-gray-300 text-harmony-600 focus:ring-harmony-500"
                />
                <label htmlFor="rememberDevice" className="text-sm text-gray-600">
                  تذكر هذا الجهاز لمدة 30 يوم
                </label>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
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
                  دخول
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
        {(step === 'phone' || step === 'otp') && (
          <div className="flex items-center justify-center gap-2 mt-8 text-gray-400 text-sm">
            <Shield className="w-4 h-4" />
            <span>
              {authMethod === 'phone'
                ? 'رقمك يستخدم للتحقق فقط'
                : 'بريدك الإلكتروني محمي وآمن'
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendeeLogin;
