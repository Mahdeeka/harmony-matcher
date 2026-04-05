import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Phone, MessageCircle, Linkedin, Star, ChevronDown,
  RefreshCw, LogOut, Sparkles, Heart, ExternalLink, Filter,
  Search, X, ThumbsUp, MessageSquare, BookmarkPlus, Trophy, MoreVertical,
  Target, Award, PenLine, Inbox, Send, Mail, Clock, CheckCheck
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import { useMessaging } from '../contexts/MessagingContext';
import SkeletonLoader from '../components/SkeletonLoader';
import MessagingNav from '../components/MessagingNav';
import MessageModal from '../components/MessageModal';
import GamificationDashboard from '../components/GamificationDashboard';
import ChallengesPanel from '../components/ChallengesPanel';
import Leaderboard from '../components/Leaderboard';
import { ChallengeCompletedToast } from '../components/ChallengeBadges';

function AttendeeMatches() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showInfo } = useToast();
  const {
    conversations,
    unreadCount,
    sendMessage,
    loadConversations,
    createConversation,
    isConnected,
    markAsRead
  } = useMessaging();

  const [attendee, setAttendee] = useState(null);
  const [allMatches, setAllMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [matchError, setMatchError] = useState(null);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [event, setEvent] = useState(null);
  const [newMatchIds, setNewMatchIds] = useState(new Set());
  const [top5Only, setTop5Only] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState(null);

  // Filtering and search states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minScore: 0,
    industries: [],
    mutualOnly: false,
    savedOnly: false
  });
  const [savedMatches, setSavedMatches] = useState(() => {
    try {
      const stored = localStorage.getItem(`harmony_saved_${eventId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  // Tab state
  const [activeTab, setActiveTab] = useState('matches');

  // Messaging modal state
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState(null);

  // Bio edit modal state
  const [bioModalOpen, setBioModalOpen] = useState(false);
  const [bioText, setBioText] = useState('');
  const [bioSaving, setBioSaving] = useState(false);

  // Gamification modal state
  const [gamificationModalOpen, setGamificationModalOpen] = useState(false);

  // Challenges state
  const [challengesPanelOpen, setChallengesPanelOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [completedChallenge, setCompletedChallenge] = useState(null);
  const [challengeStats, setChallengeStats] = useState({ totalPoints: 0, challengesCompleted: 0 });

  // Close overflow menus when tapping anywhere
  useEffect(() => {
    const onDown = () => setOpenMenuFor(null);
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  // Get unique industries from matches
  const availableIndustries = [...new Set(allMatches.map(m => m.industry).filter(Boolean))];

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem(`harmony_token_${eventId}`);
    const storedAttendee = localStorage.getItem(`harmony_attendee_${eventId}`);

    if (!token) {
      navigate(`/event/${eventId}/login`);
      return;
    }

    if (storedAttendee) {
      const parsedAttendee = JSON.parse(storedAttendee);
      setAttendee(parsedAttendee);
      initializeChallenges(parsedAttendee.id);
      fetchChallengeStats(parsedAttendee.id);
    }

    fetchEvent();
    fetchMatches();
  }, [eventId]);

  useEffect(() => {
    if (activeTab === 'messages' && eventId) {
      loadConversations(eventId);
    }
  }, [activeTab, eventId, loadConversations]);

  const initializeChallenges = async (attendeeId) => {
    try {
      const token = localStorage.getItem(`harmony_token_${eventId}`);
      await axios.post(`/api/attendees/${attendeeId}/challenges/initialize`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error initializing challenges:', error);
    }
  };

  const fetchChallengeStats = async (attendeeId) => {
    try {
      const token = localStorage.getItem(`harmony_token_${eventId}`);
      const response = await axios.get(`/api/attendees/${attendeeId}/challenges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChallengeStats({
        totalPoints: response.data.totalPoints || 0,
        challengesCompleted: response.data.challengesCompleted || 0
      });
    } catch (error) {
      console.error('Error fetching challenge stats:', error);
    }
  };

  const updateChallengeProgress = async (challengeKey, increment = 1) => {
    if (!attendee) return;

    try {
      const token = localStorage.getItem(`harmony_token_${eventId}`);
      const response = await axios.post(
        `/api/attendees/${attendee.id}/challenges/${challengeKey}/progress`,
        { increment },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.completed) {
        setCompletedChallenge({
          challenge: response.data.challenge,
          points: response.data.pointsEarned
        });
        fetchChallengeStats(attendee.id);
      }
    } catch (error) {
      console.error('Error updating challenge progress:', error);
    }
  };

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
        match.professional_bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.personal_bio?.toLowerCase().includes(searchTerm.toLowerCase())
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

    // Top 5 today toggle
    if (top5Only) filtered = filtered.slice(0, 5);

    setFilteredMatches(filtered);
  }, [allMatches, searchTerm, filters, savedMatches, top5Only]);

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
      setMatchError(null);
      const response = await axios.get(`/api/attendees/${attendeeId}/matches`);
      setAllMatches(response.data.matches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatchError('فشل في تحميل التطابقات');
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
      const incoming = response.data.matches || [];
      setAllMatches([...allMatches, ...incoming]);
      setNewMatchIds(new Set(incoming.map(m => m.id)));
      setCurrentBatch(response.data.batch);
      showInfo(`تم تحميل ${response.data.matches.length} تطابقات إضافية`);
    } catch (error) {
      console.error('Error loading more matches:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const hideMatch = async (matchId) => {
    try {
      await axios.post(`/api/matches/${matchId}/feedback`, { feedback: 'not_relevant', hide: true });
      setAllMatches(prev => prev.filter(m => m.id !== matchId));
      showInfo('تم إخفاء التطابق');
    } catch (error) {
      console.error('Error hiding match:', error);
    }
  };

  const closeMenus = () => setOpenMenuFor(null);

  const toggleSaveMatch = (matchId) => {
    const newSaved = new Set(savedMatches);
    if (newSaved.has(matchId)) {
      newSaved.delete(matchId);
      showInfo('تم إزالة التطابق من المحفوظات');
    } else {
      newSaved.add(matchId);
      showSuccess('تم حفظ التطابق');
      // Track bookmark challenge
      updateChallengeProgress('bookmark_collector');
    }
    setSavedMatches(newSaved);
    localStorage.setItem(`harmony_saved_${eventId}`, JSON.stringify([...newSaved]));
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

  const openBioModal = () => {
    setBioText(attendee?.personal_bio || '');
    setBioModalOpen(true);
  };

  const saveBio = async () => {
    if (!attendee?.id) return;
    setBioSaving(true);
    try {
      const token = localStorage.getItem(`harmony_token_${eventId}`);
      const { data } = await axios.put(`/api/attendees/${attendee.id}/bio`, {
        personal_bio: bioText.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        const updated = { ...attendee, personal_bio: bioText.trim() };
        setAttendee(updated);
        localStorage.setItem(`harmony_attendee_${eventId}`, JSON.stringify(updated));
        showSuccess('تم تحديث النبذة بنجاح');
        setBioModalOpen(false);
      }
    } catch (error) {
      console.error('Save bio error:', error);
      showInfo('فشل في حفظ النبذة');
    } finally {
      setBioSaving(false);
    }
  };

  const openMessageModal = (matchData) => {
    setSelectedAttendee(matchData);
    setMessageModalOpen(true);
    // Track profile view for explorer challenge
    updateChallengeProgress('the_explorer');
    // Track high score contact
    if (matchData.match_score >= 90) {
      updateChallengeProgress('perfect_match');
    }
    // Track mutual match
    if (matchData.is_mutual === 1) {
      updateChallengeProgress('mutual_connection');
    }
  };

  const logout = () => {
    localStorage.removeItem(`harmony_token_${eventId}`);
    localStorage.removeItem(`harmony_attendee_${eventId}`);
    navigate(`/event/${eventId}/login`);
  };

  const callPhone = (phone) => {
    window.location.href = `tel:${phone}`;
    showInfo('جاري الاتصال...');
  };

  const openWhatsApp = (phone, name, matchData) => {
    // Format phone for WhatsApp
    const cleanPhone = phone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('972') ? cleanPhone : `972${cleanPhone.replace(/^0/, '')}`;
    const message = encodeURIComponent(`مرحباً ${name}، تواصلت معك عبر Harmony Matcher 👋`);
    window.open(`https://wa.me/${waPhone}?text=${message}`, '_blank');
    showSuccess(`تم فتح واتساب للتواصل مع ${name}`);
    // Track messaging challenges
    updateChallengeProgress('first_contact');
    updateChallengeProgress('the_trio');
    updateChallengeProgress('high_five');
    updateChallengeProgress('network_master');
    // Track industry hopper if different industry
    if (matchData?.industry) {
      updateChallengeProgress('industry_hopper');
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
                  const otherId = conversation.participant1_id === attendee?.id
                    ? conversation.participant2_id : conversation.participant1_id;
                  const otherName = conversation.participant1_id === attendee?.id
                    ? conversation.participant2_name : conversation.participant1_name;
                  setSelectedAttendee({
                    id: otherId,
                    name: otherName || 'مستخدم',
                    phone: conversation.participant1_id === attendee?.id
                      ? conversation.participant2_phone : conversation.participant1_phone
                  });
                  setMessageModalOpen(true);
                }}
                currentUser={attendee}
              />
              {/* Profile / Bio Button */}
              <button
                onClick={openBioModal}
                className="relative text-gray-400 hover:text-harmony-600 transition-colors"
                title="نبذة عني"
              >
                <PenLine className="w-5 h-5" />
                {!attendee?.personal_bio && (
                  <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-2 h-2"></span>
                )}
              </button>
              {/* Challenges Button */}
              <button
                onClick={() => setChallengesPanelOpen(true)}
                className="relative text-gray-400 hover:text-purple-600 transition-colors"
                title="التحديات"
              >
                <Target className="w-5 h-5" />
                {challengeStats.totalPoints > 0 && (
                  <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {challengeStats.challengesCompleted}
                  </span>
                )}
              </button>
              {/* Leaderboard Button */}
              <button
                onClick={() => setLeaderboardOpen(true)}
                className="text-gray-400 hover:text-amber-600 transition-colors"
                title="المتصدرين"
              >
                <Award className="w-5 h-5" />
              </button>
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

        {/* Tab Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 flex overflow-hidden">
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'matches'
                ? 'bg-harmony-50 text-harmony-700 border-b-2 border-harmony-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            التطابقات
            {allMatches.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'matches' ? 'bg-harmony-200 text-harmony-800' : 'bg-gray-200 text-gray-600'
              }`}>{allMatches.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'bg-harmony-50 text-harmony-700 border-b-2 border-harmony-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Inbox className="w-4 h-4" />
            الرسائل
            {unreadCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* ===== MESSAGES TAB ===== */}
        {activeTab === 'messages' && (
          <div>
            {conversations.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">لا توجد محادثات بعد</h3>
                <p className="text-gray-500 mb-4">ابدأ بالتواصل مع أحد تطابقاتك لبدء محادثة</p>
                <button
                  onClick={() => setActiveTab('matches')}
                  className="btn-primary px-6 py-2"
                >
                  عرض التطابقات
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const isP1 = conv.participant1_id === attendee?.id;
                  const otherName = isP1
                    ? (conv.other_participant_name || conv.participant2_name)
                    : (conv.other_participant_name || conv.participant1_name);
                  const otherPhoto = isP1
                    ? (conv.other_participant_photo || conv.participant2_photo)
                    : (conv.other_participant_photo || conv.participant1_photo);
                  const otherId = isP1 ? conv.participant2_id : conv.participant1_id;
                  const myUnread = isP1 ? conv.unread_count1 : conv.unread_count2;
                  const unread = conv.unread_count ?? myUnread ?? 0;
                  const lastTime = conv.last_message_time
                    ? new Date(conv.last_message_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedAttendee({
                          id: otherId,
                          name: otherName || 'مستخدم',
                          photo_url: otherPhoto
                        });
                        setMessageModalOpen(true);
                      }}
                      className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-all flex items-center gap-4 ${
                        unread > 0 ? 'border-harmony-200 bg-harmony-50/30' : 'border-gray-100'
                      }`}
                    >
                      {otherPhoto ? (
                        <img src={otherPhoto} alt={otherName} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-harmony-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-harmony-600 font-bold text-lg">
                            {otherName?.charAt(0)}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-bold truncate ${unread > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {otherName || 'مستخدم'}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                            {lastTime}
                          </span>
                        </div>
                        {conv.last_message && (
                          <p className={`text-sm truncate mt-0.5 ${
                            unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'
                          }`}>
                            {conv.last_message}
                          </p>
                        )}
                      </div>

                      {unread > 0 && (
                        <span className="bg-harmony-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-center py-8 text-gray-400 text-sm">
              <p>Powered by Harmony Community</p>
            </div>
          </div>
        )}

        {/* ===== MATCHES TAB ===== */}
        {activeTab === 'matches' && <>
        {/* Challenges Quick Stats */}
        {(challengeStats.totalPoints > 0 || challengeStats.challengesCompleted > 0) && (
          <div
            onClick={() => setChallengesPanelOpen(true)}
            className="bg-white rounded-xl shadow-sm border border-purple-100 p-4 mb-6 cursor-pointer hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">تقدمك في التحديات</p>
                  <p className="text-sm text-gray-500">
                    {challengeStats.challengesCompleted} تحدي مكتمل • {challengeStats.totalPoints} نقطة
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLeaderboardOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                >
                  المتصدرين
                </button>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                placeholder="البحث في التطابقات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
                style={{ paddingRight: '2.5rem' }}
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

        {/* Error Banner */}
        {matchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <p className="text-red-700 text-sm">{matchError}</p>
            <button onClick={fetchMatches} className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center gap-1">
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        )}

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
                className={`card match-card overflow-hidden ${newMatchIds.has(match.id) ? 'ring-2 ring-harmony-200' : ''}`}
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
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-xl text-sm font-extrabold ${getMatchScoreColor(match.match_score)}`}>
                          {Math.round(match.match_score)}%
                        </span>

                        {/* Overflow menu (secondary actions) */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="icon-btn px-3"
                            onClick={() => setOpenMenuFor(openMenuFor === match.id ? null : match.id)}
                            title="المزيد"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          {openMenuFor === match.id && (
                            <div className="menu-panel left-0">
                              <button
                                className="menu-item"
                                onClick={() => { toggleSaveMatch(match.id); closeMenus(); }}
                              >
                                <BookmarkPlus className="w-4 h-4" />
                                {savedMatches.has(match.id) ? 'إزالة من المحفوظات' : 'حفظ التطابق'}
                              </button>

                              {match.linkedin_url && (
                                <a
                                  className="menu-item"
                                  href={match.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={closeMenus}
                                >
                                  <Linkedin className="w-4 h-4" />
                                  LinkedIn
                                </a>
                              )}

                              <button
                                className="menu-item menu-item-danger"
                                onClick={() => { hideMatch(match.id); closeMenus(); }}
                              >
                                <X className="w-4 h-4" />
                                غير مناسب / إخفاء
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {newMatchIds.has(match.id) && (
                      <span className="inline-flex items-center gap-1 text-harmony-700 text-xs mt-1">
                        <Sparkles className="w-3 h-3" />
                        جديد
                      </span>
                    )}
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
                    {match.personal_bio && (
                      <div className="mb-3">
                        <p className="text-gray-500 text-xs mb-1">نبذة شخصية:</p>
                        <p className="text-gray-700 text-sm">{match.personal_bio}</p>
                      </div>
                    )}
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
                {(match.personal_bio || match.professional_bio || match.skills || match.looking_for) && (
                  <button
                    onClick={() => {
                      const next = expandedMatch === match.id ? null : match.id;
                      setExpandedMatch(next);
                      // Track profile view for challenges (best-effort)
                      if (next) {
                        try {
                          const storedAttendee = localStorage.getItem(`harmony_attendee_${eventId}`);
                          const attendeeId = storedAttendee ? JSON.parse(storedAttendee).id : null;
                          if (attendeeId) {
                            axios.post(`/api/attendees/${attendeeId}/activity`, { type: 'profile_view' }).catch(() => {});
                          }
                        } catch (_) {}
                      }
                    }}
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
                    onClick={() => openWhatsApp(match.phone, match.name, match)}
                    className="flex-1 btn-success py-3 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">واتساب</span>
                  </button>
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

        {/* Top 5 today toggle */}
        {allMatches.length > 5 && (
          <button
            onClick={() => setTop5Only(v => !v)}
            className="w-full btn-secondary mt-3 py-3 flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            {top5Only ? 'عرض كل التطابقات' : 'Top 5 اليوم'}
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
        </>}
      </main>

      {/* Message Modal */}
      <MessageModal
        isOpen={messageModalOpen}
        onClose={() => {
          setMessageModalOpen(false);
          setSelectedAttendee(null);
          loadConversations(eventId);
        }}
        attendee={selectedAttendee}
        currentUser={attendee}
        eventId={eventId}
      />

      {/* Gamification Modal */}
      {gamificationModalOpen && (
        <GamificationDashboard
          attendee={attendee}
          matches={allMatches}
          onClose={() => setGamificationModalOpen(false)}
        />
      )}

      {/* Challenges Panel */}
      <ChallengesPanel
        attendeeId={attendee?.id}
        eventId={eventId}
        isOpen={challengesPanelOpen}
        onClose={() => setChallengesPanelOpen(false)}
      />

      {/* Leaderboard */}
      <Leaderboard
        eventId={eventId}
        currentUserId={attendee?.id}
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
      />

      {/* Challenge Completed Toast */}
      {completedChallenge && (
        <ChallengeCompletedToast
          challenge={completedChallenge.challenge}
          points={completedChallenge.points}
          onClose={() => setCompletedChallenge(null)}
        />
      )}

      {/* Bio Edit Modal */}
      {bioModalOpen && (
        <div className="modal-backdrop" onClick={() => setBioModalOpen(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">نبذة عني</h3>
              <button onClick={() => setBioModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-3">
                اكتب نبذة قصيرة عن نفسك تظهر للآخرين عند عرض ملفك الشخصي
              </p>
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value.slice(0, 500))}
                placeholder="مثال: مهندس برمجيات بخبرة 5 سنوات، مهتم بريادة الأعمال والتقنية..."
                className="input w-full h-32 resize-none"
                dir="rtl"
                autoFocus
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{bioText.length}/500</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBioModalOpen(false)}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={saveBio}
                    disabled={bioSaving}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {bioSaving ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendeeMatches;
