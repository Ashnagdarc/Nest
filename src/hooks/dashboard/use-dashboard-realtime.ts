import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeState } from '@/types/dashboard'

/**
 * Custom hook for dashboard real-time subscriptions
 */
export function useDashboardRealtime() {
    const supabase = createClient()

    // Real-time State
    const [realTimeEnabled, setRealTimeEnabled] = useState(true)
    const [realTimeState, setRealTimeState] = useState<RealtimeState>({
        connected: false,
        lastHeartbeat: null,
        subscriptions: [],
        connectionAttempts: 0,
        maxRetries: 5
    })

    // Refs for cleanup
    const subscriptionsRef = useRef<unknown[]>([])
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Setup real-time subscriptions
    const setupRealtimeSubscriptions = useCallback(() => {
        if (!realTimeEnabled) return

        console.log('Setting up real-time subscriptions...')

        // Clear existing subscriptions
        subscriptionsRef.current.forEach(subscription => {
            supabase.removeChannel(subscription)
        })
        subscriptionsRef.current = []

        try {
            // Gears subscription
            const gearsChannel = supabase
                .channel('gears_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'gears'
                }, (payload) => {
                    console.log('Gears change detected:', payload)
                    // Trigger refresh callback if provided
                })
                .subscribe((status) => {
                    console.log('Gears subscription status:', status)
                    if (status === 'SUBSCRIBED') {
                        setRealTimeState(prev => ({
                            ...prev,
                            connected: true,
                            lastHeartbeat: new Date(),
                            subscriptions: [...prev.subscriptions, 'gears']
                        }))
                    }
                })

            // Requests subscription
            const requestsChannel = supabase
                .channel('requests_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'gear_requests'
                }, (payload) => {
                    console.log('Requests change detected:', payload)
                })
                .subscribe((status) => {
                    console.log('Requests subscription status:', status)
                    if (status === 'SUBSCRIBED') {
                        setRealTimeState(prev => ({
                            ...prev,
                            subscriptions: [...prev.subscriptions, 'gear_requests']
                        }))
                    }
                })

            // Activities subscription
            const activitiesChannel = supabase
                .channel('activities_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'gear_activity_log'
                }, (payload) => {
                    console.log('Activities change detected:', payload)
                })
                .subscribe((status) => {
                    console.log('Activities subscription status:', status)
                    if (status === 'SUBSCRIBED') {
                        setRealTimeState(prev => ({
                            ...prev,
                            subscriptions: [...prev.subscriptions, 'gear_activity_log']
                        }))
                    }
                })

            // Store subscriptions for cleanup
            subscriptionsRef.current = [gearsChannel, requestsChannel, activitiesChannel]

        } catch (error) {
            console.error('Failed to setup real-time subscriptions:', error)
            setRealTimeState(prev => ({
                ...prev,
                connected: false,
                connectionAttempts: prev.connectionAttempts + 1
            }))
        }
    }, [realTimeEnabled, supabase])

    // Toggle real-time functionality
    const toggleRealTime = useCallback((enabled: boolean) => {
        setRealTimeEnabled(enabled)

        if (enabled) {
            setupRealtimeSubscriptions()
        } else {
            // Cleanup subscriptions
            subscriptionsRef.current.forEach(subscription => {
                supabase.removeChannel(subscription)
            })
            subscriptionsRef.current = []

            setRealTimeState(prev => ({
                ...prev,
                connected: false,
                subscriptions: []
            }))
        }
    }, [setupRealtimeSubscriptions, supabase])

    // Cleanup function
    const cleanup = useCallback(() => {
        subscriptionsRef.current.forEach(subscription => {
            supabase.removeChannel(subscription)
        })
        subscriptionsRef.current = []

        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current)
        }
    }, [supabase])

    return {
        realTimeEnabled,
        realTimeState,
        setupRealtimeSubscriptions,
        toggleRealTime,
        cleanup
    }
} 