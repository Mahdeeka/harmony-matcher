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
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    const initSocket = () => {
      const newSocket = io(process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        setSocket(newSocket);

        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
        setSocket(null);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          initSocket();
        }, 5000);
      });

      // Handle incoming messages
      newSocket.on('message', (data) => {
        const { conversationId, message } = data;
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), message]
        }));
      });

      // Handle typing indicators
      newSocket.on('typing', (data) => {
        // Handle typing indicators
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

      return newSocket;
    };

    const socketInstance = initSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
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
