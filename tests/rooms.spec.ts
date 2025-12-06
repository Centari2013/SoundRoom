import { expect, Page, test } from '@playwright/test';
import { login } from './helpers/login';

type RoomRecord = { id: string; name: string; payload: unknown };

function setupRoomApiMock(page: Page, rooms: RoomRecord[]) {
  return page.route('**/rest/v1/rooms**', async (route) => {
    const { method } = route.request();
    const url = new URL(route.request().url());

    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rooms),
      });
    }

    if (method === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const newRoom: RoomRecord = {
        id: `room-${rooms.length + 1}`,
        name: (body.name as string) ?? 'Untitled Room',
        payload: body,
      };
      rooms.push(newRoom);
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newRoom) });
    }

    if (method === 'PATCH' || method === 'PUT') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const id = (body.id as string) ?? url.searchParams.get('id')?.replace('eq.', '') ?? '';
      const idx = rooms.findIndex((room) => room.id === id);
      if (idx !== -1) {
        rooms[idx] = { ...rooms[idx], ...body } as RoomRecord;
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rooms[idx] ?? body) });
    }

    if (method === 'DELETE') {
      const idParam = url.searchParams.get('id');
      const id = idParam?.replace('eq.', '');
      const remaining = rooms.filter((room) => room.id !== id);
      rooms.splice(0, rooms.length, ...remaining);
      return route.fulfill({ status: 204, body: '' });
    }

    return route.continue();
  });
}

test.describe('Rooms', () => {
  let rooms: RoomRecord[];

  test.beforeEach(async ({ page }) => {
    rooms = [
      { id: 'seed-room', name: 'QA Seed Room', payload: { name: 'QA Seed Room', layout: [] } },
    ];
    await setupRoomApiMock(page, rooms);
    await login(page, 'basic');
  });

  test('creates a new room', async ({ page }) => {
    await page.getByTestId('new-room-button').click();
    await page.getByTestId('room-name-input').fill('Automation Smoke Room');
    await page.getByTestId('room-create-submit').click();

    await expect(page.getByTestId('room-title')).toContainText('Automation Smoke Room');
  });

  test('saves the current room state', async ({ page }) => {
    await page.getByTestId('room-title').click();
    await page.getByTestId('room-name-input').fill('Saved Room Fixture');

    const save = page.getByTestId('save-room-button');
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/rest/v1/rooms') && response.request().method() === 'POST'),
      save.click(),
    ]);

    await expect(page.getByTestId('toast-success')).toContainText(/saved/i);
  });

  test('loads a previously saved room', async ({ page }) => {
    await page.getByTestId('open-room-button').click();
    const list = page.getByTestId('room-list');
    await expect(list).toBeVisible();

    await list.getByTestId('room-row').filter({ hasText: 'QA Seed Room' }).first().click();
    await expect(page.getByTestId('room-title')).toContainText('QA Seed Room');
  });

  test('deletes a saved room from the library', async ({ page }) => {
    await page.getByTestId('open-room-button').click();
    const seedRow = page.getByTestId('room-row').filter({ hasText: 'QA Seed Room' });
    await seedRow.getByTestId('room-delete').click();
    await page.getByTestId('confirm-delete').click();

    await expect(seedRow).toHaveCount(0);
    await expect(page.getByTestId('toast-success')).toContainText(/deleted/i);
  });
});
