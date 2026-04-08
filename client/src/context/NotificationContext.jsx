import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'unifyr_notifications_v1';
const NotificationContext = createContext(null);

const readStoredNotifications = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(readStoredNotifications);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (payload) => {
    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: payload.type || 'general',
      title: payload.title || 'Notification',
      message: payload.message || '',
      sessionId: payload.sessionId || null,
      timestamp: payload.timestamp || new Date().toISOString(),
      read: false,
    };

    setNotifications((current) => [notification, ...current].slice(0, 100));
    return notification.id;
  };

  const markNotificationRead = (id) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const markAllRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  const removeNotification = (id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [notifications]
  );

  const unreadMessageCount = useMemo(
    () =>
      notifications.reduce(
        (count, item) => count + (!item.read && item.type === 'new_message' ? 1 : 0),
        0
      ),
    [notifications]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadMessageCount,
        addNotification,
        markNotificationRead,
        markAllRead,
        removeNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
