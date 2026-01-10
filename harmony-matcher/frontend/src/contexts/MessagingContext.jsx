import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useToast } from './ToastContext';

const MessagingContext = createContext();

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

export const MessagingProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [currentEventId, setCurrentEventId] = useState(null);
  const { showError } = useToast();

  // Helper to get token for current event
  const getToken = useCallback(() => {
    if (currentEventId) {
      return localStorage.getItem(`harmony_token_${currentEventId}`);
    }
    return localStorage.getItem('harmony_token_current');
  }, [currentEventId]);

  // Initialize socket connection when eventId is set
  useEffect(() => {
    const token = getToken();
    if (!token || !currentEventId) return;

    const socketUrl = import.meta.env.PROD ? '/' : 'http://localhost:3001';
    const newSocket = io(socketUrl, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to messaging server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from messaging server');
      setIsConnected(false);
    });

    newSocket.on('new_message', (data) => {
      const { conversationId, message } = data;

      // Add message to current conversation if active
      if (activeConversation?.id === conversationId) {
        setMessages(prev => [...prev, message]);
      }

      // Update conversation list
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, last_message: message.content, last_message_time: message.created_at, unread_count: conv.unread_count + 1 }
          : conv
      ));

      // Update unread count
      setUnreadCount(prev => prev + 1);
    });

    newSocket.on('user_typing', (data) => {
      setTypingUsers(prev => new Set(prev).add(data.userId));
    });

    newSocket.on('user_stop_typing', (data) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    newSocket.on('conversation_read', (data) => {
      setConversations(prev => prev.map(conv =>
        conv.id === data.conversationId
          ? { ...conv, unread_count: 0 }
          : conv
      ));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [currentEventId, getToken]);

  // Initialize messaging for a specific event
  const initializeForEvent = useCallback((eventId) => {
    setCurrentEventId(eventId);
  }, []);

  const authenticate = useCallback((token, eventId) => {
    if (socket) {
      socket.emit('authenticate', { token });
    }
    if (eventId) {
      setCurrentEventId(eventId);
    }
  }, [socket]);

  const loadConversations = useCallback(async (eventId) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`/api/events/${eventId}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setConversations(data.conversations || []);

      // Calculate total unread count
      const totalUnread = (data.conversations || []).reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Load conversations error:', error);
      showError('فشل في تحميل المحادثات');
    }
  }, [showError, getToken]);

  const loadMessages = useCallback(async (conversationId) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Load messages error:', error);
      showError('فشل في تحميل الرسائل');
    }
  }, [showError, getToken]);

  const sendMessage = useCallback(async (conversationId, content, messageType = 'text') => {
    if (!socket || !content.trim()) return;

    try {
      socket.emit('send_message', {
        conversationId,
        content: content.trim(),
        messageType
      });
    } catch (error) {
      console.error('Send message error:', error);
      showError('فشل في إرسال الرسالة');
    }
  }, [socket, showError]);

  const joinConversation = useCallback((conversationId) => {
    if (socket) {
      socket.emit('join_conversation', { conversationId });
    }
  }, [socket]);

  const leaveConversation = useCallback((conversationId) => {
    if (socket) {
      socket.emit('leave_conversation', { conversationId });
    }
  }, [socket]);

  const startTyping = useCallback((conversationId) => {
    if (socket) {
      socket.emit('start_typing', { conversationId });
    }
  }, [socket]);

  const stopTyping = useCallback((conversationId) => {
    if (socket) {
      socket.emit('stop_typing', { conversationId });
    }
  }, [socket]);

  const markAsRead = useCallback(async (conversationId) => {
    try {
      const token = getToken();
      if (!token) return;

      await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
      ));

      setUnreadCount(prev => Math.max(0, prev - (activeConversation?.unread_count || 0)));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  }, [activeConversation, getToken]);

  const createConversation = useCallback(async (eventId, participant1Id, participant2Id) => {
    try {
      const token = getToken();
      if (!token) return null;

      const response = await fetch(`/api/events/${eventId}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ participant1Id, participant2Id })
      });
      const data = await response.json();

      if (data.conversation) {
        // Add to conversations list if not already there
        setConversations(prev => {
          const exists = prev.some(c => c.id === data.conversation.id);
          if (exists) return prev;
          return [...prev, data.conversation];
        });
        return data.conversation;
      }
      return null;
    } catch (error) {
      console.error('Create conversation error:', error);
      showError('فشل في إنشاء المحادثة');
      return null;
    }
  }, [getToken, showError]);

  return (
    <MessagingContext.Provider value={{
      // Connection state
      isConnected,
      socket,

      // Data
      conversations,
      activeConversation,
      messages,
      unreadCount,
      typingUsers,
      currentEventId,

      // Actions
      authenticate,
      initializeForEvent,
      loadConversations,
      loadMessages,
      sendMessage,
      joinConversation,
      leaveConversation,
      startTyping,
      stopTyping,
      markAsRead,
      createConversation,
      setActiveConversation
    }}>
      {children}
    </MessagingContext.Provider>
  );
};
