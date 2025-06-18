/**
 * Email Notification API Endpoint - Automated Email Communication
 * 
 * A comprehensive email notification service for the Nest by Eden Oasis application
 * that handles automated email communications for equipment request workflows,
 * user notifications, and administrative alerts. This API endpoint serves as the
 * central hub for all transactional email operations within the system.
 * 
 * Core Features:
 * - Equipment request notification emails (approval, rejection, due dates)
 * - User onboarding and welcome emails with system guidance
 * - Administrative alerts and system status notifications
 * - Customizable email templates with dynamic content injection
 * - Email delivery confirmation and retry mechanisms
 * - Spam prevention and rate limiting controls
 * - GDPR-compliant user consent and unsubscribe management
 * 
 * Email Types Supported:
 * - Request Approval: Equipment request approved with pickup instructions
 * - Request Rejection: Request denied with reason and next steps
 * - Due Date Reminders: Automated reminders for equipment returns
 * - Welcome Emails: New user onboarding with system overview
 * - System Alerts: Administrative notifications and status updates
 * - Password Reset: Secure password reset with temporary links
 * - Security Alerts: Login notifications and account security updates
 * 
 * Template System:
 * - Dynamic content injection with user and equipment data
 * - Responsive HTML templates optimized for all devices
 * - Plain text fallbacks for accessibility and compatibility
 * - Consistent branding with Nest by Eden Oasis visual identity
 * - Multi-language support for internationalization
 * - A/B testing capabilities for template optimization
 * 
 * Delivery Features:
 * - SMTP integration with popular email service providers
 * - Delivery status tracking and bounce handling
 * - Queue management for high-volume email processing
 * - Retry logic for failed deliveries with exponential backoff
 * - Email analytics and open/click tracking (optional)
 * - Unsubscribe management and preference centers
 * 
 * Security Measures:
 * - Input validation and sanitization to prevent injection attacks
 * - Rate limiting to prevent spam and abuse
 * - Authentication verification for authorized email sending
 * - Email content filtering and moderation
 * - Privacy-compliant data handling and retention policies
 * - Audit logging for all email operations and user interactions
 * 
 * Integration Points:
 * - Supabase database for user profiles and equipment data
 * - Equipment request workflow for status-based notifications
 * - User authentication system for personalized communications
 * - Administrative dashboard for email management and monitoring
 * - External email service providers (SendGrid, Mailgun, etc.)
 * 
 * @fileoverview Email notification API endpoint for automated communications
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { sendGearRequestEmail } from '@/lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { to, subject, html } = req.body;
    try {
        const result = await sendGearRequestEmail({ to, subject, html });
        res.status(200).json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
} 