import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

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
  const activeConvRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const eventIdRef = useRef(null); 
  // Initialize socket connection
  useEffect(() => {
    // Try to find any harmony token (for attendees)
    const harmonyTokenKeys = Object.keys(localStorage).filter(key => key.startsWith('harmony_token_'));
    const token = harmonyTokenKeys.length > 0 ? localStorage.getItem(harmonyTokenKeys[0]) : null;

    if (!token) return;

    const newSocket = io('http://localhost:3001', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to messaging server');
      newSocket.emit('authenticate', { token });
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from messaging server');
      setIsConnected(false);
    });

    newSocket.on('new_message', (data) => {
      const { conversationId, message } = data;

      if (activeConvRef.current?.id === conversationId) {
        setMessages(prev => [...prev, message]);
      }

      setConversations(prev => {
        const exists = prev.some(c => c.id === conversationId);
        if (exists) {
          return prev.map(conv =>
            conv.id === conversationId
              ? { ...conv, last_message: message.content, last_message_time: message.created_at, unread_count: (conv.unread_count || 0) + 1 }
              : conv
          );
        }
        // New conversation — reload from server
        if (eventIdRef.current) {
          const evId = eventIdRef.current;
          const tk = localStorage.getItem('harmony_token_current') ||
                     localStorage.getItem(`harmony_token_${evId}`);
          if (tk) {
            fetch(`/api/events/${evId}/conversations`, {
              headers: { Authorization: `Bearer ${tk}` }
            }).then(r => r.json()).then(d => {
              setConversations(d.conversations || []);
              const total = (d.conversations || []).reduce((s, c) => s + (c.unread_count || 0), 0);
              setUnreadCount(total);
            }).catch(() => {});
          }
        }
        return prev;
      });

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

    newSocket.on('messages_delivered', (data) => {
      const { conversationId, messageIds } = data;
      if (activeConvRef.current?.id === conversationId) {
        setMessages(prev => prev.map(msg =>
          messageIds.includes(msg.id) ? { ...msg, is_delivered: 1 } : msg
        ));
      }
    });

    newSocket.on('messages_read', (data) => {
      const { conversationId, messageIds } = data;
      if (activeConvRef.current?.id === conversationId) {
        setMessages(prev => prev.map(msg =>
          messageIds.includes(msg.id) ? { ...msg, is_read: 1, is_delivered: 1 } : msg
        ));
      }
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
  }, []);

  useEffect(() => { activeConvRef.current = activeConversation; }, [activeConversation]);

  const authenticate = useCallback((token, eventId) => {
    if (socket) {
      socket.emit('authenticate', { token });
      localStorage.setItem('harmony_token_current', token);
    }
  }, [socket]);

  const loadConversations = useCallback(async (eventId) => {
    if (!eventId) return;
    eventIdRef.current = eventId;
    try {
      const token = localStorage.getItem('harmony_token_current') || 
                    localStorage.getItem(`harmony_token_${eventId}`);
      if (!token) return;
      
      const response = await fetch(`/api/events/${eventId}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const convs = data.conversations || [];
      setConversations(convs);

      // Calculate total unread count
      const totalUnread = convs.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Load conversations error:', error);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      const harmonyTokenKeys = Object.keys(localStorage).filter(key => key.startsWith('harmony_token_'));
      const token = localStorage.getItem('harmony_token_current') || 
                    (harmonyTokenKeys.length > 0 ? localStorage.getItem(harmonyTokenKeys[0]) : null);
      if (!token) return;
      
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Load messages error:', error);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId, content, messageType = 'text') => {
    if (!socket || !content?.trim()) return;

    try {
      socket.emit('send_message', {
        conversationId,
        content: content.trim(),
        messageType
      });
    } catch (error) {
      console.error('Send message error:', error);
    }
  }, [socket]);

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
      const harmonyTokenKeys = Object.keys(localStorage).filter(key => key.startsWith('harmony_token_'));
      const token = localStorage.getItem('harmony_token_current') ||
                    (harmonyTokenKeys.length > 0 ? localStorage.getItem(harmonyTokenKeys[0]) : null);
      if (!token) return;

      if (socket) {
        socket.emit('mark_conversation_read', { conversationId });
      }

      await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
      ));

      setUnreadCount(prev => Math.max(0, prev - (activeConversation?.unread_count || 0)));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  }, [activeConversation, socket]);


  const createConversation = useCallback(async (eventId, participant1Id, participant2Id) => {
    try {
      const token = localStorage.getItem('harmony_token_current') ||
                    localStorage.getItem(`harmony_token_${eventId}`);
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
        await loadConversations(eventId);
        return data.conversation;
      }
      return null;
    } catch (error) {
      console.error('Create conversation error:', error);
      return null;
    }
  }, [loadConversations]);

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
