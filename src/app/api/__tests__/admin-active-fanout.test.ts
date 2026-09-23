import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as notifyRequestCreated } from '@/app/api/requests/created/route';

const mockGetUser = jest.fn<() => Promise<{ data: { user: { id: string } | null }; error: unknown }>>();
const mockSendGearRequestEmail = jest.fn<(args: unknown) => Promise<unknown>>();
const eqCalls: Array<[unknown, unknown]> = [];

jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn(async (isAdmin = false) => {
    if (!isAdmin) {
      return {
        auth: { getUser: () => mockGetUser() },
      };
    }

    const makeChain = (terminal: unknown) => {
      const chain: Record<string, unknown> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn((column: unknown, value: unknown) => {
        eqCalls.push([column, value]);
        return chain;
      });
      chain.maybeSingle = jest.fn(async () => terminal);
      chain.single = jest.fn(async () => terminal);
      chain.in = jest.fn(async () => terminal);
      return chain;
    };

    let profilesSeen = 0;
    return {
      from: (table: unknown) => {
        if (table === 'profiles') {
          profilesSeen += 1;
          if (profilesSeen === 1) {
            return makeChain({ data: { role: 'User', status: 'Active' }, error: null });
          }
          if (profilesSeen === 2) {
            return makeChain({
              data: { email: 'user@example.com', full_name: 'User', notification_preferences: {} },
              error: null,
            });
          }
          // Admin fan-out query: awaitable after .eq('status','Active')
          const adminChain: Record<string, unknown> = {};
          adminChain.select = jest.fn(() => adminChain);
          adminChain.eq = jest.fn((column: unknown, value: unknown) => {
            eqCalls.push([column, value]);
            if (column === 'status' && value === 'Active') {
              return Promise.resolve({
                data: [{ email: 'active-admin@example.com', full_name: 'Active Admin', role: 'Admin' }],
                error: null,
              });
            }
            return adminChain;
          });
          return adminChain;
        }
        if (table === 'gear_requests') {
          return makeChain({
            data: {
              id: 'req-1',
              user_id: 'user-1',
              reason: 'Shoot',
              destination: 'Studio',
              expected_duration: '1d',
              created_at: new Date().toISOString(),
            },
            error: null,
          });
        }
        if (table === 'gear_request_gears') {
          return makeChain({ data: [], error: null });
        }
        return makeChain({ data: null, error: null });
      },
    };
  }),
}));

jest.mock('@/lib/email', () => ({
  sendGearRequestEmail: (...args: [unknown]) => mockSendGearRequestEmail(...args),
}));

describe('Admin Active fan-out hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eqCalls.length = 0;
    process.env.RESEND_API_KEY = 'test-key';
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('only emails Active admins for request-created fan-out', async () => {
    const req = new NextRequest('http://localhost/api/requests/created', {
      method: 'POST',
      body: JSON.stringify({ requestId: 'req-1' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await notifyRequestCreated(req);
    expect(res.status).toBe(200);
    expect(eqCalls).toContainEqual(['role', 'Admin']);
    expect(eqCalls).toContainEqual(['status', 'Active']);
    expect(mockSendGearRequestEmail).toHaveBeenCalled();
  });
});
