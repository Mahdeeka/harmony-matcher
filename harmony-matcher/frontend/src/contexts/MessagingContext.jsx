import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const [authToken, setAuthToken] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const { showError } = useToast();

  const wsUrl = useMemo(() => {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      return `${proto}://${window.location.host}/ws`;
    }
    return 'ws://localhost:3001/ws';
  }, []);

  const getEventIdFromPath = useCallback(() => {
    const m = window.location.pathname.match(/\/event\/([^/]+)/);
    return m?.[1] || null;
  }, []);

  const connect = useCallback((token) => {
    if (!token) return;

    // Clear any scheduled reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Reconnect after a short delay if we still have a token
      reconnectTimeoutRef.current = setTimeout(() => {
        connect(token);
      }, 3000);
    };

    ws.onerror = () => {
      // Let onclose handle reconnect
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'new_message': {
          const { conversationId, message } = msg;

          if (activeConversation?.id === conversationId) {
            setMessages(prev => [...prev, message]);
          }

          setConversations(prev => prev.map(conv =>
            conv.id === conversationId
              ? {
                  ...conv,
                  last_message: message.content,
                  last_message_time: message.created_at,
                  unread_count: (conv.unread_count || 0) + 1
                }
              : conv
          ));

          setUnreadCount(prev => prev + 1);
          break;
        }
        case 'user_typing': {
          setTypingUsers(prev => new Set(prev).add(msg.userId));
          break;
        }
        case 'user_stop_typing': {
          setTypingUsers(prev => {
            const s = new Set(prev);
            s.delete(msg.userId);
            return s;
          });
          break;
        }
        case 'conversation_read': {
          setConversations(prev => prev.map(conv =>
            conv.id === msg.conversationId
              ? { ...conv, unread_count: 0 }
              : conv
          ));
          break;
        }
        default:
          break;
      }
    };
  }, [activeConversation, wsUrl]);

  // Bootstrap token from current route OR from a custom auth event
  useEffect(() => {
    const bootstrap = () => {
      const eventId = getEventIdFromPath();
      if (!eventId) return;
      const token = localStorage.getItem(`harmony_token_${eventId}`);
      if (token) {
        setAuthToken(token);
        connect(token);
      }
    };

    const onAuthChanged = (e) => {
      const token = e?.detail?.token;
      if (token) {
        setAuthToken(token);
        connect(token);
      } else {
        bootstrap();
      }
    };

    const onStorage = () => bootstrap();

    bootstrap();
    window.addEventListener('harmony_auth_changed', onAuthChanged);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('harmony_auth_changed', onAuthChanged);
      window.removeEventListener('storage', onStorage);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
    };
  }, [connect, getEventIdFromPath]);

  const authenticate = useCallback((token) => {
    if (!token) return;
    setAuthToken(token);
    connect(token);
  }, [connect]);

  const loadConversations = useCallback(async (eventId) => {
    try {
      const token = localStorage.getItem('harmony_token_current');
      const response = await fetch(`/api/events/${eventId}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setConversations(data.conversations);

      // Calculate total unread count
      const totalUnread = data.conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Load conversations error:', error);
      showError('فشل في تحميل المحادثات');
    }
  }, [showError]);

  const loadMessages = useCallback(async (conversationId) => {
    try {
      const token = localStorage.getItem('harmony_token_current');
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Load messages error:', error);
      showError('فشل في تحميل الرسائل');
    }
  }, [showError]);

  const sendMessage = useCallback(async (conversationId, content, messageType = 'text') => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !content.trim() || !conversationId) return;

    try {
      ws.send(JSON.stringify({
        type: 'send_message',
        conversationId,
        content: content.trim(),
        messageType
      }));
    } catch (error) {
      console.error('Send message error:', error);
      showError('فشل في إرسال الرسالة');
    }
  }, [showError]);

  const joinConversation = useCallback((conversationId) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && conversationId) {
      ws.send(JSON.stringify({ type: 'join_conversation', conversationId }));
    }
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && conversationId) {
      ws.send(JSON.stringify({ type: 'leave_conversation', conversationId }));
    }
  }, []);

  const startTyping = useCallback((conversationId) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && conversationId) {
      ws.send(JSON.stringify({ type: 'start_typing', conversationId }));
    }
  }, []);

  const stopTyping = useCallback((conversationId) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && conversationId) {
      ws.send(JSON.stringify({ type: 'stop_typing', conversationId }));
    }
  }, []);

  const markAsRead = useCallback(async (conversationId) => {
    try {
      const token = localStorage.getItem('harmony_token_current');
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
  }, [activeConversation]);

  const createConversation = useCallback(async (eventId, participant1Id, participant2Id) => {
    // This will be handled by the sendMessage function when no conversation exists
    // The backend will create the conversation automatically
    console.log('Creating conversation between', participant1Id, 'and', participant2Id);
  }, []);

  return (
    <MessagingContext.Provider value={{
      // Connection state
      isConnected,
      socket: wsRef.current,

      // Data
      conversations,
      activeConversation,
      messages,
      unreadCount,
      typingUsers,

      // Actions
      authenticate,
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
