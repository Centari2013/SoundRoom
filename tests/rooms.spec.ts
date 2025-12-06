import { expect, test, type Route } from '@playwright/test'
import { loginAs, users } from './helpers/login'

type MockRoom = { id: string; name: string; updated_at: string; room_config: any }

function createRoomRouter(mockRooms: MockRoom[]) {
  return async function handler(route: Route) {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    const idParam = url.searchParams.get('id')
    const roomId = idParam?.replace('eq.', '') || null

    if (method === 'GET') {
      if (url.searchParams.get('select')?.includes('room_config') || roomId) {
        const target = mockRooms.find((room) => room.id === roomId) || mockRooms[0]
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(target ?? null) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRooms) })
    }

    if (method === 'POST') {
      const payload = req.postDataJSON() as any
      const created: MockRoom = {
        id: `room-${mockRooms.length + 1}`,
        name: payload?.name || 'Untitled Room',
        updated_at: new Date().toISOString(),
        room_config: payload?.room_config ?? { room: { id: `room-${mockRooms.length + 1}`, name: 'Untitled Room' } },
      }
      mockRooms.unshift(created)
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([created]) })
    }

    if (method === 'PATCH') {
      const payload = req.postDataJSON() as any
      const target = mockRooms.find((room) => room.id === roomId)
      if (target) {
        Object.assign(target, payload)
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(target ? [target] : []) })
    }

    if (method === 'DELETE') {
      const index = mockRooms.findIndex((room) => room.id === roomId)
      if (index >= 0) mockRooms.splice(index, 1)
      return route.fulfill({ status: 204, body: '' })
    }

    return route.continue()
  }
}

test.describe('Rooms', () => {
  test('create, save, load, and delete a room', async ({ page }) => {
    const mockRooms: MockRoom[] = []
    await page.route('**/rest/v1/rooms**', createRoomRouter(mockRooms))

    await loginAs(page, users.basic)

    // Open the Room Manager (starts empty)
    await page.locator('[data-test="room-manager-link"]').click()
    await expect(page).toHaveURL(/room-manager/)
    await expect(page.getByText(/no rooms yet/i)).toBeVisible()

    // Create a new room and return to canvas
    await page.locator('[data-test="room-manager-create-button"]').click()
    await expect(page).toHaveURL(/\/app$/)

    // Save the room via footer control
    await page.locator('[data-test="save-room-button"]').click()
    await page.getByRole('button', { name: /^yes$/i }).click()

    // Load the saved room from the manager
    await page.locator('[data-test="room-manager-link"]').click()
    await expect(page.getByRole('heading', { name: /roommanager/i })).toBeVisible()
    const savedCard = page.locator('[data-test="room-card-load"]').first()
    await savedCard.click()
    await expect(page).toHaveURL(/\/app$/)

    // Delete the room to keep the list tidy
    await page.locator('[data-test="room-manager-link"]').click()
    await page.locator('[data-test="room-card-delete"]').first().click()
    await page.getByRole('button', { name: /^yes$/i }).click()
    await expect(page.getByText(/no rooms yet/i)).toBeVisible()
  })
})
