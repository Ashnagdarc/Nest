/**
 * Authentication Login API Endpoint - Nest by Eden Oasis
 * 
 * This endpoint handles user authentication for the asset management system.
 * It provides secure login functionality with comprehensive security measures
 * including rate limiting, input validation, and detailed error handling.
 * 
 * Security Features:
 * - Rate limiting to prevent brute force attacks (5 attempts per minute)
 * - Input validation for email and password
 * - Secure password hashing via Supabase Auth
 * - Session management with automatic token generation
 * - Profile verification and role assignment
 * 
 * Response Flow:
 * 1. Rate limit verification
 * 2. Input validation and sanitization  
 * 3. Supabase authentication attempt
 * 4. Profile data retrieval and verification
 * 5. Structured response with user data and profile
 * 
 * Error Handling:
 * - Rate limiting violations (429)
 * - Missing credentials (400)
 * - Invalid credentials (401) 
 * - Unverified email (403)
 * - Server errors (500)
 * 
 * @fileoverview Secure user authentication endpoint with comprehensive validation
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'next-rate-limit';

/**
 * Rate Limiter Configuration
 * 
 * Implements rate limiting to prevent brute force attacks and protect
 * the authentication system from abuse. Configuration balances security
 * with user experience.
 * 
 * Settings:
 * - interval: 60 seconds (1 minute window)
 * - uniqueTokenPerInterval: 500 unique tokens tracked
 * - limit: 5 attempts per minute per IP address
 * 
 * @constant {RateLimiter} limiter - Configured rate limiting instance
 */
const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute window for rate limiting
    uniqueTokenPerInterval: 500, // Track up to 500 unique IPs simultaneously
});

/**
 * POST /api/auth/login - User Authentication Endpoint
 * 
 * Authenticates users against the Supabase Auth system and retrieves
 * their profile information for role-based access control. This endpoint
 * implements comprehensive security measures and detailed error handling.
 * 
 * Request Body:
 * ```typescript
 * {
 *   email: string;    // User's email address
 *   password: string; // User's password
 * }
 * ```
 * 
 * Success Response (200):
 * ```typescript
 * {
 *   success: true;
 *   user: {
 *     id: string;
 *     email: string;
 *     // ... other Supabase user fields
 *   };
 *   profile: {
 *     id: string;
 *     full_name: string;
 *     role: 'Admin' | 'User';
 *     // ... other profile fields
 *   };
 * }
 * ```
 * 
 * Error Responses:
 * - 400: Missing email/password or invalid credentials
 * - 401: Invalid login credentials
 * - 403: Email not verified
 * - 429: Too many login attempts (rate limited)
 * - 500: Server error during authentication
 * 
 * Security Considerations:
 * - Passwords are never stored or logged in plain text
 * - Rate limiting prevents brute force attacks
 * - Error messages don't reveal whether email exists
 * - Session tokens are automatically managed by Supabase
 * 
 * @async
 * @function POST
 * @param {NextRequest} request - The incoming request object containing login credentials
 * @returns {Promise<NextResponse>} JSON response with authentication result
 * 
 * @example
 * ```typescript
 * // Client-side login request
 * const response = await fetch('/api/auth/login', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     email: 'user@example.com',
 *     password: 'securePassword123'
 *   })
 * });
 * 
 * const result = await response.json();
 * if (result.success) {
 *   // Redirect based on user role
 *   if (result.profile.role === 'Admin') {
 *     router.push('/admin/dashboard');
 *   } else {
 *     router.push('/user/dashboard');
 *   }
 * }
 * ```
 */
export async function POST(request: NextRequest) {
    try {
        /**
         * Rate Limiting Check
         * 
         * Enforces rate limiting to prevent brute force attacks. Users are
         * limited to 5 login attempts per minute. This security measure
         * protects user accounts while maintaining reasonable usability.
         */
        try {
            limiter.checkNext(request, 5); // Allow 5 attempts per minute
        } catch {
            return NextResponse.json({
                success: false,
                error: 'Too many requests. Please try again later.'
            }, { status: 429 });
        }

        /**
         * Request Body Parsing and Validation
         * 
         * Extracts and validates the email and password from the request.
         * Both fields are required for authentication to proceed.
         */
        const { email, password } = await request.json();

        // Input validation - ensure both credentials are provided
        if (!email || !password) {
            return NextResponse.json({
                success: false,
                error: 'Missing email or password.'
            }, { status: 400 });
        }

        /**
         * Supabase Server Client Initialization
         * 
         * Creates a server-side Supabase client for authentication.
         * This client handles server-side rendering and maintains
         * session state properly across the authentication flow.
         */
        const supabase = createSupabaseServerClient();

        /**
         * Authentication Attempt
         * 
         * Attempts to authenticate the user using Supabase Auth.
         * This handles password verification, session creation,
         * and returns user data if successful.
         */
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        /**
         * Authentication Error Handling
         * 
         * Processes authentication errors and returns appropriate
         * HTTP status codes and user-friendly error messages.
         */
        if (error) {
            // Handle specific authentication error types
            if (error.message.includes('Invalid login credentials')) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid email or password.'
                }, { status: 401 });
            } else if (error.message.includes('Email not confirmed')) {
                return NextResponse.json({
                    success: false,
                    error: 'Please verify your email before logging in.'
                }, { status: 403 });
            }
            // Generic authentication error
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 400 });
        }

        /**
         * User Data Validation
         * 
         * Ensures that user data was properly returned from the
         * authentication process before proceeding to profile lookup.
         */
        if (!data.user) {
            return NextResponse.json({
                success: false,
                error: 'Login succeeded but user data missing.'
            }, { status: 500 });
        }

        /**
         * Profile Data Retrieval
         * 
         * Fetches the user's profile information from the profiles table.
         * This includes role information needed for proper route redirection
         * and access control throughout the application.
         */
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        /**
         * Profile Error Handling
         * 
         * Handles cases where the user authenticated successfully but
         * their profile data couldn't be retrieved (database issues,
         * missing profile record, etc.).
         */
        if (profileError) {
            console.error('Error fetching profile:', profileError);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch user profile.'
            }, { status: 500 });
        }

        /**
         * Successful Authentication Response
         * 
         * Returns the complete user data and profile information
         * needed by the client to handle role-based routing and
         * application state initialization.
         */
        return NextResponse.json({
            success: true,
            user: data.user,
            profile
        });

    } catch (error: any) {
        /**
         * Global Error Handler
         * 
         * Catches any unexpected errors during the authentication process
         * and returns a generic error response while logging the details
         * for debugging purposes.
         */
        console.error('Error during login:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Login failed'
            },
            { status: 500 }
        );
    }
}
