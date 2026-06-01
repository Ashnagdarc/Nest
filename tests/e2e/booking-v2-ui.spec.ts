import { test, expect, Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:9002';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'adira@edenoasisrealty.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Edenoasis123';
const USER_EMAIL = process.env.TEST_USER_EMAIL || 'gfx2@edenoasisrealty.com';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Samueldaniel12@';

type ApiResult = {
  status: number;
  body: any;
};

async function authFetch(page: Page, path: string, opts: any = {}): Promise<ApiResult> {
  const result = await page.evaluate(async ({ p, o }) => {
    const res = await fetch(p, { ...o, credentials: 'include' });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = { error: await res.text().catch(() => 'Unknown response body') };
    }
    return { status: res.status, body };
  }, { p: path, o: opts });
  return result;
}

async function login(page: Page, email: string, password: string, target: '/user/dashboard' | '/admin/dashboard') {
  await page.goto(`${BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', email);
  await page.fill('#login-password', password);
  await page.click('text=Login');
  await page.waitForURL(`**${target}`, { timeout: 20000 });
}

async function getSessionUserId(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    try {
      const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!key) return null;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.user?.id || parsed?.currentSession?.user?.id || null;
    } catch {
      return null;
    }
  });
}

async function resolveUserId(page: Page): Promise<string | null> {
  const fromSession = await getSessionUserId(page);
  if (fromSession) return fromSession;

  // Fallback: create a lightweight car booking as authenticated user and read requester_id.
  const ts = Date.now();
  const probeDate = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const probeSlot = '11:00-12:00';
  const probeRes = await authFetch(page, '/api/car-bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeName: `PW UserId Probe ${ts}`,
      dateOfUse: probeDate,
      timeSlot: probeSlot,
      destination: 'Probe',
      purpose: 'Probe user id',
    }),
  });

  const requesterId = probeRes.body?.booking?.requester_id || probeRes.body?.data?.requester_id || null;
  const probeBookingId = probeRes.body?.booking?.id || probeRes.body?.data?.id || null;

  if (probeBookingId) {
    await authFetch(page, '/api/car-bookings/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: probeBookingId, reason: 'Cleanup probe' }),
    });
  }

  return requesterId;
}

async function logout(page: Page) {
  const btn = page.getByRole('button', { name: 'Logout' }).first();
  await btn.click();
  await page.waitForURL('**/login', { timeout: 15000 });
}

async function findPendingCarBookingByEmployee(page: Page, employeeName: string, date: string, timeSlot: string) {
  for (let i = 0; i < 25; i++) {
    const res = await authFetch(page, `/api/car-bookings?status=Pending&page=1&pageSize=200`);
    const rows = res.body?.data || [];
    const hit = rows.find((b: any) =>
      b.employee_name === employeeName &&
      b.date_of_use === date &&
      b.time_slot === timeSlot
    );
    if (hit) return hit;
    await page.waitForTimeout(1000);
  }
  return null;
}

async function findPendingGearRequestByReason(page: Page, reasonToken: string) {
  for (let i = 0; i < 25; i++) {
    const res = await authFetch(page, `/api/requests?status=Pending&page=1&pageSize=200`);
    const rows = res.body?.data || [];
    const hit = rows.find((r: any) => String(r.reason || '').includes(reasonToken));
    if (hit) return hit;
    await page.waitForTimeout(1000);
  }
  return null;
}

test.setTimeout(240000);

test('car lifecycle: user creates, admin approves, completes', async ({ page }) => {
  const ts = Date.now();
  const employeeName = `PW Car Approve ${ts}`;
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const timeSlot = '09:00-10:00';

  await login(page, USER_EMAIL, USER_PASSWORD, '/user/dashboard');
  const createRes = await authFetch(page, '/api/car-bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeName, dateOfUse: date, timeSlot, destination: 'E2E', purpose: 'E2E approval path' }),
  });
  expect(createRes.status).toBeLessThan(300);
  expect(createRes.body?.success).toBeTruthy();

  await logout(page);
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/admin/dashboard');

  const booking = await findPendingCarBookingByEmployee(page, employeeName, date, timeSlot);
  expect(booking).toBeTruthy();

  const carsRes = await authFetch(page, '/api/cars');
  expect(carsRes.status).toBeLessThan(300);
  const carId = carsRes.body?.data?.[0]?.id;
  expect(carId).toBeTruthy();

  const assignRes = await authFetch(page, '/api/car-bookings/assign-car', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: booking.id, carId }),
  });
  expect(assignRes.body?.success).toBeTruthy();

  const approveRes = await authFetch(page, '/api/car-bookings/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: booking.id }),
  });
  expect(approveRes.body?.success).toBeTruthy();

  const completeRes = await authFetch(page, '/api/car-bookings/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: booking.id }),
  });
  expect(completeRes.body?.success).toBeTruthy();
});

test('car lifecycle: user creates, admin rejects', async ({ page }) => {
  const ts = Date.now();
  const employeeName = `PW Car Reject ${ts}`;
  const date = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const timeSlot = '10:00-11:00';

  await login(page, USER_EMAIL, USER_PASSWORD, '/user/dashboard');
  const createRes = await authFetch(page, '/api/car-bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeName, dateOfUse: date, timeSlot, destination: 'E2E', purpose: 'E2E reject path' }),
  });
  expect(createRes.status).toBeLessThan(300);
  expect(createRes.body?.success).toBeTruthy();

  await logout(page);
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/admin/dashboard');

  const booking = await findPendingCarBookingByEmployee(page, employeeName, date, timeSlot);
  expect(booking).toBeTruthy();

  const rejectRes = await authFetch(page, '/api/car-bookings/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: booking.id, reason: 'E2E rejection path' }),
  });
  expect(rejectRes.body?.success).toBeTruthy();
});

test('gear lifecycle: user creates, admin approves', async ({ page }) => {
  const ts = Date.now();
  const reason = `PW Gear Approve ${ts}`;

  await login(page, USER_EMAIL, USER_PASSWORD, '/user/dashboard');

  const gearsRes = await authFetch(page, '/api/gears?status=Available&page=1&pageSize=10');
  expect(gearsRes.status).toBeLessThan(300);
  const gearId = gearsRes.body?.data?.[0]?.id;
  expect(gearId).toBeTruthy();

  const userId = await resolveUserId(page);
  expect(userId).toBeTruthy();

  const createReq = await authFetch(page, '/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      reason,
      destination: 'E2E Destination',
      expected_duration: '24hours',
      status: 'Pending',
      gear_request_gears: [{ gear_id: gearId, quantity: 1 }],
    }),
  });
  expect(createReq.status).toBeLessThan(300);
  expect(createReq.body?.success).toBeTruthy();

  await logout(page);
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/admin/dashboard');

  const requestRow = await findPendingGearRequestByReason(page, reason);
  expect(requestRow).toBeTruthy();

  const approveRes = await authFetch(page, '/api/requests/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: requestRow.id }),
  });
  expect(approveRes.body?.success).toBeTruthy();
});

test('gear lifecycle: user creates, admin rejects', async ({ page }) => {
  const ts = Date.now();
  const reason = `PW Gear Reject ${ts}`;

  await login(page, USER_EMAIL, USER_PASSWORD, '/user/dashboard');

  const gearsRes = await authFetch(page, '/api/gears?status=Available&page=1&pageSize=10');
  expect(gearsRes.status).toBeLessThan(300);
  const gearId = gearsRes.body?.data?.[0]?.id;
  expect(gearId).toBeTruthy();

  const userId = await resolveUserId(page);
  expect(userId).toBeTruthy();

  const createReq = await authFetch(page, '/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      reason,
      destination: 'E2E Destination',
      expected_duration: '24hours',
      status: 'Pending',
      gear_request_gears: [{ gear_id: gearId, quantity: 1 }],
    }),
  });
  expect(createReq.status).toBeLessThan(300);
  expect(createReq.body?.success).toBeTruthy();

  await logout(page);
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/admin/dashboard');

  const requestRow = await findPendingGearRequestByReason(page, reason);
  expect(requestRow).toBeTruthy();

  const rejectRes = await authFetch(page, '/api/requests/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: requestRow.id, reason: 'E2E rejection path' }),
  });
  expect(rejectRes.body?.success).toBeTruthy();
});
