"use client";

import { useNotifications } from "@/lib/hooks/useNotifications";
import styles from "./NotificationCenter.module.css";

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className={styles.center}>
      <div className={styles.header}>
        <h3>
          Notifications
          {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
        </h3>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={markAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className={styles.empty}>No notifications</div>
      ) : (
        <ul className={styles.list}>
          {notifications.map((notif) => (
            <li
              key={notif.id}
              className={`${styles.item} ${notif.read ? styles.read : styles.unread}`}
            >
              <div className={styles.content}>
                <div className={styles.title}>{notif.title}</div>
                <div className={styles.message}>{notif.message}</div>
                <div className={styles.time}>
                  {new Date(notif.createdAt).toLocaleString()}
                </div>
              </div>
              {!notif.read && (
                <button
                  className={styles.readBtn}
                  onClick={() => markAsRead(notif.id)}
                  title="Mark as read"
                >
                  ✓
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
