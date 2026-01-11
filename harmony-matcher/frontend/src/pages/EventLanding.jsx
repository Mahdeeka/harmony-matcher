import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Sparkles } from 'lucide-react';
import axios from 'axios';

export default function EventLanding() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`/api/events/${eventId}`);
        setEvent(res.data.event);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-harmony-600 to-indigo-700 flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl max-w-lg w-full p-6 md:p-8 fade-in">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="icon-btn px-3">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-sm text-gray-500" dir="ltr">
            {eventId?.slice(0, 8)}
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-harmony-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-harmony-700" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            {loading ? '...' : (event?.name_ar || event?.name || 'الفعالية')}
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            منصة تطابق ذكية تساعدك تلاقي الأشخاص الأنسب للتواصل — بسرعة وبطريقة واضحة.
          </p>
        </div>

        <div className="grid gap-3">
          <button
            className="btn-primary w-full"
            onClick={() => navigate(`/event/${eventId}/login`)}
          >
            <Sparkles className="w-5 h-5" />
            دخول المشاركين
          </button>
          <button
            className="btn-secondary w-full"
            onClick={() => navigate('/admin')}
          >
            لوحة التحكم (Admin)
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          Powered by Harmony Matcher
        </div>
      </div>
    </div>
  );
}



