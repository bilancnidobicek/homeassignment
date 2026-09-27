import { test, expect } from '../../fixtures/api.fixture';
import { Order, buildPet, buildOrder, expectStatus, randomInt } from '../../helpers/api.helper';
import { feature, severity } from '../../helpers/allure.helper';

// Expected shape of an Order response
const orderSchema = {
  id: expect.any(Number),
  petId: expect.any(Number),
  quantity: expect.any(Number),
  status: expect.stringMatching(/^(placed|approved|delivered)$/),
  complete: expect.any(Boolean),
};

test.describe('Store API', () => {
  test.beforeEach(async () => {
    await feature('Store');
  });

  test('GET /store/inventory returns inventory map @smoke @api', async ({ request }) => {
    await severity('critical');
    let body: Record<string, number>;

    await test.step('Act: GET /v2/store/inventory', async () => {
      const response = await request.get('/v2/store/inventory');
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected — object with numeric values', async () => {
      expect(typeof body).toBe('object');
      expect(body).not.toBeNull();
      Object.values(body).forEach((count) => {
        expect(typeof count).toBe('number');
      });
    });
  });

  test('POST /store/order places an order @smoke @api', async ({ request, testData }) => {
    await severity('critical');
    const pet = buildPet();
    const order = buildOrder(pet.id);
    let body: Order;

    await test.step('Arrange: create a pet', async () => {
      await testData.createPet(pet);
    });
    await test.step('Act: POST /v2/store/order', async () => {
      const response = await request.post('/v2/store/order', { data: order });
      testData.track(`/v2/store/order/${order.id}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected — response matches Order schema and echoes input', async () => {
      expect(body).toMatchObject(orderSchema);
      expect(body.id).toBe(order.id);
      expect(body.petId).toBe(pet.id);
      expect(body.status).toBe('placed');
    });
  });

  test('GET /store/order/{id} retrieves an order @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const pet = buildPet();
    const order = buildOrder(pet.id);
    let body: Order;

    await test.step('Arrange: create pet + place order', async () => {
      await testData.createPet(pet);
      await testData.createOrder(order);
    });
    await test.step('Act: GET /v2/store/order/{id}', async () => {
      const response = await request.get(`/v2/store/order/${order.id}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected — response matches Order schema and id matches', async () => {
      expect(body).toMatchObject(orderSchema);
      expect(body.id).toBe(order.id);
    });
  });

  test('GET /store/order/{id} returns 404 for nonexistent order @regression @api', async ({ request }) => {
    await severity('normal');
    let status = 0;

    await test.step('Act: GET a nonexistent order id', async () => {
      const response = await request.get(`/v2/store/order/${randomInt(900_000, 999_999)}`);
      status = response.status();
    });
    await test.step('Assert: expected 404', async () => {
      expect([404], `actual: ${status}`).toContain(status);
    });
  });

  test('DELETE /store/order/{id} deletes an order @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const pet = buildPet();
    const order = buildOrder(pet.id);

    await test.step('Arrange: create pet + place order', async () => {
      await testData.createPet(pet);
      await testData.createOrder(order);
    });
    await test.step('Act: DELETE /v2/store/order/{id}', async () => {
      const deleteRes = await request.delete(`/v2/store/order/${order.id}`);
      await expectStatus(deleteRes, 200);
    });
    await test.step('Assert: expected — subsequent GET returns 404', async () => {
      const getRes = await request.get(`/v2/store/order/${order.id}`);
      expect(getRes.status(), `actual: ${getRes.status()}`).toBe(404);
    });
  });

  test('inventory counts a pet with a new status @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    // A status no one else uses, so the expected count is exactly known
    const status = `qa-status-${randomInt()}`;
    let body: Record<string, number>;

    await test.step(`Arrange: create a pet with status "${status}"`, async () => {
      await testData.createPet(buildPet({ status }));
    });
    await test.step('Act: GET /v2/store/inventory', async () => {
      const response = await request.get('/v2/store/inventory');
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step(`Assert: expected inventory["${status}"] = 1`, async () => {
      expect(body[status], `actual: ${body[status]}`).toBe(1);
    });
  });

  test('order quantity is preserved @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const pet = buildPet();
    const order = buildOrder(pet.id, { quantity: 5 });
    let body: Order;

    await test.step('Arrange: create pet + place order with quantity 5', async () => {
      await testData.createPet(pet);
      await testData.createOrder(order);
    });
    await test.step('Act: GET the order back', async () => {
      const response = await request.get(`/v2/store/order/${order.id}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected quantity = 5', async () => {
      expect(body).toMatchObject(orderSchema);
      expect(body.quantity, `actual: ${body.quantity}`).toBe(5);
    });
  });

  // --- Edge cases below ---

  test('DELETE order twice — second call returns 404 @regression @api @edge', async ({ request, testData }) => {
    await severity('normal');
    const pet = buildPet();
    const order = buildOrder(pet.id);

    await test.step('Arrange: create pet + place order', async () => {
      await testData.createPet(pet);
      await testData.createOrder(order);
    });
    await test.step('Act: DELETE the order', async () => {
      const first = await request.delete(`/v2/store/order/${order.id}`);
      await expectStatus(first, 200);
    });
    await test.step('Assert: expected — second DELETE returns 404', async () => {
      const second = await request.delete(`/v2/store/order/${order.id}`);
      expect(second.status(), `actual: ${second.status()}`).toBe(404);
    });
  });

  test('order with negative quantity is either rejected or coerced, not stored @regression @api @edge', async ({ request, testData }) => {
    await severity('critical');
    const pet = buildPet();
    const order = buildOrder(pet.id, { quantity: -5 });
    let createStatus = 0;

    await test.step('Arrange: create a pet', async () => {
      await testData.createPet(pet);
    });
    await test.step('Act: POST order with quantity = -5', async () => {
      const createRes = await request.post('/v2/store/order', { data: order });
      testData.track(`/v2/store/order/${order.id}`);
      createStatus = createRes.status();
    });
    await test.step('Assert: expected — either 4xx OR stored value is not negative', async () => {
      if (createStatus === 200) {
        const readRes = await request.get(`/v2/store/order/${order.id}`);
        await expectStatus(readRes, 200);
        const body: Order = await readRes.json();
        expect(body.quantity, `actual: ${body.quantity} — negative quantity must not be stored verbatim`).toBeGreaterThanOrEqual(0);
      } else {
        expect(createStatus, `actual: ${createStatus}`).toBeGreaterThanOrEqual(400);
        expect(createStatus, `actual: ${createStatus}`).toBeLessThan(500);
      }
    });
  });

  test('order shipDate is preserved to the millisecond @regression @api @edge', async ({ request, testData }) => {
    await severity('normal');
    const pet = buildPet();
    const shipDate = '2025-06-15T12:34:56.789Z';
    const order = buildOrder(pet.id, { shipDate });
    let body: Order;

    await test.step('Arrange: create pet + place order with precise shipDate', async () => {
      await testData.createPet(pet);
      await testData.createOrder(order);
    });
    await test.step('Act: GET the order back', async () => {
      const response = await request.get(`/v2/store/order/${order.id}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step(`Assert: expected shipDate epoch = ${new Date(shipDate).getTime()}`, async () => {
      expect(
        new Date(body.shipDate).getTime(),
        `actual: ${new Date(body.shipDate).getTime()}`
      ).toBe(new Date(shipDate).getTime());
    });
  });
});
