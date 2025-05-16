import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { registerNotifications, unregisterNotifications } from '@/lib/notifications';
import { useToast } from '@/components/ui/use-toast';

export function NotificationToggle() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        checkSubscriptionStatus();
    }, []);

    async function checkSubscriptionStatus() {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            }
        } catch (error) {
            console.error('Error checking subscription status:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleToggle() {
        try {
            setIsLoading(true);
            if (isSubscribed) {
                await unregisterNotifications();
                setIsSubscribed(false);
                toast({
                    title: 'Notifications disabled',
                    description: 'You will no longer receive push notifications.',
                });
            } else {
                await registerNotifications();
                setIsSubscribed(true);
                toast({
                    title: 'Notifications enabled',
                    description: 'You will now receive push notifications.',
                });
            }
        } catch (error) {
            console.error('Error toggling notifications:', error);
            toast({
                title: 'Error',
                description: 'Failed to update notification settings.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return <Button disabled>Loading...</Button>;
    }

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={handleToggle}
            title={isSubscribed ? 'Disable notifications' : 'Enable notifications'}
        >
            {isSubscribed ? (
                <Bell className="h-4 w-4" />
            ) : (
                <BellOff className="h-4 w-4" />
            )}
        </Button>
    );
} 