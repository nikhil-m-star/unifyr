import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import useIsMobile from '../hooks/useIsMobile';

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const NotificationsView = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    notifications,
    markNotificationRead,
    markAllRead,
    removeNotification,
    clearNotifications,
  } = useNotifications();

  return (
    <div className="market-shell">
      <div className="messages-header">
        <h1 className="page-title">Notifications</h1>
      </div>

      {notifications.length > 0 ? (
        <>
          <div className="notifications-toolbar">
            <button type="button" className="btn-secondary" onClick={markAllRead}>
              <CheckCheck size={15} /> Mark all read
            </button>
            <button type="button" className="btn-ghost" onClick={clearNotifications}>
              <Trash2 size={15} /> Clear all
            </button>
          </div>

          <div className="notifications-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item${notification.read ? '' : ' notification-item--unread'}`}
                onClick={() => {
                  markNotificationRead(notification.id);
                  if (notification.sessionId) {
                    navigate(`/messages/${notification.sessionId}`);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    markNotificationRead(notification.id);
                    if (notification.sessionId) {
                      navigate(`/messages/${notification.sessionId}`);
                    }
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="notification-item__head">
                  <div className="notification-item__title-wrap">
                    {!notification.read && <span className="notification-dot" />}
                    <h3>{notification.title}</h3>
                  </div>
                  <span>{formatTime(notification.timestamp)}</span>
                </div>
                <p>{notification.message}</p>
                <div className="notification-item__actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      markNotificationRead(notification.id);
                    }}
                  >
                    Mark read
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeNotification(notification.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="messages-empty">
          <div className="messages-empty__icon">
            <Bell size={isMobile ? 24 : 28} />
          </div>
          <h2>No Notifications Yet</h2>
          <p>We will notify you here about teammate updates and new messages.</p>
        </div>
      )}
    </div>
  );
};

export default NotificationsView;

