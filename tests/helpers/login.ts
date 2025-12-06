import { expect, Page } from '@playwright/test';

export type UserTier = 'free' | 'basic' | 'pro';

export const credentials: Record<UserTier, { email: string; password: string; label: string }> = {
  free: {
    email: 'test_free@soundroom.dev',
    password: 'SoundRoomTest123!',
    label: 'Free',
  },
  basic: {
    email: 'test_basic@soundroom.dev',
    password: 'SoundRoomTest123!',
    label: 'Basic',
  },
  pro: {
    email: 'test_pro@soundroom.dev',
    password: 'SoundRoomTest123!',
    label: 'Pro',
  },
};

export const invalidCredentials = {
  email: 'invalid_user@soundroom.dev',
  password: 'DefinitelyWrongPassword!',
};

/**
 * Logs a user in using the visible auth form. Assumes the login form can be
 * reached from the home screen via a data-testid driven navigation element.
 */
export async function login(page: Page, tier: UserTier) {
  const { email, password, label } = credentials[tier];

  await page.goto('/');
  if (await page.getByTestId('nav-login').isVisible()) {
    await page.getByTestId('nav-login').click();
  }

  await page.getByTestId('auth-email').fill(email);
  await page.getByTestId('auth-password').fill(password);

  await Promise.all([
    page.waitForURL(/dashboard|workspace|editor/i),
    page.getByTestId('auth-submit').click(),
  ]);

  await expect(page.getByTestId('user-badge')).toContainText(label);
}

export async function logout(page: Page) {
  await page.getByTestId('user-menu').click();
  await Promise.all([
    page.waitForURL(/login|auth/i),
    page.getByTestId('logout-button').click(),
  ]);
  await expect(page.getByTestId('auth-submit')).toBeVisible();
}
