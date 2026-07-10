import { NextRequest, NextResponse } from 'next/server';
import {
    getRouteAuthContext as getRouteAuthContextBase,
    requireActiveAdminRouteUser,
    hasValidCronSecret as hasValidCronSecretBase,
} from '@/lib/api-auth';

export async function getRouteAuthContext() {
    return getRouteAuthContextBase();
}

export async function requireActiveAdmin() {
    const authContext = await requireActiveAdminRouteUser();
    if ('errorResponse' in authContext) {
        const payload = await authContext.errorResponse.json();
        return {
            errorResponse: NextResponse.json(payload, { status: authContext.errorResponse.status })
        };
    }

    return authContext;
}

export function hasValidCronSecret(request: NextRequest) {
    return hasValidCronSecretBase(request);
}
