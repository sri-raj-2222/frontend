import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotificationType = 'info' | 'success' | 'request' | 'match';

interface Notification {
  id: string;
  content: string;
  type: NotificationType;
}

interface NotificationToastProps {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((note) => (
          <NotificationItem 
            key={note.id} 
            note={note} 
            onClose={() => removeNotification(note.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const NotificationItem: React.FC<{ note: Notification; onClose: () => void }> = ({ note, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    info: <Bell className="h-5 w-5 text-blue-500" />,
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    request: <MessageSquare className="h-5 w-5 text-primary" />,
    match: <CheckCircle2 className="h-5 w-5 text-amber-500" />,
  };

  const bgColors = {
    info: 'bg-blue-50 border-blue-100',
    success: 'bg-green-50 border-green-100',
    request: 'bg-primary/5 border-primary/20',
    match: 'bg-amber-50 border-amber-100',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className={cn(
        "pointer-events-auto w-80 p-4 rounded-2xl border shadow-2xl flex items-start gap-4 bg-white dark:bg-card",
        bgColors[note.type]
      )}
    >
      <div className="shrink-0 mt-1">
        {icons[note.type]}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-foreground leading-tight">
          {note.content}
        </p>
        {note.type === 'request' && (
          <button 
            onClick={() => {
              window.location.href = '/activity'
              onClose()
            }}
            className="mt-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
          >
            View Request
          </button>
        )}
      </div>
      <button 
        onClick={onClose}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};
