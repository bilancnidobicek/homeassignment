import { test, expect } from '../../fixtures/api.fixture';
import { Pet, buildPet, expectStatus, randomInt } from '../../helpers/api.helper';
import { feature, severity } from '../../helpers/allure.helper';

// Expected shape of a Pet response from the API
const petSchema = {
  id: expect.any(Number),
  name: expect.any(String),
  status: expect.stringMatching(/^(available|pending|sold)$/),
  photoUrls: expect.any(Array),
};

test.describe('Pets API', () => {
  test.beforeEach(async () => {
    await feature('Pets');
  });

  test('POST /pet creates a new pet @smoke @api', async ({ request, testData }) => {
    await severity('critical');
    const pet = buildPet();
    let body: Pet;

    await test.step('Act: POST /v2/pet with a new pet', async () => {
      const response = await request.post('/v2/pet', { data: pet });
      testData.track(`/v2/pet/${pet.id}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected — response matches Pet schema and echoes input', async () => {
      expect(body).toMatchObject(petSchema);
      expect(body.id).toBe(pet.id);
      expect(body.name).toBe(pet.name);
      expect(body.status).toBe('available');
    });
  });

  test('GET /pet/{id} retrieves a pet @smoke @api', async ({ request, testData }) => {
    await severity('critical');
    const pet = buildPet();
    let body: Pet;

    await test.step('Arrange: create a pet', async () => {
      await testData.createPet(pet);
    });
    await test.step('Act: GET /v2/pet/{id}', async () => {
      const response = await request.get(`/v2/pet/${pet.id}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected — response matches Pet schema and id/name match', async () => {
      expect(body).toMatchObject(petSchema);
      expect(body.id).toBe(pet.id);
      expect(body.name).toBe(pet.name);
    });
  });

  test('GET /pet/{id} returns 404 for nonexistent pet @regression @api', async ({ request }) => {
    await severity('normal');
    const id = randomInt(900_000_000, 999_999_999);
    let status = 0;

    await test.step(`Act: GET /v2/pet/${id} (nonexistent)`, async () => {
      const response = await request.get(`/v2/pet/${id}`);
      status = response.status();
    });
    await test.step('Assert: expected 404', async () => {
      expect(status, `actual: ${status}`).toBe(404);
    });
  });

  test('PUT /pet updates an existing pet @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const pet = buildPet();
    let body: Pet;

    await test.step('Arrange: create a pet', async () => {
      await testData.createPet(pet);
    });
    await test.step('Act: PUT /v2/pet with new name and status', async () => {
      const updated = { ...pet, name: 'UpdatedPetName', status: 'sold' };
      const response = await request.put('/v2/pet', { data: updated });
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected — response reflects updated fields', async () => {
      expect(body).toMatchObject(petSchema);
      expect(body.name).toBe('UpdatedPetName');
      expect(body.status).toBe('sold');
    });
  });

  test('DELETE /pet/{id} removes a pet @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const pet = buildPet();

    await test.step('Arrange: create a pet', async () => {
      await testData.createPet(pet);
    });
    await test.step('Act: DELETE /v2/pet/{id}', async () => {
      const deleteResponse = await request.delete(`/v2/pet/${pet.id}`);
      await expectStatus(deleteResponse, 200);
    });
    await test.step('Assert: expected — subsequent GET returns 404', async () => {
      const getResponse = await request.get(`/v2/pet/${pet.id}`);
      expect(getResponse.status(), `actual: ${getResponse.status()}`).toBe(404);
    });
  });

  // Data-driven: validate only a pet this test created, never arbitrary records from the shared server
  for (const status of ['available', 'pending', 'sold']) {
    test(`GET /pet/findByStatus returns our ${status} pet @sanity @api`, async ({ request, testData }) => {
      await severity('normal');
      const pet = buildPet({ status });
      let body: Pet[] = [];

      await test.step(`Arrange: create a pet with status "${status}"`, async () => {
        await testData.createPet(pet);
      });
      await test.step(`Act: GET /v2/pet/findByStatus?status=${status}`, async () => {
        const response = await request.get('/v2/pet/findByStatus', { params: { status } });
        await expectStatus(response, 200);
        body = await response.json();
      });
      await test.step('Assert: expected — our pet is in the list, matches schema, and every item has the requested status', async () => {
        const ours = body.find((p) => p.id === pet.id);
        expect(ours, `pet ${pet.id} not found among ${body.length} results`).toBeDefined();
        expect(ours).toMatchObject({ ...petSchema, name: pet.name, status });
        expect(body.filter((p) => p.status !== status), 'items with a different status').toEqual([]);
      });
    });
  }

  test('POST /pet returns 405 for invalid input @regression @api', async ({ request }) => {
    await severity('normal');
    let status = 0;

    await test.step('Act: POST /v2/pet with an invalid body', async () => {
      const response = await request.post('/v2/pet', { data: 'not-valid-json' });
      status = response.status();
    });
    await test.step('Assert: expected 400, 405 or 500', async () => {
      expect([400, 405, 500], `actual: ${status}`).toContain(status);
    });
  });

  test('created pet has correct category @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const pet = buildPet({ category: { id: 5, name: 'Cats' } });
    let body: Pet;

    await test.step('Arrange: create a pet with category "Cats"', async () => {
      await testData.createPet(pet);
    });
    await test.step('Act: GET the pet back', async () => {
      const response = await request.get(`/v2/pet/${pet.id}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected — category.name is "Cats"', async () => {
      expect(body).toMatchObject({
        ...petSchema,
        category: { id: expect.any(Number), name: expect.any(String) },
      });
      expect(body.category?.name).toBe('Cats');
    });
  });

  test('created pet has correct tags @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const pet = buildPet({ tags: [{ id: 99, name: 'mytag' }] });
    let body: Pet;

    await test.step('Arrange: create a pet with a custom tag', async () => {
      await testData.createPet(pet);
    });
    await test.step('Act: GET the pet back', async () => {
      const response = await request.get(`/v2/pet/${pet.id}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected — first tag name is "mytag"', async () => {
      expect(body).toMatchObject({
        ...petSchema,
        tags: expect.arrayContaining([
          expect.objectContaining({ name: expect.any(String) }),
        ]),
      });
      expect(body.tags?.[0].name).toBe('mytag');
    });
  });

  // --- Edge cases below ---

  test('pet name with unicode + emoji is preserved verbatim @regression @api @edge', async ({ request, testData }) => {
    await severity('normal');
    const trickyName = 'Café-日本語-🐶-Ünïcödé';
    const pet = buildPet({ name: trickyName });
    let body: Pet;

    await test.step('Arrange: create a pet with unicode/emoji name', async () => {
      await testData.createPet(pet);
    });
    await test.step('Act: GET the pet back', async () => {
      const response = await request.get(`/v2/pet/${pet.id}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step(`Assert: expected name = "${trickyName}"`, async () => {
      expect(body.name, `actual: ${body.name}`).toBe(trickyName);
    });
  });

  test('pet name of 5000 chars is accepted and preserved @regression @api @edge', async ({ request, testData }) => {
    await severity('normal');
    const longName = 'A'.repeat(5000);
    const pet = buildPet({ name: longName });
    let body: Pet;

    await test.step('Act: POST /v2/pet with a 5000-char name', async () => {
      await testData.createPet(pet);
    });
    await test.step('Act: GET the pet back', async () => {
      const readRes = await request.get(`/v2/pet/${pet.id}`);
      await expectStatus(readRes, 200);
      body = await readRes.json();
    });
    await test.step('Assert: expected length 5000 (no silent truncation)', async () => {
      expect(body.name.length, `actual: length = ${body.name.length}`).toBe(5000);
    });
  });

  test('GET /pet/{non-numeric} returns 4xx, never 5xx @regression @api @edge', async ({ request }) => {
    await severity('normal');
    let status = 0;

    await test.step('Act: GET /v2/pet/not-a-number', async () => {
      const response = await request.get('/v2/pet/not-a-number');
      status = response.status();
    });
    await test.step('Assert: expected 4xx (not 5xx)', async () => {
      expect(status, `actual: ${status}`).toBeGreaterThanOrEqual(400);
      expect(status, `actual: ${status}`).toBeLessThan(500);
    });
  });

  test('sequential PUTs — last write wins @regression @api @edge', async ({ request, testData }) => {
    await severity('critical');
    const pet = buildPet();
    let body: Pet;

    await test.step('Arrange: create a pet', async () => {
      await testData.createPet(pet);
    });
    await test.step('Act: PUT twice with different names', async () => {
      await expectStatus(await request.put('/v2/pet', { data: { ...pet, name: 'FirstUpdate' } }), 200);
      await expectStatus(await request.put('/v2/pet', { data: { ...pet, name: 'SecondUpdate' } }), 200);
    });
    await test.step('Assert: expected name = "SecondUpdate" (last write wins)', async () => {
      const response = await request.get(`/v2/pet/${pet.id}`);
      await expectStatus(response, 200);
      body = await response.json();
      expect(body.name, `actual: ${body.name}`).toBe('SecondUpdate');
    });
  });

  test('findByStatus with invalid enum returns 200 (documented quirk) @regression @api @edge', async ({ request }) => {
    await severity('minor');
    let status = 0;
    let body: unknown;

    await test.step('Act: GET /v2/pet/findByStatus?status=notARealStatus', async () => {
      const response = await request.get('/v2/pet/findByStatus', { params: { status: 'notARealStatus' } });
      status = response.status();
      body = await response.json();
    });
    await test.step('Assert: expected 200 + array (Petstore quirk — lock in behavior)', async () => {
      expect(status, `actual: ${status}`).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });
  });

  // Input-handling check only: proves the API stores markup verbatim. Whether that is an XSS risk
  // depends on how a consuming UI renders it, which this API test cannot observe.
  test('POST /pet with HTML markup as name is stored verbatim @regression @api @edge', async ({ request, testData }) => {
    await severity('normal');
    const payload = "<script>alert('xss')</script>";
    const pet = buildPet({ name: payload });
    let body: Pet;

    await test.step('Arrange: create a pet with HTML markup as name', async () => {
      await testData.createPet(pet);
    });
    await test.step('Act: GET the pet back', async () => {
      const readRes = await request.get(`/v2/pet/${pet.id}`);
      await expectStatus(readRes, 200);
      body = await readRes.json();
    });
    await test.step(`Assert: expected name = literal payload (no server-side stripping)`, async () => {
      expect(body.name, `actual: ${body.name}`).toBe(payload);
    });
  });
});
