import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    // Only connect if we don't already have a socket
    if (socketRef.current) return;

    try {
      const newSocket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = newSocket;

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
        setSocket(newSocket);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.log('Socket connection error (will retry):', error.message);
        setIsConnected(false);
      });

      // Handle incoming messages
      newSocket.on('message', (data) => {
        const { conversationId, message } = data;
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), message]
        }));
      });

      // Handle user status updates
      newSocket.on('user_online', (userId) => {
        setOnlineUsers(prev => new Set(prev).add(userId));
      });

      newSocket.on('user_offline', (userId) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Socket action methods
  const joinConversation = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('join_conversation', { conversationId });
    }
  };

  const leaveConversation = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('leave_conversation', { conversationId });
    }
  };

  const sendMessage = (conversationId, message) => {
    if (socket && isConnected) {
      socket.emit('send_message', { conversationId, message });
    }
  };

  const startTyping = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('typing_start', { conversationId });
    }
  };

  const stopTyping = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('typing_stop', { conversationId });
    }
  };

  const authenticate = (token) => {
    if (socket && isConnected) {
      socket.emit('authenticate', { token });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      messages,
      onlineUsers,
      joinConversation,
      leaveConversation,
      sendMessage,
      startTyping,
      stopTyping,
      authenticate,
      setMessages
    }}>
      {children}
    </SocketContext.Provider>
  );
};
