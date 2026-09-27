import { test as base } from '@playwright/test';
import { Order, Pet, User, expectStatus } from '../helpers/api.helper';

type TestData = {
  // Arrange helpers: fail immediately if setup does not return 200, and register cleanup
  createPet(pet: Pet): Promise<void>;
  createUser(user: User): Promise<void>;
  createOrder(order: Order): Promise<void>;
  // Register cleanup for a resource the test created itself (e.g. POST as the Act step)
  track(path: string): void;
};

export const test = base.extend<{ testData: TestData }>({
  testData: async ({ request }, use) => {
    const created: string[] = [];

    await use({
      async createPet(pet) {
        await expectStatus(await request.post('/v2/pet', { data: pet }), 200);
        created.push(`/v2/pet/${pet.id}`);
      },
      async createUser(user) {
        await expectStatus(await request.post('/v2/user', { data: user }), 200);
        created.push(`/v2/user/${encodeURIComponent(user.username)}`);
      },
      async createOrder(order) {
        await expectStatus(await request.post('/v2/store/order', { data: order }), 200);
        created.push(`/v2/store/order/${order.id}`);
      },
      track(path) {
        created.push(path);
      },
    });

    // Best-effort teardown in reverse order. Resources the test already deleted return 404 — that's fine.
    for (const path of created.reverse()) {
      await request.delete(path);
    }
  },
});

export { expect } from '@playwright/test';
