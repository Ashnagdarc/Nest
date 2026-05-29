import { test, expect } from '@playwright/test';
import fs from 'fs';

const BASE = process.env.BASE_URL || 'http://localhost:9002';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'adira@edenoasisrealty.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Edenoasis123';
const USER_EMAIL = process.env.TEST_USER_EMAIL || 'gfx2@edenoasisrealty.com';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Samueldaniel12@';

async function authFetch(page: any, path: string, opts: any = {}) {
  return await page.evaluate(async ({ p, o }) => {
    const res = await fetch(p, { ...o, credentials: 'include' });
    let json = null;
    let text = null;
    try { json = await res.json(); } catch (e) { try { text = await res.text(); } catch {} }
    return { status: res.status, json, text };
  }, { p: path, o: opts });
}

test.setTimeout(120000);
test('full car booking UI lifecycle (user -> admin)', async ({ page }) => {
  const ts = Date.now();
  const employeeName = `PW Test ${ts}`;
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // tomorrow
  const timeSlot = '09:00-10:00';

  // User login
  await page.goto(`${BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
  await page.fill('#login-password', USER_PASSWORD);
  await page.click('text=Login');
  await page.waitForURL('**/user/dashboard', { timeout: 15000 });

  // Wait for Supabase session to be persisted in localStorage (with diagnostics on failure)
  try {
    await page.waitForFunction(() => {
      try {
        return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      } catch { return false; }
    }, { timeout: 10000 });
  } catch (err) {
    // gather diagnostics
    const cookies = await page.context().cookies();
    const ls = await page.evaluate(() => {
      try { return Object.entries(localStorage).filter(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token')); } catch { return null }
    });
    const url = page.url();
    const html = await page.content();
    const diag = { error: String(err), url, cookies, localStorageKeys: ls, htmlSnippet: html.slice(0, 10000) };
    try { await fs.promises.writeFile('test-results/playwright-diagnostics.json', JSON.stringify(diag, null, 2)); } catch (e) { console.warn('failed to write diagnostics file', e); }
    throw new Error('Supabase session not present after login; diagnostics written to test-results/playwright-diagnostics.json');
  }

  // Create booking via API (more reliable than UI interactions)
  await page.goto(`${BASE}/user/car-booking`);
  const createRes = await authFetch(page, `/api/car-bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeName, dateOfUse: date, timeSlot, destination: 'E2E', purpose: 'E2E' }) });
  console.log('playwright: create booking response', JSON.stringify(createRes));
  try {
    const prev = await (async () => {
      try { return JSON.parse(await fs.promises.readFile('test-results/playwright-diagnostics.json', 'utf8')); } catch { return {} }
    })();
    const merged = { ...prev, createRes };
    await fs.promises.writeFile('test-results/playwright-diagnostics.json', JSON.stringify(merged, null, 2));
  } catch (e) {
    console.warn('failed to append createRes to diagnostics file', e);
  }
  if (createRes?.status !== 200 && createRes?.status !== 201) {
    throw new Error('Booking creation failed: ' + JSON.stringify(createRes));
  }
  const created = createRes.json || createRes;
  expect(created?.data?.id || created?.id, 'created booking id present').toBeTruthy();

  // Logout user
  await page.click('text=Logout');
  await page.waitForURL('**/login', { timeout: 10000 });

  // Admin login
  await page.fill('input[placeholder="you@example.com"]', ADMIN_EMAIL);
  await page.fill('#login-password', ADMIN_PASSWORD);
  await page.click('text=Login');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

  // Go to manage bookings
  await page.goto(`${BASE}/admin/manage-car-bookings`);

  // Find the pending booking created earlier (poll until visible via API)
  let booking: any = null;
  for (let i = 0; i < 30; i++) {
    const res = await authFetch(page, `/api/car-bookings?status=Pending&page=1&pageSize=100`);
    if (res && Array.isArray(res.data)) {
      booking = res.data.find((b: any) => b.employee_name === employeeName && b.date_of_use === date && b.time_slot === timeSlot);
      if (booking) break;
    }
    await page.waitForTimeout(1000);
  }
  expect(booking, 'pending booking must exist').toBeTruthy();

  // Get available cars
  const carsRes = await authFetch(page, `/api/cars`);
  const carId = carsRes?.data?.[0]?.id;
  expect(carId, 'expect at least one car in fleet').toBeTruthy();

  // Assign car
  const assignRes = await authFetch(page, `/api/car-bookings/assign-car`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id, carId }) });
  expect(assignRes?.success, 'assign car succeeded').toBeTruthy();

  // Approve booking
  const approveRes = await authFetch(page, `/api/car-bookings/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) });
  expect(approveRes?.success, 'approve succeeded').toBeTruthy();

  // Verify approved via API
  const approvedList = await authFetch(page, `/api/car-bookings?status=Approved&page=1&pageSize=100`);
  const approved = (approvedList?.data || []).find((b: any) => b.id === booking.id);
  expect(approved, 'booking is approved').toBeTruthy();

  // Complete booking (manual complete route)
  const completeRes = await authFetch(page, `/api/car-bookings/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) });
  expect(completeRes?.success, 'complete succeeded').toBeTruthy();

  // Verify completed
  const completedList = await authFetch(page, `/api/car-bookings?status=Completed&page=1&pageSize=100`);
  const completed = (completedList?.data || []).find((b: any) => b.id === booking.id);
  expect(completed, 'booking is completed').toBeTruthy();
});
