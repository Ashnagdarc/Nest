/**
 * Sound utilities for the notification system
 */

// Keep track of reminder timeouts for each notification
const reminderTimeouts: Record<string, NodeJS.Timeout> = {};

// Keep track of active audio elements
const activeAudioElements: HTMLAudioElement[] = [];

// Sound options
export type NotificationSoundType = 'bell' | 'reminder' | 'login';

// URLs for our sounds - Using the existing files for all types
const SOUND_URLS: Record<NotificationSoundType, string> = {
    bell: '/sounds/notification-bell.mp3',
    reminder: '/sounds/mixkit-alert-bells-echo-765.mp3',
    login: '/sounds/mixkit-alert-bells-echo-765.mp3',
};

// Controls if sounds are enabled (respects user preferences)
let soundsEnabled = true;

// Track if user has interacted with the page
let userHasInteracted = false;

// Pre-loaded audio elements (initialized after user interaction)
const audioElements: Record<NotificationSoundType, HTMLAudioElement | null> = {
    bell: null,
    reminder: null,
    login: null
};

// Queue sounds that were attempted before user interaction
const pendingSounds: NotificationSoundType[] = [];

/**
 * Initialize audio elements once user has interacted with the page
 */
function initializeAudioElements(): void {
    if (!browserSupportsAudio()) return;

    // Create and preload all sound elements
    Object.keys(SOUND_URLS).forEach((type) => {
        const soundType = type as NotificationSoundType;
        try {
            const audio = new Audio(SOUND_URLS[soundType]);
            audio.preload = 'auto';
            audio.load(); // Start loading the audio file
            audioElements[soundType] = audio;
        } catch (error) {
            console.error(`Failed to initialize ${type} sound:`, error);
        }
    });

    // Play any pending sounds
    while (pendingSounds.length > 0) {
        const soundType = pendingSounds.shift();
        if (soundType) {
            playInitializedSound(soundType);
        }
    }
}

/**
 * Stop all playing sounds
 */
export function stopAllSounds(): void {
    activeAudioElements.forEach(audio => {
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (error) {
            console.error('Error stopping sound:', error);
        }
    });
    activeAudioElements.length = 0; // Clear the array
}

/**
 * Play already initialized sound
 */
function playInitializedSound(type: NotificationSoundType): void {
    if (!soundsEnabled) return;

    const audio = audioElements[type];
    if (!audio) return;

    try {
        // Stop any existing sounds of the same type
        stopAllSounds();

        // Create a clone to allow for overlapping sounds
        const soundInstance = audio.cloneNode() as HTMLAudioElement;

        // Set appropriate volume
        soundInstance.volume = type === 'login' ? 0.8 : (type === 'reminder' ? 0.5 : 0.7);

        // Add to active audio elements
        activeAudioElements.push(soundInstance);

        // Reset to beginning and play
        soundInstance.currentTime = 0;
        const playPromise = soundInstance.play();

        if (playPromise) {
            playPromise
                .then(() => {
                    // Remove from active elements when done playing
                    soundInstance.addEventListener('ended', () => {
                        const index = activeAudioElements.indexOf(soundInstance);
                        if (index > -1) {
                            activeAudioElements.splice(index, 1);
                        }
                    });
                })
                .catch(err => {
                    console.warn('Could not play sound, will retry after interaction:', err.message);
                    pendingSounds.push(type);
                    // Remove from active elements if failed
                    const index = activeAudioElements.indexOf(soundInstance);
                    if (index > -1) {
                        activeAudioElements.splice(index, 1);
                    }
                });
        }
    } catch (error) {
        console.error('Error playing initialized sound:', error);
    }
}

/**
 * Set up user interaction tracking
 */
export function setupUserInteractionTracking(): void {
    if (typeof window !== 'undefined') {
        // These events indicate user interaction has occurred
        const interactionEvents = ['click', 'keydown', 'touchstart', 'touchend'];

        const handleUserInteraction = () => {
            if (!userHasInteracted) {
                userHasInteracted = true;
                console.log('User interaction detected, initializing audio');
                initializeAudioElements();

                // Remove initial interaction listeners
                interactionEvents.forEach(event => {
                    window.removeEventListener(event, handleUserInteraction);
                });
            }
        };

        // Add the event listeners
        interactionEvents.forEach(event => {
            window.addEventListener(event, handleUserInteraction);
        });
    }
}

/**
 * Check if the browser supports audio
 */
export function browserSupportsAudio(): boolean {
    return typeof window !== 'undefined' && typeof Audio !== 'undefined';
}

/**
 * Toggle sound on/off
 */
export function toggleSounds(enabled: boolean): void {
    soundsEnabled = enabled;
    // Save preference to localStorage
    if (typeof window !== 'undefined') {
        localStorage.setItem('notification_sounds_enabled', enabled ? 'true' : 'false');
    }
}

/**
 * Load sound preferences from localStorage
 */
export function loadSoundPreferences(): void {
    if (typeof window !== 'undefined') {
        const pref = localStorage.getItem('notification_sounds_enabled');
        soundsEnabled = pref !== 'false'; // Default to enabled

        console.log('Sound preferences loaded, sounds enabled:', soundsEnabled);
        // Set up user interaction tracking when loading preferences
        setupUserInteractionTracking();
    }
}

/**
 * Check if sounds are enabled
 */
export function areSoundsEnabled(): boolean {
    return soundsEnabled;
}

/**
 * Play a notification sound
 */
export function playNotificationSound(type: NotificationSoundType = 'bell'): void {
    if (!soundsEnabled || !browserSupportsAudio()) return;

    console.log(`Attempting to play ${type} sound, user has interacted:`, userHasInteracted);

    try {
        if (userHasInteracted && audioElements[type]) {
            // User has interacted and audio is initialized, play normally
            playInitializedSound(type);
        } else if (userHasInteracted) {
            // User has interacted but audio not initialized yet
            initializeAudioElements();
            playInitializedSound(type);
        } else {
            // No user interaction yet, queue for later
            console.log(`Queuing ${type} sound for after user interaction`);
            pendingSounds.push(type);
        }
    } catch (error) {
        console.error('Error in playNotificationSound:', error);
    }
}

/**
 * Set up a reminder for unread notifications
 * @param notificationId The ID of the notification to remind about
 * @param callback Optional callback to execute when reminder triggers
 */
export function setNotificationReminder(
    notificationId: string,
    callback?: () => void
): void {
    // Clear any existing reminder for this notification
    clearNotificationReminder(notificationId);

    // Set a new reminder to beep after 1 minute
    reminderTimeouts[notificationId] = setTimeout(() => {
        playNotificationSound('reminder');
        if (callback) callback();

        // Set up the next reminder (continuing every minute until cleared)
        setNotificationReminder(notificationId, callback);
    }, 60000); // 1 minute
}

/**
 * Clear a notification reminder
 */
export function clearNotificationReminder(notificationId: string): void {
    console.log('Clearing reminder for notification:', notificationId);
    if (reminderTimeouts[notificationId]) {
        clearTimeout(reminderTimeouts[notificationId]);
        delete reminderTimeouts[notificationId];
        // Stop any playing sounds
        stopAllSounds();
    }
}

/**
 * Clear all notification reminders
 */
export function clearAllNotificationReminders(): void {
    console.log('Clearing all notification reminders');
    Object.keys(reminderTimeouts).forEach(id => {
        clearTimeout(reminderTimeouts[id]);
        delete reminderTimeouts[id];
    });
    // Stop all sounds
    stopAllSounds();
}

/**
 * Play login notification sound for new announcements
 */
export function playLoginNotificationSound(): void {
    playNotificationSound('login');
} 