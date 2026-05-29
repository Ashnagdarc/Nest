import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import type { BookingApiResponse } from './types';

export function withCorrelationId(correlationId?: string) {
  return correlationId || randomUUID();
}

export function ok<T>(payload: Omit<BookingApiResponse<T>, 'success' | 'correlation_id'>, correlationId?: string) {
  const cid = withCorrelationId(correlationId);
  return NextResponse.json({ success: true, correlation_id: cid, ...payload } satisfies BookingApiResponse<T>);
}

export function fail(code: string, userMessage: string, status = 400, warnings?: string[], correlationId?: string) {
  const cid = withCorrelationId(correlationId);
  return NextResponse.json({
    success: false,
    error_code: code,
    user_message: userMessage,
    warnings: warnings || [],
    correlation_id: cid,
  } satisfies BookingApiResponse, { status });
}
