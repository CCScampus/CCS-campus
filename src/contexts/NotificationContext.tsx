import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'fee' | 'attendance' | 'system';
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => void;
  notificationsEnabled: boolean;
  toggleNotifications: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Default notifications
const defaultNotifications: Notification[] = [
  {
    id: "1",
    title: "Fee Payment Due",
    message: "5 students have pending fee payments for this month.",
    date: new Date().toISOString(),
    type: "fee",
    read: false
  },
  {
    id: "2",
    title: "Low Attendance Alert",
    message: "3 students have attendance below 75% this month.",
    date: new Date(Date.now() - 86400000).toISOString(),
    type: "attendance",
    read: false
  },
  {
    id: "3",
    title: "System Update",
    message: "The system will undergo maintenance on Sunday, 10PM to 12AM.",
    date: new Date(Date.now() - 172800000).toISOString(),
    type: "system",
    read: true
  }
];

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  
  // Calculate unread count
  const unreadCount = notifications.filter(notif => !notif.read).length;

  // Load notifications from local storage on initial render
  useEffect(() => {
    const storedNotifications = localStorage.getItem('notifications');
    const storedSettings = localStorage.getItem('notificationSettings');
    
    if (storedNotifications) {
      setNotifications(JSON.parse(storedNotifications));
    } else {
      // Use default notifications if none in storage
      setNotifications(defaultNotifications);
    }
    
    if (storedSettings) {
      setNotificationsEnabled(JSON.parse(storedSettings).enabled);
    }
    
    setLoading(false);
  }, []);

  // Save notifications to local storage whenever they change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications, loading]);

  // Save notification settings to local storage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('notificationSettings', JSON.stringify({
        enabled: notificationsEnabled
      }));
    }
  }, [notificationsEnabled, loading]);

  // In a real app, we would subscribe to real-time notifications here
  useEffect(() => {
    // This would be replaced with a Supabase subscription
    // or another real-time notification mechanism
    const intervalId = setInterval(() => {
      if (notificationsEnabled) {
        // Generate a random notification every 5 minutes in development
        const shouldAddNotification = Math.random() > 0.95;
        
        if (shouldAddNotification) {
          const types: ('fee' | 'attendance' | 'system')[] = ['fee', 'attendance', 'system'];
          const randomType = types[Math.floor(Math.random() * types.length)];
          
          const randomMessages = {
            fee: [
              "A student has a pending fee payment",
              "Fee reminder for upcoming due date",
              "New fee payment received"
            ],
            attendance: [
              "Student attendance report generated",
              "Low attendance alert for some students",
              "Attendance patterns updated"
            ],
            system: [
              "System update available",
              "Data backup completed",
              "Maintenance scheduled"
            ]
          };
          
          const randomMessage = randomMessages[randomType][Math.floor(Math.random() * 3)];
          
          addNotification({
            title: `${randomType.charAt(0).toUpperCase() + randomType.slice(1)} Update`,
            message: randomMessage,
            type: randomType
          });
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [notificationsEnabled]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'date' | 'read'>) => {
    if (!notificationsEnabled) return;
    
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Optionally show a browser notification
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message
      });
    }
  };

  const toggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    notificationsEnabled,
    toggleNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 