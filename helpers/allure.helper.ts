import * as allure from 'allure-js-commons';

// Thin wrappers over the official Allure runtime API.
// The only value they add is a strict Severity union so typos fail at compile time.

export type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

export async function feature(name: string): Promise<void> {
  await allure.feature(name);
}

export async function severity(level: Severity): Promise<void> {
  await allure.severity(level);
}
