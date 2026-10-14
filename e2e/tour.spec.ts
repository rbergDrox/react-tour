import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const title = (page: Page) => page.locator('.driver-popover-title');
const next = (page: Page) => page.locator('.driver-popover-next-btn');
const previous = (page: Page) => page.locator('.driver-popover-prev-btn');
const status = (page: Page) => page.getByTestId('tour-status');

test.beforeEach(async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();

    (page as Page & { errors: string[] }).errors = errors;
});

test.afterEach(async ({ page }) => {
    expect((page as Page & { errors: string[] }).errors).toEqual([]);
});

test('a tour crosses pages in both directions and completes', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Take the tour' }).click();

    await expect(title(page)).toHaveText('A tour across three pages');
    await expect(page.locator('.driver-popover-progress-text')).toHaveText(
        '1 of 5',
    );
    await expect(page.locator('.driver-popover')).toHaveClass(/react-tour/);
    await expect(status(page)).toHaveText('in_progress');

    await next(page).click();
    await expect(title(page)).toHaveText('The sidebar opens itself');
    await expect(page.locator('[data-tour="nav.inbox"]')).toHaveClass(
        /driver-active-element/,
    );

    // Forwards across a page boundary.
    await next(page).click();
    await expect(page).toHaveURL(/\/inbox$/);
    await expect(title(page)).toHaveText('Now on another page');
    await expect(page.locator('[data-tour="inbox.list"]')).toHaveClass(
        /driver-active-element/,
    );
    await expect(page.locator('.driver-popover-progress-text')).toHaveText(
        '3 of 5',
    );

    await next(page).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(title(page)).toHaveText('And another');

    // And backwards.
    await previous(page).click();
    await expect(page).toHaveURL(/\/inbox$/);
    await expect(title(page)).toHaveText('Now on another page');

    await next(page).click();
    await expect(title(page)).toHaveText('And another');
    await next(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(title(page)).toHaveText('Back where you started');

    // Never more than one overlay, however many transitions happened.
    await expect(page.locator('.driver-overlay')).toHaveCount(1);

    await next(page).click();

    await expect(page.locator('.driver-popover')).toHaveCount(0);
    await expect(page.locator('.driver-overlay')).toHaveCount(0);
    await expect(status(page)).toHaveText('completed');
    await expect(page.getByRole('status')).toHaveText('Tour completed.');
});

test('a step preparer reveals a collapsed sidebar', async ({ page }) => {
    await page.getByRole('button', { name: 'Hide menu' }).click();
    await expect(page.locator('[data-tour="nav.inbox"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Take the tour' }).click();
    await next(page).click();

    await expect(title(page)).toHaveText('The sidebar opens itself');
    await expect(page.locator('[data-tour="nav.inbox"]')).toBeVisible();
});

test('closing pauses the tour and resume picks it up, across a reload', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Take the tour' }).click();
    await next(page).click();
    await next(page).click();
    await expect(title(page)).toHaveText('Now on another page');

    await page.locator('.driver-popover-close-btn').click();

    await expect(page.locator('.driver-popover')).toHaveCount(0);
    await expect(status(page)).toHaveText('skipped');
    await expect(page.getByRole('status')).toHaveText('Tour paused at step 3.');

    await page.goto('/');
    await page.getByRole('button', { name: 'Resume' }).click();

    await expect(page).toHaveURL(/\/inbox$/);
    await expect(title(page)).toHaveText('Now on another page');
});

test('hints show a beacon, hide during a tour and can be dismissed', async ({
    page,
}) => {
    const beacon = page.locator('.driver-hint');

    await expect(beacon).toHaveCount(1);

    await page.getByRole('button', { name: 'Take the tour' }).click();
    await expect(title(page)).toBeVisible();
    await expect(beacon).toHaveCount(0);

    await page.locator('.driver-popover-close-btn').click();
    await expect(beacon).toHaveCount(1);

    await beacon.click();
    await expect(title(page)).toHaveText('A hint');
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(beacon).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
    await expect(beacon).toHaveCount(0);
});

test('spotlight highlights one anchor outside of a tour', async ({ page }) => {
    await page.getByRole('button', { name: 'Spotlight' }).click();

    await expect(title(page)).toHaveText('A one-off spotlight');
    await expect(page.locator('[data-tour="home.reset"]')).toHaveClass(
        /driver-active-element/,
    );
    await expect(status(page)).toHaveText('not_started');
});
