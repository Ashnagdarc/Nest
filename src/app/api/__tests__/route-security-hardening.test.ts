import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextResponse } from 'next/server';
import { PUT as updateGear } from '@/app/api/gears/[id]/route';
import { POST as sendPush } from '@/app/api/push/send/route';
import { POST as sendGoogleChat } from '@/app/api/notifications/google-chat/route';
import { GET as getWeeklyReport } from '@/app/api/reports/weekly/route';
import { POST as writeLog } from '@/app/api/log/route';

const mockRequireActiveAdminRouteUser = jest.fn<() => Promise<unknown>>();
const mockRequireAuthenticatedRouteUser = jest.fn<() => Promise<unknown>>();
const mockGetRouteAuthContext = jest.fn<() => Promise<unknown>>();
const mockCreateSupabaseAdminClient = jest.fn<() => Promise<unknown>>();
const mockNotifyGoogleChat = jest.fn<(eventType: unknown, payload: unknown) => Promise<unknown>>();

jest.mock('@/lib/api-auth', () => ({
  requireActiveAdminRouteUser: () => mockRequireActiveAdminRouteUser(),
  requireAuthenticatedRouteUser: () => mockRequireAuthenticatedRouteUser(),
  getRouteAuthContext: () => mockGetRouteAuthContext(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => mockCreateSupabaseAdminClient(),
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@/utils/googleChat', () => ({
  NotificationEventType: {
    USER_CHECKIN: 'USER_CHECKIN',
    ADMIN_APPROVE_CHECKIN: 'ADMIN_APPROVE_CHECKIN',
  },
  notifyGoogleChat: (...args: [unknown, unknown]) => mockNotifyGoogleChat(...args),
}));

describe('Route security hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks unauthenticated gear updates', async () => {
    mockRequireActiveAdminRouteUser.mockResolvedValueOnce({
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });

    const req = new Request('http://localhost/api/gears/gear-1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated name' }),
    });

    const res = await updateGear(req as Parameters<typeof updateGear>[0], {
      params: Promise.resolve({ id: 'gear-1' }),
    });

    expect(res.status).toBe(401);
  });

  it('blocks non-admin users from pushing to another user', async () => {
    mockGetRouteAuthContext.mockResolvedValueOnce({
      authSupabase: {},
      user: { id: 'user-1' },
      profile: { role: 'User', status: 'Active' },
      isActiveAdmin: false,
    });

    const req = new Request('http://localhost/api/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-2',
        title: 'Test',
        body: 'Hello',
      }),
    });

    const res = await sendPush(req as Parameters<typeof sendPush>[0]);
    expect(res.status).toBe(403);
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('blocks non-admin Google Chat admin events', async () => {
    mockGetRouteAuthContext.mockResolvedValueOnce({
      authSupabase: {},
      user: { id: 'user-1' },
      profile: { role: 'User', status: 'Active' },
      isActiveAdmin: false,
    });

    const req = new Request('http://localhost/api/notifications/google-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        eventType: 'ADMIN_APPROVE_CHECKIN',
        payload: { text: 'admin event' },
      }),
    });

    const res = await sendGoogleChat(req as Parameters<typeof sendGoogleChat>[0]);
    expect(res.status).toBe(403);
    expect(mockNotifyGoogleChat).not.toHaveBeenCalled();
  });

  it('allows authenticated user Google Chat user events', async () => {
    mockGetRouteAuthContext.mockResolvedValueOnce({
      authSupabase: {},
      user: { id: 'user-1' },
      profile: { role: 'User', status: 'Active' },
      isActiveAdmin: false,
    });
    mockNotifyGoogleChat.mockResolvedValueOnce(undefined);

    const req = new Request('http://localhost/api/notifications/google-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        eventType: 'USER_CHECKIN',
        payload: { text: 'user event' },
      }),
    });

    const res = await sendGoogleChat(req as Parameters<typeof sendGoogleChat>[0]);
    expect(res.status).toBe(200);
    expect(mockNotifyGoogleChat).toHaveBeenCalledTimes(1);
  });

  it('blocks unauthenticated weekly report access', async () => {
    mockRequireActiveAdminRouteUser.mockResolvedValueOnce({
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });

    const req = new Request('http://localhost/api/reports/weekly?days=7', { method: 'GET' });
    const res = await getWeeklyReport(req as Parameters<typeof getWeeklyReport>[0]);
    expect(res.status).toBe(401);
  });

  it('blocks unauthenticated log ingestion', async () => {
    mockRequireAuthenticatedRouteUser.mockResolvedValueOnce({
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });

    const req = new Request('http://localhost/api/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ level: 'info', message: 'hello', context: 'test' }),
    });

    const res = await writeLog(req);
    expect(res.status).toBe(401);
  });
});
