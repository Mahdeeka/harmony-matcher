import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Users, Sparkles, TrendingUp, BarChart3,
  PieChart, Activity, Calendar, Target, Award,
  Download, Share2, Filter, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

// Mock chart data - in production, this would come from real analytics
const mockAnalytics = {
  totalAttendees: 125,
  matchedPairs: 89,
  averageMatches: 4.2,
  completionRate: 78,
  industryDistribution: [
    { industry: 'تكنولوجيا المعلومات', count: 35, percentage: 28 },
    { industry: 'التسويق', count: 28, percentage: 22 },
    { industry: 'المالية', count: 22, percentage: 18 },
    { industry: 'الاستشارات', count: 18, percentage: 14 },
    { industry: 'أخرى', count: 22, percentage: 18 }
  ],
  matchingTrends: [
    { date: '2024-01-01', matches: 12 },
    { date: '2024-01-02', matches: 18 },
    { date: '2024-01-03', matches: 25 },
    { date: '2024-01-04', matches: 32 },
    { date: '2024-01-05', matches: 28 },
    { date: '2024-01-06', matches: 35 },
    { date: '2024-01-07', matches: 42 }
  ],
  topPerformers: [
    { name: 'أحمد محمد', matches: 8, industry: 'تكنولوجيا المعلومات' },
    { name: 'فاطمة علي', matches: 7, industry: 'التسويق' },
    { name: 'محمد حسن', matches: 6, industry: 'الاستشارات' },
    { name: 'سارة أحمد', matches: 6, industry: 'المالية' },
    { name: 'علي محمود', matches: 5, industry: 'تكنولوجيا المعلومات' }
  ]
};

function EventAnalytics() {
  const { eventId } = useParams();
  const { showSuccess, showInfo } = useToast();
  const [event, setEvent] = useState(null);
  const [analytics, setAnalytics] = useState(mockAnalytics);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchEvent();
    fetchAnalytics();
  }, [eventId, timeRange]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}`);
      setEvent(response.data.event);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // In production, this would fetch real analytics
      // const response = await axios.get(`/api/events/${eventId}/analytics?range=${timeRange}`);
      // setAnalytics(response.data);

      // For now, simulate API delay
      setTimeout(() => {
        setAnalytics(mockAnalytics);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  const exportReport = () => {
    showInfo('جاري إعداد تقرير التحليلات...');
    // In production, this would generate and download a PDF/Excel report
    setTimeout(() => {
      showSuccess('تم تصدير التقرير بنجاح');
    }, 2000);
  };

  const refreshData = () => {
    setLoading(true);
    fetchAnalytics();
    showInfo('جاري تحديث البيانات...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={`/admin/event/${eventId}`} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">تحليلات الفعالية</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{event?.name_ar || event?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={refreshData}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                onClick={exportReport}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                تصدير التقرير
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Time Range Filter */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الفترة الزمنية:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input w-auto"
            >
              <option value="1d">اليوم</option>
              <option value="7d">أسبوع</option>
              <option value="30d">شهر</option>
              <option value="90d">3 أشهر</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{analytics.totalAttendees}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي المشاركين</div>
            <div className="flex items-center justify-center gap-1 mt-2 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">+12%</span>
            </div>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{analytics.matchedPairs}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">الأزواج المتطابقة</div>
            <div className="flex items-center justify-center gap-1 mt-2 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">+8%</span>
            </div>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{analytics.averageMatches}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">متوسط التطابقات</div>
            <div className="flex items-center justify-center gap-1 mt-2 text-blue-600">
              <Activity className="w-4 h-4" />
              <span className="text-xs">ممتاز</span>
            </div>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Award className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{analytics.completionRate}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">معدل الإنجاز</div>
            <div className="flex items-center justify-center gap-1 mt-2 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">+5%</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Industry Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">توزيع المجالات</h3>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              {analytics.industryDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                    ></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.industry}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</span>
                    <span className="text-xs text-gray-500">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Simple bar chart representation */}
            <div className="mt-6 space-y-2">
              {analytics.industryDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 truncate">{item.industry}</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-8">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Matching Trends */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">اتجاهات التطابق</h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-3">
              {analytics.matchingTrends.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(day.date).toLocaleDateString('ar-EG', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-3 flex-1 mx-4">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(day.matches / 50) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-8">{day.matches}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">أفضل المؤدين</h3>
            <Award className="w-5 h-5 text-yellow-500" />
          </div>

          <div className="space-y-4">
            {analytics.topPerformers.map((performer, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{performer.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{performer.industry}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{performer.matches}</div>
                  <div className="text-sm text-gray-500">تطابقات</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => showInfo('مشاركة التحليلات قيد التطوير')}
            className="btn-secondary flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            مشاركة التقرير
          </button>

          <button
            onClick={exportReport}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            تحميل التقرير الكامل
          </button>
        </div>
      </main>
    </div>
  );
}

export default EventAnalytics;
