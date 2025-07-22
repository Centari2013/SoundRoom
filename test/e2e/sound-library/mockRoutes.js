export const mockSound = {
  id: '1',
  name: 'Bird Chirp',
  bucket: 'nature',
  path: 'bird.mp3'
};

export async function mockSoundRoutes(page) {
  await page.route('**/sound_files*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([mockSound])
    });
  });

  await page.route('**/api/get-signed-url**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ signedUrl: 'mock.mp3' })
    });
  });

  await page.route('**/mock.mp3', route => {
    route.fulfill({ status: 200, contentType: 'audio/mpeg', body: '' });
  });
}
