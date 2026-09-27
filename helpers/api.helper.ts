import { APIResponse } from '@playwright/test';

export interface Pet {
  id: number;
  name: string;
  status: string;
  category?: { id: number; name: string };
  tags?: { id: number; name: string }[];
  photoUrls: string[];
}

export interface Order {
  id: number;
  petId: number;
  quantity: number;
  shipDate: string;
  status: string;
  complete: boolean;
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone: string;
  userStatus: number;
}

// Petstore's generic { code, type, message } envelope
export interface ApiMessage {
  code: number;
  type: string;
  message: string;
}

export async function expectStatus(response: APIResponse, expected: number): Promise<void> {
  if (response.status() !== expected) {
    const body = await response.text();
    throw new Error(`Expected status ${expected}, got ${response.status()}. Body: ${body}`);
  }
}

export function randomInt(min = 100_000, max = 999_999): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function buildPet(overrides: Partial<Pet> = {}): Pet {
  const id = randomInt();
  return {
    id,
    name: `TestPet-${id}`,
    status: 'available',
    category: { id: 1, name: 'Dogs' },
    tags: [{ id: 1, name: 'tag1' }],
    photoUrls: ['https://example.com/photo.jpg'],
    ...overrides,
  };
}

export function buildOrder(petId: number, overrides: Partial<Order> = {}): Order {
  const id = randomInt();
  return {
    id,
    petId,
    quantity: 1,
    shipDate: new Date().toISOString(),
    status: 'placed',
    complete: false,
    ...overrides,
  };
}

export function buildUser(overrides: Partial<User> = {}): User {
  const id = randomInt();
  return {
    id,
    username: `user${id}`,
    firstName: 'Test',
    lastName: 'User',
    email: `test${id}@example.com`,
    password: 'Password123!',
    phone: '555-1234',
    userStatus: 0,
    ...overrides,
  };
}
