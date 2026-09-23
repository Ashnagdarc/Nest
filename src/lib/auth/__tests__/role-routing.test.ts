import { describe, expect, it } from '@jest/globals';
import {
  getDashboardPathForProfile,
  getSettingsPathForProfile,
  isActiveAdminProfile,
} from '@/lib/auth/role-routing';

describe('role-routing Active admin checks', () => {
  it('treats only Active Admins as active admins', () => {
    expect(isActiveAdminProfile({ role: 'Admin', status: 'Active' })).toBe(true);
    expect(isActiveAdminProfile({ role: 'Admin', status: 'Suspended' })).toBe(false);
    expect(isActiveAdminProfile({ role: 'Admin', status: 'Inactive' })).toBe(false);
    expect(isActiveAdminProfile({ role: 'User', status: 'Active' })).toBe(false);
  });

  it('routes suspended Admins to the user dashboard', () => {
    expect(getDashboardPathForProfile({ role: 'Admin', status: 'Active' })).toBe('/admin/dashboard');
    expect(getDashboardPathForProfile({ role: 'Admin', status: 'Suspended' })).toBe('/user/dashboard');
    expect(getDashboardPathForProfile({ role: 'User', status: 'Active' })).toBe('/user/dashboard');
  });

  it('routes settings by Active admin status', () => {
    expect(getSettingsPathForProfile({ role: 'Admin', status: 'Active' })).toBe('/admin/settings');
    expect(getSettingsPathForProfile({ role: 'Admin', status: 'Suspended' })).toBe('/user/settings');
  });
});
