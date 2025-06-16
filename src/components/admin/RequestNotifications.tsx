import { motion, AnimatePresence } from '@/lib/motion-fallback';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface RequestNotification {
    id: string;
    type: 'new' | 'pending' | 'checkin';
    userName: string;
    gearNames: string[];
    requestDate: Date;
    dueDate?: Date;
}

interface RequestNotificationsProps {
    notifications: RequestNotification[];
    onView: (id: string) => void;
    onDismiss: (id: string) => void;
}

export function RequestNotifications({ notifications, onView, onDismiss }: RequestNotificationsProps) {
    const getNotificationStyle = (type: RequestNotification['type']) => {
        switch (type) {
            case 'new':
                return {
                    border: 'border-blue-500',
                    bg: 'bg-blue-500/10',
                    icon: <Bell className="h-5 w-5 text-blue-500" />,
                    title: 'New Request'
                };
            case 'pending':
                return {
                    border: 'border-orange-500',
                    bg: 'bg-orange-500/10',
                    icon: <Clock className="h-5 w-5 text-orange-500" />,
                    title: 'Pending Approval'
                };
            case 'checkin':
                return {
                    border: 'border-green-500',
                    bg: 'bg-green-500/10',
                    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                    title: 'Ready for Check-in'
                };
        }
    };

    return (
        <AnimatePresence>
            {notifications.map((notification, index) => {
                const style = getNotificationStyle(notification.type);

                return (
                    <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: index * 0.1 }}
                        className="mb-4"
                    >
                        <Card className={`border-2 ${style.border} shadow-lg`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    {style.icon}
                                    {style.title}
                                    <Badge variant="outline" className="ml-auto">
                                        {format(notification.requestDate, 'MMM d, h:mm a')}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`${style.bg} rounded-lg p-3 mb-3`}>
                                    <p className="font-medium">{notification.userName}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {notification.gearNames.join(', ')}
                                    </p>
                                    {notification.dueDate && (
                                        <div className="flex items-center gap-1 mt-1 text-sm">
                                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                                            Due: {format(notification.dueDate, 'MMM d, yyyy')}
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDismiss(notification.id)}
                                    >
                                        Dismiss
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => onView(notification.id)}
                                    >
                                        View Details
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </AnimatePresence>
    );
} 