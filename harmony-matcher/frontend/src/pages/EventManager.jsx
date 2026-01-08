import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowRight, Upload, Users, Sparkles, CheckCircle, Clock,
  Plus, Trash2, Edit2, Download, Send, ExternalLink, RefreshCw,
  FileSpreadsheet, Globe
} from 'lucide-react';
import axios from 'axios';

function EventManager() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [matchingStatus, setMatchingStatus] = useState({ status: 'pending', processed: 0, total: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHarmonyModal, setShowHarmonyModal] = useState(false);
  const [harmonyMembers, setHarmonyMembers] = useState([]);
  const [selectedHarmonyMembers, setSelectedHarmonyMembers] = useState([]);
  const [newAttendee, setNewAttendee] = useState({
    name: '', phone: '', email: '', title: '', company: '',
    professional_bio: '', skills: '', looking_for: '', offering: ''
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchEvent();
    fetchAttendees();
    fetchMatchingStatus();
  }, [eventId]);

  useEffect(() => {
    // Poll matching status if processing
    if (matchingStatus.status === 'processing') {
      const interval = setInterval(fetchMatchingStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [matchingStatus.status]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}`);
      setEvent(response.data.event);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchAttendees = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}/attendees`);
      setAttendees(response.data.attendees);
    } catch (error) {
      console.error('Error fetching attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchingStatus = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}/matching-status`);
      setMatchingStatus(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const response = await axios.post(`/api/events/${eventId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(response.data.message);
      fetchAttendees();
    } catch (error) {
      alert(error.response?.data?.error || 'فشل في رفع الملف');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const startMatching = async () => {
    try {
      await axios.post(`/api/events/${eventId}/generate-matches`);
      setMatchingStatus({ ...matchingStatus, status: 'processing' });
    } catch (error) {
      alert('فشل في بدء المطابقة');
    }
  };

  const addAttendee = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/events/${eventId}/attendees`, newAttendee);
      setShowAddModal(false);
      setNewAttendee({
        name: '', phone: '', email: '', title: '', company: '',
        professional_bio: '', skills: '', looking_for: '', offering: ''
      });
      fetchAttendees();
    } catch (error) {
      alert(error.response?.data?.error || 'فشل في إضافة المشارك');
    }
  };

  const deleteAttendee = async (attendeeId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المشارك؟')) return;
    try {
      await axios.delete(`/api/attendees/${attendeeId}`);
      fetchAttendees();
    } catch (error) {
      alert('فشل في حذف المشارك');
    }
  };

  const fetchHarmonyMembers = async () => {
    try {
      const response = await axios.get('/api/harmony/members');
      setHarmonyMembers(response.data.members);
      setShowHarmonyModal(true);
    } catch (error) {
      alert('فشل في جلب أعضاء Harmony');
    }
  };

  const importFromHarmony = async () => {
    try {
      const response = await axios.post(`/api/events/${eventId}/import-harmony`, {
        selectedIds: selectedHarmonyMembers
      });
      alert(response.data.message);
      setShowHarmonyModal(false);
      fetchAttendees();
    } catch (error) {
      alert('فشل في الاستيراد');
    }
  };

  const copyEventLink = () => {
    const link = `${window.location.origin}/event/${eventId}`;
    navigator.clipboard.writeText(link);
    alert('تم نسخ الرابط');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
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
              <Link to="/admin" className="text-gray-400 hover:text-gray-600">
                <ArrowRight className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {event?.name_ar || event?.name}
                </h1>
                <p className="text-gray-500 text-sm">إدارة الفعالية</p>
              </div>
            </div>
            <button onClick={copyEventLink} className="btn-secondary">
              <ExternalLink className="w-4 h-4" />
              نسخ رابط المشاركين
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-harmony-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-harmony-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{attendees.length}</p>
                <p className="text-gray-500 text-sm">مشارك</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                matchingStatus.status === 'completed' ? 'bg-green-100' :
                matchingStatus.status === 'processing' ? 'bg-yellow-100' : 'bg-gray-100'
              }`}>
                {matchingStatus.status === 'completed' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : matchingStatus.status === 'processing' ? (
                  <RefreshCw className="w-6 h-6 text-yellow-600 animate-spin" />
                ) : (
                  <Clock className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {matchingStatus.status === 'completed' ? 'مكتمل' :
                   matchingStatus.status === 'processing' ? `${matchingStatus.processed}/${matchingStatus.total}` :
                   'في الانتظار'}
                </p>
                <p className="text-gray-500 text-sm">حالة المطابقة</p>
              </div>
            </div>
          </div>

          <div className="card flex items-center justify-center">
            {matchingStatus.status !== 'processing' && attendees.length >= 2 && (
              <button onClick={startMatching} className="btn-success w-full">
                <Sparkles className="w-5 h-5" />
                {matchingStatus.status === 'completed' ? 'إعادة المطابقة' : 'بدء المطابقة بالذكاء الاصطناعي'}
              </button>
            )}
            {matchingStatus.status === 'processing' && (
              <div className="text-center">
                <div className="spinner mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">جاري المطابقة...</p>
              </div>
            )}
            {attendees.length < 2 && (
              <p className="text-gray-500 text-center">يجب إضافة مشاركين أولاً</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
            disabled={uploading}
          >
            {uploading ? (
              <div className="spinner"></div>
            ) : (
              <FileSpreadsheet className="w-5 h-5" />
            )}
            رفع ملف Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <button onClick={fetchHarmonyMembers} className="btn-secondary">
            <Globe className="w-5 h-5" />
            استيراد من Harmony
          </button>
          
          <button onClick={() => setShowAddModal(true)} className="btn-secondary">
            <Plus className="w-5 h-5" />
            إضافة مشارك
          </button>
        </div>

        {/* Attendees Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">الاسم</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">الهاتف</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">المسمى الوظيفي</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">الشركة</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendees.map((attendee) => (
                  <tr key={attendee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {attendee.photo_url ? (
                          <img 
                            src={attendee.photo_url} 
                            alt={attendee.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-harmony-100 rounded-full flex items-center justify-center">
                            <span className="text-harmony-600 font-bold">
                              {attendee.name?.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{attendee.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-sm" dir="ltr">
                      {attendee.phone}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {attendee.title || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {attendee.company || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteAttendee(attendee.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {attendees.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا يوجد مشاركين. قم برفع ملف Excel أو أضف مشاركين يدوياً.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Attendee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 fade-in my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">إضافة مشارك</h3>
            <form onSubmit={addAttendee}>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الاسم *
                    </label>
                    <input
                      type="text"
                      value={newAttendee.name}
                      onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الهاتف *
                    </label>
                    <input
                      type="tel"
                      value={newAttendee.phone}
                      onChange={(e) => setNewAttendee({ ...newAttendee, phone: e.target.value })}
                      className="input"
                      placeholder="05XXXXXXXX"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المسمى الوظيفي
                    </label>
                    <input
                      type="text"
                      value={newAttendee.title}
                      onChange={(e) => setNewAttendee({ ...newAttendee, title: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الشركة
                    </label>
                    <input
                      type="text"
                      value={newAttendee.company}
                      onChange={(e) => setNewAttendee({ ...newAttendee, company: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={newAttendee.email}
                    onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                    className="input"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نبذة مهنية
                  </label>
                  <textarea
                    value={newAttendee.professional_bio}
                    onChange={(e) => setNewAttendee({ ...newAttendee, professional_bio: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المهارات
                  </label>
                  <input
                    type="text"
                    value={newAttendee.skills}
                    onChange={(e) => setNewAttendee({ ...newAttendee, skills: e.target.value })}
                    className="input"
                    placeholder="مثال: تطوير الويب، التسويق، إدارة المشاريع"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    يبحث عن
                  </label>
                  <input
                    type="text"
                    value={newAttendee.looking_for}
                    onChange={(e) => setNewAttendee({ ...newAttendee, looking_for: e.target.value })}
                    className="input"
                    placeholder="مثال: شراكات، تمويل، موظفين"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    يقدم
                  </label>
                  <input
                    type="text"
                    value={newAttendee.offering}
                    onChange={(e) => setNewAttendee({ ...newAttendee, offering: e.target.value })}
                    className="input"
                    placeholder="مثال: استشارات، إرشاد، خدمات"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn-primary flex-1">
                  إضافة
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Harmony Import Modal */}
      {showHarmonyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 fade-in max-h-[80vh] flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              استيراد من Harmony ({harmonyMembers.length} عضو)
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              ⚠️ ملاحظة: الـ API يوفر الأسماء والصور فقط. ستحتاج لإضافة أرقام الهواتف والتفاصيل الأخرى يدوياً.
            </p>
            <div className="flex-1 overflow-y-auto border rounded-xl p-2 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {harmonyMembers.slice(0, 50).map((member, index) => (
                  <label 
                    key={index}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedHarmonyMembers.includes(index) ? 'bg-harmony-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedHarmonyMembers.includes(index)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHarmonyMembers([...selectedHarmonyMembers, index]);
                        } else {
                          setSelectedHarmonyMembers(selectedHarmonyMembers.filter(i => i !== index));
                        }
                      }}
                      className="rounded"
                    />
                    {member.thumbnail_url && (
                      <img 
                        src={member.thumbnail_url} 
                        alt={member.title}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <span className="text-sm truncate">{member.title}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={importFromHarmony}
                className="btn-primary flex-1"
                disabled={selectedHarmonyMembers.length === 0}
              >
                استيراد {selectedHarmonyMembers.length > 0 ? `(${selectedHarmonyMembers.length})` : ''}
              </button>
              <button 
                onClick={() => setShowHarmonyModal(false)}
                className="btn-secondary flex-1"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventManager;
