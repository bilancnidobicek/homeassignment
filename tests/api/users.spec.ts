import { test, expect } from '../../fixtures/api.fixture';
import { ApiMessage, User, buildUser, expectStatus } from '../../helpers/api.helper';
import { feature, severity } from '../../helpers/allure.helper';

// Expected shape of a User response
const userSchema = {
  id: expect.any(Number),
  username: expect.any(String),
  firstName: expect.any(String),
  lastName: expect.any(String),
  email: expect.any(String),
  phone: expect.any(String),
  userStatus: expect.any(Number),
};

test.describe('Users API', () => {
  test.beforeEach(async () => {
    await feature('Users');
  });

  test('POST /user creates a user @smoke @api', async ({ request, testData }) => {
    await severity('critical');
    const user = buildUser();
    let body: User;

    await test.step('Act: POST /v2/user', async () => {
      const response = await request.post('/v2/user', { data: user });
      testData.track(`/v2/user/${user.username}`);
      await expectStatus(response, 200);
    });
    await test.step('Assert: expected — user can be read back with the submitted fields', async () => {
      const response = await request.get(`/v2/user/${user.username}`);
      await expectStatus(response, 200);
      body = await response.json();
      expect(body).toMatchObject(userSchema);
      expect(body).toMatchObject({ id: user.id, username: user.username, email: user.email });
    });
  });

  test('GET /user/{username} retrieves a user @smoke @api', async ({ request, testData }) => {
    await severity('critical');
    const user = buildUser();
    let body: User;

    await test.step('Arrange: create a user', async () => {
      await testData.createUser(user);
    });
    await test.step('Act: GET /v2/user/{username}', async () => {
      const response = await request.get(`/v2/user/${user.username}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected — response matches User schema, username + email match', async () => {
      expect(body).toMatchObject(userSchema);
      expect(body.username).toBe(user.username);
      expect(body.email).toBe(user.email);
    });
  });

  test('GET /user/{username} returns 404 for nonexistent user @regression @api', async ({ request }) => {
    await severity('normal');
    let status = 0;

    await test.step('Act: GET a nonexistent username', async () => {
      const response = await request.get('/v2/user/zzz_no_such_user_xyzxyz');
      status = response.status();
    });
    await test.step('Assert: expected 404', async () => {
      expect(status, `actual: ${status}`).toBe(404);
    });
  });

  test('PUT /user/{username} updates user details @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const user = buildUser();
    const updated = { ...user, firstName: 'Updated', email: `updated.${user.email}` };

    await test.step('Arrange: create a user', async () => {
      await testData.createUser(user);
    });
    await test.step('Act: PUT /v2/user/{username} with new firstName + email', async () => {
      const response = await request.put(`/v2/user/${user.username}`, { data: updated });
      await expectStatus(response, 200);
    });
    await test.step('Assert: expected — GET returns the updated fields', async () => {
      const response = await request.get(`/v2/user/${user.username}`);
      await expectStatus(response, 200);
      const body: User = await response.json();
      expect(body).toMatchObject({ firstName: 'Updated', email: updated.email });
    });
  });

  test('DELETE /user/{username} removes user @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const user = buildUser();

    await test.step('Arrange: create a user', async () => {
      await testData.createUser(user);
    });
    await test.step('Act: DELETE the user', async () => {
      const deleteRes = await request.delete(`/v2/user/${user.username}`);
      await expectStatus(deleteRes, 200);
    });
    await test.step('Assert: expected — subsequent GET returns 404', async () => {
      const getRes = await request.get(`/v2/user/${user.username}`);
      expect(getRes.status(), `actual: ${getRes.status()}`).toBe(404);
    });
  });

  test('GET /user/login returns session token @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const user = buildUser();
    let body: ApiMessage;

    await test.step('Arrange: create a user', async () => {
      await testData.createUser(user);
    });
    await test.step('Act: GET /v2/user/login with valid credentials', async () => {
      const response = await request.get('/v2/user/login', {
        params: { username: user.username, password: user.password ?? '' },
      });
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected — message contains "logged in"', async () => {
      expect(typeof body.message).toBe('string');
      expect(body.message).toContain('logged in');
    });
  });

  for (const endpoint of ['createWithArray', 'createWithList']) {
    test(`POST /user/${endpoint} creates multiple users @sanity @api`, async ({ request, testData }) => {
      await severity('normal');
      const users = [buildUser(), buildUser()];

      await test.step(`Act: POST /v2/user/${endpoint} with two users`, async () => {
        const response = await request.post(`/v2/user/${endpoint}`, { data: users });
        users.forEach((u) => testData.track(`/v2/user/${u.username}`));
        await expectStatus(response, 200);
      });
      await test.step('Assert: expected — every user can be read back', async () => {
        for (const user of users) {
          const response = await request.get(`/v2/user/${user.username}`);
          await expectStatus(response, 200);
          const body: User = await response.json();
          expect(body).toMatchObject({ ...userSchema, username: user.username, email: user.email });
        }
      });
    });
  }

  test('created user has correct phone number @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const user = buildUser({ phone: '999-8888' });
    let body: User;

    await test.step('Arrange: create user with phone "999-8888"', async () => {
      await testData.createUser(user);
    });
    await test.step('Act: GET the user back', async () => {
      const response = await request.get(`/v2/user/${user.username}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected phone = "999-8888"', async () => {
      expect(body).toMatchObject(userSchema);
      expect(body.phone, `actual: ${body.phone}`).toBe('999-8888');
    });
  });

  test('user status is preserved @sanity @api', async ({ request, testData }) => {
    await severity('normal');
    const user = buildUser({ userStatus: 1 });
    let body: User;

    await test.step('Arrange: create user with userStatus = 1', async () => {
      await testData.createUser(user);
    });
    await test.step('Act: GET the user back', async () => {
      const response = await request.get(`/v2/user/${user.username}`);
      await expectStatus(response, 200);
      body = await response.json();
    });
    await test.step('Assert: expected userStatus = 1', async () => {
      expect(body).toMatchObject(userSchema);
      expect(body.userStatus, `actual: ${body.userStatus}`).toBe(1);
    });
  });

  // --- Edge cases below ---

  test('login with wrong password is rejected @regression @api @edge @security', async ({ request, testData }) => {
    await severity('critical');
    const user = buildUser();
    let status = 0;

    await test.step('Arrange: create a user', async () => {
      await testData.createUser(user);
    });
    await test.step('Act: GET /v2/user/login with wrong password', async () => {
      const response = await request.get('/v2/user/login', {
        params: { username: user.username, password: 'definitely-wrong-password' },
      });
      status = response.status();
    });
    await test.step('Assert: expected 4xx (authentication failure)', async () => {
      expect(status, `actual: ${status}`).toBeGreaterThanOrEqual(400);
      expect(status, `actual: ${status}`).toBeLessThan(500);
    });
  });

  test('GET /user response never exposes password field @regression @api @edge @security', async ({ request, testData }) => {
    await severity('critical');
    const user = buildUser({ password: 'SuperSecret!2025' });
    let body: User;
    let raw = '';

    await test.step('Arrange: create user with a password', async () => {
      await testData.createUser(user);
    });
    await test.step('Act: GET the user back', async () => {
      const response = await request.get(`/v2/user/${user.username}`);
      await expectStatus(response, 200);
      body = await response.json();
      raw = JSON.stringify(body);
    });
    await test.step('Assert: expected — password field is undefined', async () => {
      expect(body.password, `actual: ${body.password}`).toBeUndefined();
    });
    await test.step('Assert: expected — raw JSON does not contain the password value', async () => {
      expect(raw).not.toContain('SuperSecret!2025');
    });
  });

  test('POST /user with duplicate username — documented behavior @regression @api @edge', async ({ request, testData }) => {
    await severity('minor');
    const user = buildUser();
    let secondStatus = 0;

    await test.step('Arrange: create a user', async () => {
      await testData.createUser(user);
    });
    await test.step('Act: POST the same user again', async () => {
      const second = await request.post('/v2/user', { data: user });
      secondStatus = second.status();
    });
    await test.step('Assert: expected 200 or 409 (Petstore accepts duplicates today)', async () => {
      expect([200, 409], `actual: ${secondStatus}`).toContain(secondStatus);
    });
  });

  test('GET /user/{username with URL-unsafe chars} returns a clean 4xx, not 5xx @regression @api @edge', async ({ request }) => {
    await severity('normal');
    let status = 0;

    await test.step('Act: GET a username with URL-unsafe characters (space, &)', async () => {
      const response = await request.get(`/v2/user/${encodeURIComponent('user with space & symbol')}`);
      status = response.status();
    });
    await test.step('Assert: expected 4xx (not 5xx)', async () => {
      expect(status, `actual: ${status}`).toBeGreaterThanOrEqual(400);
      expect(status, `actual: ${status}`).toBeLessThan(500);
    });
  });

  test('POST /user with CRLF payload does not inject response headers @regression @api @edge @security', async ({ request, testData }) => {
    await severity('critical');
    const user = buildUser({ username: 'evil\r\nSet-Cookie: hacked=1', firstName: 'evil\r\nX-Injected: 1' });
    let status = 0;
    let headers: Record<string, string> = {};

    await test.step('Act: POST /v2/user with CRLF payload in fields', async () => {
      const response = await request.post('/v2/user', { data: user });
      testData.track(`/v2/user/${encodeURIComponent(user.username)}`);
      status = response.status();
      headers = response.headers();
    });
    await test.step('Assert: expected — not 5xx', async () => {
      expect(status, `actual: ${status}`).toBeLessThan(500);
    });
    await test.step('Assert: expected — no attacker-controlled headers smuggled', async () => {
      expect(headers['set-cookie'] ?? '', `actual set-cookie: ${headers['set-cookie']}`).not.toContain('hacked=1');
      expect(headers['x-injected'], `actual x-injected: ${headers['x-injected']}`).toBeUndefined();
    });
  });
});
