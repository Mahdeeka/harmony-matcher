import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users, Phone, MessageCircle, Linkedin, Star, ChevronDown,
  ArrowLeft, Eye, Sparkles, Heart
} from 'lucide-react';
import axios from 'axios';

function AdminAttendeeMatches() {
  const { eventId, attendeeId } = useParams();
  const [attendee, setAttendee] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [expandedMatch, setExpandedMatch] = useState(null);

  useEffect(() => {
    fetchEvent();
    fetchAttendee();
    fetchMatches();
  }, [eventId, attendeeId]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}`);
      setEvent(response.data.event);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchAttendee = async () => {
    try {
      // Get attendee details - we need to get this from attendees list
      const response = await axios.get(`/api/events/${eventId}/attendees`);
      const attendeeData = response.data.attendees.find(a => a.id === attendeeId);
      setAttendee(attendeeData);
    } catch (error) {
      console.error('Error fetching attendee:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await axios.get(`/api/attendees/${attendeeId}/matches`);
      setMatches(response.data.matches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const callPhone = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const openWhatsApp = (phone, name) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('972') ? cleanPhone : `972${cleanPhone.replace(/^0/, '')}`;
    const message = encodeURIComponent(`مرحباً ${name}، تواصلت معك عبر Harmony Matcher 👋`);
    window.open(`https://wa.me/${waPhone}?text=${message}`, '_blank');
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const parseConversationStarters = (starters) => {
    try {
      if (Array.isArray(starters)) return starters;
      return JSON.parse(starters);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">جاري تحميل التطابقات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={`/admin/event/${eventId}`} className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-harmony-600 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    عرض المشارك - {attendee?.name}
                  </h1>
                  <p className="text-gray-500 text-sm">{event?.name_ar || event?.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Participant Info */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-200">
          <div className="flex items-center gap-4">
            {attendee?.photo_url ? (
              <img
                src={attendee.photo_url}
                alt={attendee.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-harmony-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-harmony-600">
                  {attendee?.name?.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{attendee?.name}</h2>
              <div className="flex items-center gap-4 text-gray-500 text-sm">
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {attendee?.phone}
                </span>
                {attendee?.email && (
                  <span>{attendee.email}</span>
                )}
              </div>
              {(attendee?.title || attendee?.company) && (
                <p className="text-gray-600 text-sm mt-1">
                  {attendee.title}{attendee.title && attendee.company && ' @ '}{attendee.company}
                </p>
              )}
            </div>
          </div>

          {attendee?.professional_bio && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-gray-500 text-xs mb-2">نبذة مهنية:</p>
              <p className="text-gray-700 text-sm">{attendee.professional_bio}</p>
            </div>
          )}

          {attendee?.skills && (
            <div className="mt-3">
              <p className="text-gray-500 text-xs mb-2">المهارات:</p>
              <p className="text-gray-700 text-sm">{attendee.skills}</p>
            </div>
          )}
        </div>

        {/* Matches Header */}
        <div className="bg-gradient-to-l from-harmony-600 to-harmony-700 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-harmony-100 text-sm">التطابقات المقترحة</span>
          </div>
          <h2 className="text-xl font-bold mb-1">
            التطابقات المقترحة لـ {attendee?.name?.split(' ')[0]}
          </h2>
          <p className="text-harmony-100">
            {matches.length} أشخاص يناسبون {attendee?.name?.split(' ')[0]} للتواصل
          </p>
        </div>

        {/* Matches */}
        {matches.length === 0 ? (
          <div className="card text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد تطابقات</h3>
            <p className="text-gray-500">لم يتم إنشاء تطابقات لهذا المشارك بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="card match-card overflow-hidden"
              >
                {/* Match Header */}
                <div className="flex items-start gap-4">
                  {/* Photo */}
                  <div className="relative flex-shrink-0">
                    {match.photo_url ? (
                      <img
                        src={match.photo_url}
                        alt={match.name}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-harmony-100 rounded-xl flex items-center justify-center">
                        <span className="text-2xl font-bold text-harmony-600">
                          {match.name?.charAt(0)}
                        </span>
                      </div>
                    )}
                    {match.is_mutual === 1 && (
                      <div className="absolute -top-1 -left-1 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                        <Heart className="w-3 h-3 text-white fill-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900 truncate">
                        {match.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-lg text-sm font-bold ${getMatchScoreColor(match.match_score)}`}>
                        {Math.round(match.match_score)}%
                      </span>
                    </div>
                    {(match.title || match.company) && (
                      <p className="text-gray-600 text-sm truncate">
                        {match.title}{match.title && match.company && ' @ '}{match.company}
                      </p>
                    )}
                    {match.is_mutual === 1 && (
                      <span className="inline-flex items-center gap-1 text-pink-600 text-xs mt-1">
                        <Heart className="w-3 h-3 fill-pink-600" />
                        تطابق متبادل!
                      </span>
                    )}
                  </div>
                </div>

                {/* Reasoning */}
                <div className="mt-4 bg-harmony-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-harmony-700 text-sm font-medium mb-2">
                    <Sparkles className="w-4 h-4" />
                    لماذا هذا التطابق؟
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {match.reasoning_ar || match.reasoning}
                  </p>
                </div>

                {/* Conversation Starters */}
                {parseConversationStarters(match.conversation_starters).length > 0 && (
                  <div className="mt-3">
                    <p className="text-gray-500 text-xs mb-2">💡 نقاط للنقاش:</p>
                    <div className="flex flex-wrap gap-2">
                      {parseConversationStarters(match.conversation_starters).map((starter, idx) => (
                        <span key={idx} className="badge badge-primary text-xs">
                          {starter}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {expandedMatch === match.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 fade-in">
                    {match.professional_bio && (
                      <div className="mb-3">
                        <p className="text-gray-500 text-xs mb-1">نبذة مهنية:</p>
                        <p className="text-gray-700 text-sm">{match.professional_bio}</p>
                      </div>
                    )}
                    {match.skills && (
                      <div className="mb-3">
                        <p className="text-gray-500 text-xs mb-1">المهارات:</p>
                        <p className="text-gray-700 text-sm">{match.skills}</p>
                      </div>
                    )}
                    {match.looking_for && (
                      <div className="mb-3">
                        <p className="text-gray-500 text-xs mb-1">يبحث عن:</p>
                        <p className="text-gray-700 text-sm">{match.looking_for}</p>
                      </div>
                    )}
                    {match.offering && (
                      <div className="mb-3">
                        <p className="text-gray-500 text-xs mb-1">يقدم:</p>
                        <p className="text-gray-700 text-sm">{match.offering}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Show More Toggle */}
                {(match.professional_bio || match.skills || match.looking_for) && (
                  <button
                    onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                    className="w-full text-center text-harmony-600 text-sm mt-3 hover:underline flex items-center justify-center gap-1"
                  >
                    {expandedMatch === match.id ? 'عرض أقل' : 'عرض المزيد'}
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedMatch === match.id ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => callPhone(match.phone)}
                    className="flex-1 btn-primary py-2.5"
                  >
                    <Phone className="w-4 h-4" />
                    اتصال
                  </button>
                  <button
                    onClick={() => openWhatsApp(match.phone, match.name)}
                    className="flex-1 btn-success py-2.5"
                  >
                    <MessageCircle className="w-4 h-4" />
                    واتساب
                  </button>
                  {match.linkedin_url && (
                    <a
                      href={match.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary py-2.5 px-4"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-gray-400 text-sm">
          <p>Harmony Matcher - لوحة التحكم الإدارية</p>
        </div>
      </main>
    </div>
  );
}

export default AdminAttendeeMatches;
