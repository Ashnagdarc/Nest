/**
 * Sound utilities for the notification system
 */

// Keep track of notification states
interface NotificationState {
    lastPlayedTimestamp: number;
    hasBeenViewed: boolean;
}

const notificationStates: Record<string, NotificationState> = {};

// Sound options
export type NotificationSoundType = 'bell' | 'reminder' | 'login';

// URLs for our sounds
const SOUND_URLS: Record<NotificationSoundType, string> = {
    bell: '/sounds/notification-bell.mp3',
    reminder: '/sounds/notification-reminder.mp3',
    login: '/sounds/login-notification.mp3',
};

// Controls if sounds are enabled (respects user preferences)
let soundsEnabled = true;

// Track if user has interacted with the page
let userHasInteracted = false;

// Pre-loaded audio elements
const audioElements: Record<NotificationSoundType, HTMLAudioElement | null> = {
    bell: null,
    reminder: null,
    login: null
};

/**
 * Check if browser supports audio playback
 */
function browserSupportsAudio(): boolean {
    return typeof Audio !== 'undefined';
}

/**
 * Initialize audio elements once user has interacted with the page
 */
function initializeAudioElements(): void {
    if (!browserSupportsAudio()) {
        console.warn('Browser does not support audio playback');
        return;
    }

    Object.keys(SOUND_URLS).forEach((type) => {
        const soundType = type as NotificationSoundType;
        try {
            const audio = new Audio(SOUND_URLS[soundType]);
            audio.preload = 'auto';
            audioElements[soundType] = audio;
        } catch (error) {
            console.error(`Failed to initialize ${type} sound:`, error);
        }
    });
}

/**
 * Set up user interaction tracking
 */
export function setupUserInteractionTracking(): void {
    if (typeof window === 'undefined') return;

    const handleUserInteraction = () => {
        userHasInteracted = true;
        initializeAudioElements();
        window.removeEventListener('click', handleUserInteraction);
        window.removeEventListener('keydown', handleUserInteraction);
        window.removeEventListener('touchstart', handleUserInteraction);
    };

    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);
}

/**
 * Play a notification sound
 */
export function playNotificationSound(type: NotificationSoundType = 'bell', notificationId?: string): void {
    if (!soundsEnabled || !browserSupportsAudio() || !userHasInteracted) return;

    // If notification ID is provided, check if it should play
    if (notificationId) {
        const state = notificationStates[notificationId];
        if (state?.hasBeenViewed) return; // Don't play if already viewed
    }

    const audio = audioElements[type];
    if (!audio) return;

    try {
        audio.currentTime = 0;
        audio.play().catch(error => {
            console.error('Error playing notification sound:', error);
        });
    } catch (error) {
        console.error('Error in playNotificationSound:', error);
    }
}

/**
 * Play login notification sound for new announcements
 */
export function playLoginNotificationSound(notificationIds: string[] = []): void {
    if (!soundsEnabled || !userHasInteracted) return;

    // Check if any of the notifications are unviewed
    const hasUnviewedNotifications = notificationIds.some(id => {
        const state = notificationStates[id];
        return !state?.hasBeenViewed;
    });

    if (hasUnviewedNotifications) {
        playNotificationSound('login');
    }
}

/**
 * Mark notification as viewed to prevent repeated sounds
 */
export function markNotificationViewed(notificationId: string): void {
    notificationStates[notificationId] = {
        lastPlayedTimestamp: Date.now(),
        hasBeenViewed: true
    };
}

/**
 * Reset notification state (e.g., when new notification arrives)
 */
export function resetNotificationState(notificationId: string): void {
    notificationStates[notificationId] = {
        lastPlayedTimestamp: Date.now(),
        hasBeenViewed: false
    };
}

/**
 * Toggle sound on/off
 */
export function toggleSounds(enabled: boolean): void {
    soundsEnabled = enabled;
    if (typeof window !== 'undefined') {
        localStorage.setItem('notification_sounds_enabled', enabled ? 'true' : 'false');
    }
}

/**
 * Check if sounds are enabled
 */
export function areSoundsEnabled(): boolean {
    return soundsEnabled;
}

/**
 * Load sound preferences from localStorage
 */
export function loadSoundPreferences(): void {
    if (typeof window !== 'undefined') {
        const pref = localStorage.getItem('notification_sounds_enabled');
        soundsEnabled = pref !== 'false'; // Default to enabled
        setupUserInteractionTracking();
    }
} 