import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Settings } from 'lucide-react';
import { useMessaging } from '../contexts/MessagingContext';

const MessagingNav = ({ eventId, onConversationSelect, currentUser }) => {
  const { conversations, unreadCount, loadConversations, isConnected } = useMessaging();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isConnected && eventId) {
      loadConversations(eventId);
    }
  }, [isConnected, eventId, loadConversations]);

  const handleConversationClick = (conversation) => {
    onConversationSelect(conversation);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Messaging Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-harmony-600 transition-colors"
        title="المحادثات"
      >
        <MessageSquare className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full h-3 w-3"></span>
        )}
      </button>

      {/* Messaging Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">المحادثات</h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {isConnected ? 'متصل' : 'غير متصل'}
                </span>
              </div>
            </div>
          </div>

          {/* Conversations List */}
          <div className="max-h-96 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">لا توجد محادثات بعد</p>
                <p className="text-xs mt-1">ابدأ محادثة مع أحد التطابقات</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                // Use other_participant_name from the database query, fallback to default
                const otherParticipantName = conversation.other_participant_name || 'مستخدم';

                return (
                  <button
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation)}
                    className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-10 h-10 bg-harmony-100 dark:bg-harmony-900 rounded-full flex items-center justify-center">
                          <span className="text-harmony-600 dark:text-harmony-400 font-bold text-sm">
                            {otherParticipantName.charAt(0)}
                          </span>
                        </div>
                        {conversation.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {otherParticipantName}
                          </h4>
                          {conversation.last_message_time && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(conversation.last_message_time).toLocaleDateString('ar-EG')}
                            </span>
                          )}
                        </div>
                        {conversation.last_message && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate mt-1">
                            {conversation.last_message}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default MessagingNav;
