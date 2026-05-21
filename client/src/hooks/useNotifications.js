import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popup, setPopup] = useState(null);

  const refresh = useCallback(() => {
    Promise.all([
      api.get('/api/notifications'),
      api.get('/api/notifications/unread-count')
    ])
      .then(([listRes, countRes]) => {
        const list = listRes.data.notifications || [];
        setNotifications(list);
        setUnreadCount(countRes.data.count || 0);
        const latest = list.find((n) => !n.read);
        if (latest) setPopup(latest);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const markRead = async (id) => {
    await api.patch(`/api/notifications/${id}/read`);
    refresh();
  };

  const dismissPopup = () => setPopup(null);

  return { notifications, unreadCount, popup, refresh, markRead, dismissPopup };
}
