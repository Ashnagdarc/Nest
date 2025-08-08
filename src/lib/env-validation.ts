/**
 * Environment Variable Validation System
 * Validates all required environment variables and provides helpful error messages
 * 
 * This module ensures that all necessary environment variables are properly configured
 * before the application starts, preventing runtime errors and providing clear
 * guidance for missing or misconfigured variables.
 */

export interface EnvValidationResult {
    isValid: boolean;
    missing: string[];
    warnings: string[];
    errors: string[];
}

export interface EnvConfig {
    required: string[];
    optional: string[];
    productionOnly: string[];
    developmentOnly: string[];
}

const ENV_CONFIG: EnvConfig = {
    required: [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'RESEND_API_KEY'
    ],
    optional: [
        'NEXT_PUBLIC_BASE_URL',
        'CRON_SECRET',
        'GOOGLE_CHAT_WEBHOOK_URL',
        'GOOGLE_CHAT_WEBHOOK_URL_DEV',
        'FCM_SERVER_KEY',
        'NEXT_PUBLIC_SITE_URL',
        'GOOGLE_SITE_VERIFICATION'
    ],
    productionOnly: [
        'CRON_SECRET',
        'GOOGLE_CHAT_WEBHOOK_URL'
    ],
    developmentOnly: [
        'GOOGLE_CHAT_WEBHOOK_URL_DEV'
    ]
};

/**
 * Validates all environment variables based on the current environment
 * @returns EnvValidationResult with validation status and issues
 */
export function validateEnvironment(): EnvValidationResult {
    const result: EnvValidationResult = {
        isValid: true,
        missing: [],
        warnings: [],
        errors: []
    };

    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Check required variables
    for (const envVar of ENV_CONFIG.required) {
        if (!process.env[envVar]) {
            result.missing.push(envVar);
            result.isValid = false;
        }
    }

    // Check production-only variables
    if (isProduction) {
        for (const envVar of ENV_CONFIG.productionOnly) {
            if (!process.env[envVar]) {
                result.warnings.push(`${envVar} is recommended for production`);
            }
        }
    }

    // Check development-only variables
    if (isDevelopment) {
        for (const envVar of ENV_CONFIG.developmentOnly) {
            if (!process.env[envVar]) {
                result.warnings.push(`${envVar} is recommended for development`);
            }
        }
    }

    // Validate specific variables
    validateSpecificVariables(result);

    return result;
}

/**
 * Validates specific environment variables for format and content
 * @param result - The validation result object to update
 */
function validateSpecificVariables(result: EnvValidationResult): void {
    // Validate Supabase URL format
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('supabase.co')) {
        result.warnings.push('NEXT_PUBLIC_SUPABASE_URL may not be a valid Supabase URL');
    }

    // Validate API keys have minimum length
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && resendKey.length < 20) {
        result.warnings.push('RESEND_API_KEY seems too short');
    }

    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseKey && supabaseKey.length < 50) {
        result.warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY seems too short');
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey && serviceRoleKey.length < 50) {
        result.warnings.push('SUPABASE_SERVICE_ROLE_KEY seems too short');
    }

    // Validate URL formats
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (baseUrl && !baseUrl.startsWith('http')) {
        result.warnings.push('NEXT_PUBLIC_BASE_URL should be a valid URL starting with http');
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && !siteUrl.startsWith('http')) {
        result.warnings.push('NEXT_PUBLIC_SITE_URL should be a valid URL starting with http');
    }
}

/**
 * Gets a human-readable status message for the environment validation
 * @returns Status message string
 */
export function getEnvironmentStatus(): string {
    const validation = validateEnvironment();

    if (!validation.isValid) {
        return `❌ Environment validation failed. Missing: ${validation.missing.join(', ')}`;
    }

    if (validation.warnings.length > 0) {
        return `⚠️ Environment has warnings: ${validation.warnings.join(', ')}`;
    }

    return '✅ Environment validation passed';
}

/**
 * Logs environment validation results to console
 * @param showDetails - Whether to show detailed validation results
 */
export function logEnvironmentStatus(showDetails: boolean = false): void {
    const validation = validateEnvironment();
    const status = getEnvironmentStatus();

    console.log(`[Environment] ${status}`);

    if (showDetails) {
        if (validation.missing.length > 0) {
            console.error('[Environment] Missing required variables:', validation.missing);
        }
        if (validation.warnings.length > 0) {
            console.warn('[Environment] Warnings:', validation.warnings);
        }
        if (validation.errors.length > 0) {
            console.error('[Environment] Errors:', validation.errors);
        }
    }
}

/**
 * Throws an error if environment validation fails
 * @throws Error if environment is not properly configured
 */
export function assertEnvironmentValid(): void {
    const validation = validateEnvironment();
    if (!validation.isValid) {
        throw new Error(`Environment validation failed: ${validation.missing.join(', ')}`);
    }
}
