import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNotificaciones } from '../services/sheetService';
import { motion, AnimatePresence } from 'framer-motion';

export const useNotifications = () => {
  const { data: notifications = [] } = useQuery({
    queryKey: ['notificaciones_v2'],
    queryFn: fetchNotificaciones,
    refetchInterval: 60000, // Re-check every 1 minute
  });

  const activeTextNotifications = React.useMemo(() => 
    notifications.filter((n: any) => n.type === 'TEXT'), 
    [notifications]
  );
  const activeMediaNotifications = React.useMemo(() => 
    notifications.filter((n: any) => n.type === 'PDF' || n.type === 'IMAGE'), 
    [notifications]
  );

  return { activeTextNotifications, activeMediaNotifications };
};

export const NotificationMediaOverlay = () => {
    const { activeMediaNotifications } = useNotifications();
    const [showOverlay, setShowOverlay] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Cycle every 30 minutes (1800000 ms)
    useEffect(() => {
        if (activeMediaNotifications.length === 0) {
            setShowOverlay(false);
            return;
        }

        const triggerOverlay = () => {
            setShowOverlay(true);
            setCurrentIndex(0);
        };

        // Start cycle initially
        triggerOverlay();
        // Lowered to 1 minute for testing as requested by user
        const timer = setInterval(triggerOverlay, 60 * 1000);
        
        return () => clearInterval(timer);
    }, [activeMediaNotifications.length]);

    // Handle cycling through media
    useEffect(() => {
        if (!showOverlay || activeMediaNotifications.length === 0) return;

        const timer = setTimeout(() => {
            if (currentIndex < activeMediaNotifications.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setShowOverlay(false);
            }
        }, 10000); // Changed to 10 seconds per media as requested by user

        return () => clearTimeout(timer);
    }, [showOverlay, currentIndex, activeMediaNotifications.length]);

    return (
        <AnimatePresence>
            {showOverlay && activeMediaNotifications.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-12 backdrop-blur-xl"
                >
                    {activeMediaNotifications[currentIndex].type === 'IMAGE' && (
                        <img 
                            src={activeMediaNotifications[currentIndex].file_url} 
                            alt="Notificación" 
                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                        />
                    )}
                    {activeMediaNotifications[currentIndex].type === 'PDF' && (
                        <iframe 
                            src={`${activeMediaNotifications[currentIndex].file_url}#toolbar=0`} 
                            className="w-full h-full rounded-2xl shadow-2xl bg-white"
                        />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
