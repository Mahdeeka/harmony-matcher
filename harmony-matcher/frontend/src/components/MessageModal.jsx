import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Phone, MessageCircle, User, Clock } from 'lucide-react';
import { useMessaging } from '../contexts/MessagingContext';
import { useToast } from '../contexts/ToastContext';

const MessageModal = ({ isOpen, onClose, attendee, currentUser, eventId }) => {
  const { showSuccess, showError } = useToast();
  const {
    isConnected,
    messages,
    sendMessage,
    joinConversation,
    conversations,
    loadMessages,
    activeConversation,
    setActiveConversation
  } = useMessaging();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Find existing conversation or create new one
  const conversation = conversations.find(conv =>
    (conv.participant1_id === currentUser?.id && conv.participant2_id === attendee?.id) ||
    (conv.participant1_id === attendee?.id && conv.participant2_id === currentUser?.id)
  );
  const conversationId = conversation?.id;

  useEffect(() => {
    if (isOpen && conversationId) {
      setActiveConversation(conversation);
      joinConversation(conversationId);
      loadMessages(conversationId);

      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }

    return () => {
      setActiveConversation(null);
    };
  }, [isOpen, conversationId, joinConversation, loadMessages, setActiveConversation, conversation]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      return;
    }

    if (!isConnected) {
      showError('الاتصال غير متاح - سيتم إرسال الرسالة لاحقاً');
      return;
    }

    try {
      await sendMessage(conversationId, newMessage.trim());
      setNewMessage('');
      showSuccess('تم إرسال الرسالة');
    } catch (error) {
      showError('فشل في إرسال الرسالة');
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // In a real implementation, you'd emit typing events
    }

    // Clear typing indicator after 3 seconds of inactivity
    setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  const conversationMessages = messages || [];
  const isAttendeeOnline = isConnected; // For now, assume online if connected

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-md h-[600px] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="relative">
              {attendee?.photo_url ? (
                <img
                  src={attendee.photo_url}
                  alt={attendee.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-harmony-100 dark:bg-harmony-900 rounded-full flex items-center justify-center">
                  <span className="text-harmony-600 dark:text-harmony-400 font-bold">
                    {attendee?.name?.charAt(0)}
                  </span>
                </div>
              )}
              {isAttendeeOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{attendee?.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                {isAttendeeOnline ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    متصل الآن
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    آخر ظهور منذ دقائق
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`tel:${attendee?.phone}`)}
              className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              title="اتصال"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              onClick={() => window.open(`https://wa.me/${attendee?.phone?.replace(/\D/g, '')}`, '_blank')}
              className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              title="واتساب"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversationMessages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">ابدأ المحادثة!</p>
              <p className="text-sm">أرسل رسالة لـ {attendee?.name} لبدء التواصل</p>
            </div>
          ) : (
            conversationMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-2xl ${
                    message.sender_id === currentUser?.id
                      ? 'bg-harmony-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender_id === currentUser?.id
                      ? 'text-harmony-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {new Date(message.created_at).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
              الاتصال غير متاح - الرسائل سيتم إرسالها لاحقاً
            </p>
          </div>
        )}

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder={`اكتب رسالة لـ ${attendee?.name}...`}
              className="flex-1 input"
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>اضغط Enter للإرسال</span>
            {isTyping && (
              <span className="flex items-center gap-1">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                يكتب...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
