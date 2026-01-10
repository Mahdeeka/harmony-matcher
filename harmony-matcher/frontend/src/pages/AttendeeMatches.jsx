import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Phone, MessageCircle, Linkedin, Star, ChevronDown,
  RefreshCw, LogOut, Sparkles, Heart, ExternalLink, Filter,
  Search, X, ThumbsUp, MessageSquare, BookmarkPlus, Trophy
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import { useMessaging } from '../contexts/MessagingContext';
import SkeletonLoader from '../components/SkeletonLoader';
import MessagingNav from '../components/MessagingNav';
import MessageModal from '../components/MessageModal';
import GamificationDashboard from '../components/GamificationDashboard';

function AttendeeMatches() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showInfo, showError } = useToast();
  const {
    conversations,
    unreadCount,
    sendMessage,
    loadConversations,
    createConversation,
    isConnected,
    initializeForEvent
  } = useMessaging();

  const [attendee, setAttendee] = useState(null);
  const [allMatches, setAllMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [event, setEvent] = useState(null);

  // Filtering and search states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minScore: 0,
    industries: [],
    mutualOnly: false,
    savedOnly: false
  });
  const [savedMatches, setSavedMatches] = useState(new Set());

  // Messaging modal state
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState(null);

  // Gamification modal state
  const [gamificationModalOpen, setGamificationModalOpen] = useState(false);

  // Direct message state
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Get unique industries from matches
  const availableIndustries = [...new Set(allMatches.map(m => m.industry).filter(Boolean))];

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem(`harmony_token_${eventId}`);
    const storedAttendee = localStorage.getItem(`harmony_attendee_${eventId}`);

    if (!token) {
      navigate(`/event/${eventId}`);
      return;
    }

    if (storedAttendee) {
      setAttendee(JSON.parse(storedAttendee));
    }

    // Initialize messaging for this event
    initializeForEvent(eventId);

    fetchEvent();
    fetchMatches();
  }, [eventId, initializeForEvent]);

  // Filter and search matches
  useEffect(() => {
    let filtered = [...allMatches];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(match =>
        match.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.professional_bio?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Score filter
    filtered = filtered.filter(match => match.match_score >= filters.minScore);

    // Industry filter
    if (filters.industries.length > 0) {
      filtered = filtered.filter(match => filters.industries.includes(match.industry));
    }

    // Mutual matches filter
    if (filters.mutualOnly) {
      filtered = filtered.filter(match => match.is_mutual === 1);
    }

    // Saved matches filter
    if (filters.savedOnly) {
      filtered = filtered.filter(match => savedMatches.has(match.id));
    }

    // Sort by score (highest first)
    filtered.sort((a, b) => b.match_score - a.match_score);

    setFilteredMatches(filtered);
  }, [allMatches, searchTerm, filters, savedMatches]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}`);
      setEvent(response.data.event);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchMatches = async () => {
    const storedAttendee = localStorage.getItem(`harmony_attendee_${eventId}`);
    if (!storedAttendee) return;

    const { id: attendeeId } = JSON.parse(storedAttendee);

    try {
      const response = await axios.get(`/api/attendees/${attendeeId}/matches`);
      setAllMatches(response.data.matches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMatches = async () => {
    const storedAttendee = localStorage.getItem(`harmony_attendee_${eventId}`);
    if (!storedAttendee) return;

    const { id: attendeeId } = JSON.parse(storedAttendee);

    setLoadingMore(true);
    try {
      const response = await axios.post(`/api/attendees/${attendeeId}/more-matches`);
      setAllMatches([...allMatches, ...response.data.matches]);
      setCurrentBatch(response.data.batch);
      showInfo(`تم تحميل ${response.data.matches.length} تطابقات إضافية`);
    } catch (error) {
      console.error('Error loading more matches:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleSaveMatch = (matchId) => {
    const newSaved = new Set(savedMatches);
    if (newSaved.has(matchId)) {
      newSaved.delete(matchId);
      showInfo('تم إزالة التطابق من المحفوظات');
    } else {
      newSaved.add(matchId);
      showSuccess('تم حفظ التطابق');
    }
    setSavedMatches(newSaved);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      minScore: 0,
      industries: [],
      mutualOnly: false,
      savedOnly: false
    });
    showInfo('تم مسح جميع المرشحات');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (filters.minScore > 0) count++;
    if (filters.industries.length > 0) count++;
    if (filters.mutualOnly) count++;
    if (filters.savedOnly) count++;
    return count;
  };

  const openMessageModal = (attendee) => {
    setSelectedAttendee(attendee);
    setMessageModalOpen(true);
  };

  const logout = () => {
    localStorage.removeItem(`harmony_token_${eventId}`);
    localStorage.removeItem(`harmony_attendee_${eventId}`);
    navigate(`/event/${eventId}`);
  };

  const callPhone = (phone) => {
    window.location.href = `tel:${phone}`;
    showInfo('جاري الاتصال...');
  };

  const openWhatsApp = (phone, name) => {
    // Format phone for WhatsApp
    const cleanPhone = phone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('972') ? cleanPhone : `972${cleanPhone.replace(/^0/, '')}`;
    const message = encodeURIComponent(`مرحباً ${name}، تواصلت معك عبر Harmony Matcher 👋`);
    window.open(`https://wa.me/${waPhone}?text=${message}`, '_blank');
    showSuccess(`تم فتح واتساب للتواصل مع ${name}`);
  };


  const sendDirectMessage = async () => {
    if (!messageText.trim() || !selectedAttendee) return;

    setSendingMessage(true);
    try {
      // For now, we'll use WhatsApp as the messaging method
      // In the future, this could integrate with the in-app messaging system
      const phone = selectedAttendee.phone;
      const name = selectedAttendee.name;
      const cleanPhone = phone.replace(/\D/g, '');
      const waPhone = cleanPhone.startsWith('972') ? cleanPhone : `972${cleanPhone.replace(/^0/, '')}`;
      const fullMessage = encodeURIComponent(messageText.trim());

      window.open(`https://wa.me/${waPhone}?text=${fullMessage}`, '_blank');
      showSuccess(`تم إرسال الرسالة إلى ${name}`);
      setMessageModalOpen(false);
      setMessageText('');
    } catch (error) {
      console.error('Send message error:', error);
      showError('فشل في إرسال الرسالة');
    } finally {
      setSendingMessage(false);
    }
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

  if (loading && allMatches.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Welcome Skeleton */}
          <div className="bg-gray-200 rounded-2xl p-6 mb-6 animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-48 mb-3"></div>
            <div className="h-8 bg-gray-300 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-40"></div>
          </div>

          {/* Search Skeleton */}
          <div className="bg-white rounded-xl p-4 mb-6 animate-pulse">
            <div className="h-12 bg-gray-200 rounded-xl"></div>
          </div>

          {/* Matches Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonLoader key={index} variant="match-card" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-harmony-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {event?.name_ar || event?.name}
                </h1>
                <p className="text-gray-500 text-sm">التطابقات المقترحة</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MessagingNav
                eventId={eventId}
                onConversationSelect={(conversation) => {
                  // Handle conversation selection
                  console.log('Selected conversation:', conversation);
                }}
                currentUser={attendee}
              />
              <button
                onClick={() => setGamificationModalOpen(true)}
                className="text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                title="إنجازاتي"
              >
                <Trophy className="w-5 h-5" />
              </button>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="خروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Welcome Message */}
        <div className="bg-gradient-to-l from-harmony-600 to-harmony-800 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="text-harmony-100 text-sm">مدعوم بالذكاء الاصطناعي</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">
              أهلاً {attendee?.name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-harmony-100">
              وجدنا لك {filteredMatches.length} أشخاص يناسبونك للتواصل
              {filteredMatches.length !== allMatches.length && (
                <span className="text-yellow-200 text-sm"> (من أصل {allMatches.length})</span>
              )}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="البحث في التطابقات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pr-10"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center gap-2 ${getActiveFiltersCount() > 0 ? 'bg-harmony-50 text-harmony-700' : ''}`}
            >
              <Filter className="w-4 h-4" />
              المرشحات
              {getActiveFiltersCount() > 0 && (
                <span className="bg-harmony-600 text-white text-xs rounded-full px-2 py-1">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Score Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحد الأدنى للتطابق
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minScore}
                    onChange={(e) => handleFilterChange('minScore', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-600 mt-1">
                    {filters.minScore}%
                  </div>
                </div>

                {/* Industry Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المجال
                  </label>
                  <select
                    multiple
                    value={filters.industries}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange('industries', values);
                    }}
                    className="input h-24"
                  >
                    {availableIndustries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                {/* Mutual Only */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.mutualOnly}
                      onChange={(e) => handleFilterChange('mutualOnly', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">التطابقات المتبادلة فقط</span>
                  </label>
                </div>

                {/* Saved Only */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.savedOnly}
                      onChange={(e) => handleFilterChange('savedOnly', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">المحفوظات فقط</span>
                  </label>
                </div>
              </div>

              {getActiveFiltersCount() > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    مسح المرشحات
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Matches */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonLoader key={index} variant="match-card" />
            ))}
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="card text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              {allMatches.length === 0 ? 'لا توجد تطابقات بعد' : 'لا توجد تطابقات تطابق المعايير'}
            </h3>
            <p className="text-gray-500 mb-6">
              {allMatches.length === 0
                ? 'سيتم إنشاء التطابقات قريباً'
                : 'جرب تعديل المرشحات أو البحث'
              }
            </p>
            {allMatches.length > 0 && getActiveFiltersCount() > 0 && (
              <button onClick={clearFilters} className="btn-secondary">
                مسح المرشحات
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match) => (
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
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline">اتصال</span>
                  </button>
                  <button
                    onClick={() => openMessageModal(match)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">مراسلة</span>
                  </button>

                  <button
                    onClick={() => openWhatsApp(match.phone, match.name)}
                    className="flex-1 btn-success py-3 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">واتساب</span>
                  </button>

                  {/* Save/Bookmark Button */}
                  <button
                    onClick={() => toggleSaveMatch(match.id)}
                    className={`p-3 rounded-xl transition-all ${
                      savedMatches.has(match.id)
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={savedMatches.has(match.id) ? 'إزالة من المحفوظات' : 'حفظ التطابق'}
                  >
                    <BookmarkPlus className={`w-4 h-4 ${savedMatches.has(match.id) ? 'fill-current' : ''}`} />
                  </button>

                  {match.linkedin_url && (
                    <a
                      href={match.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary py-3 px-4 flex items-center justify-center"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {allMatches.length >= 5 && filteredMatches.length >= 5 && (
          <button
            onClick={loadMoreMatches}
            disabled={loadingMore}
            className="w-full btn-secondary mt-6 py-4 flex items-center justify-center gap-2"
          >
            {loadingMore ? (
              <div className="spinner"></div>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                تحميل المزيد من التطابقات
              </>
            )}
          </button>
        )}

        {/* Results Summary */}
        {allMatches.length > 0 && (
          <div className="text-center text-sm text-gray-500 mt-4">
            عرض {filteredMatches.length} من أصل {allMatches.length} تطابق
            {getActiveFiltersCount() > 0 && ' (مرشحة)'}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-gray-400 text-sm">
          <p>Powered by Harmony Community</p>
        </div>
      </main>

      {/* Message Modal */}
      <MessageModal
        isOpen={messageModalOpen}
        onClose={() => {
          setMessageModalOpen(false);
          setSelectedAttendee(null);
        }}
        attendee={selectedAttendee}
        currentUser={attendee}
        eventId={eventId}
      />

      {/* Gamification Modal */}
      <GamificationDashboard
        attendee={attendee}
        matches={allMatches}
        onClose={() => setGamificationModalOpen(false)}
        isOpen={gamificationModalOpen}
      />
    </div>
  );
}

export default AttendeeMatches;
