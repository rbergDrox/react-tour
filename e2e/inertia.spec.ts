import { expect, test } from '@playwright/test';

/**
 * The Inertia-specific risk: persisting progress must not look like a
 * navigation, or the tour stops itself the moment it records a step.
 */
test('a tour survives an Inertia visit and persists in the background', async ({
    page,
    request,
}) => {
    const errors: string[] = [];
    const persisted: Array<Record<string, unknown>> = [];

    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (outgoing) => {
        if (outgoing.url().endsWith('/tour-progress')) {
            persisted.push(outgoing.postDataJSON());
            // A plain fetch, not an Inertia visit.
            expect(outgoing.headers()['x-inertia']).toBeUndefined();
        }
    });

    await request.post('/reset');
    await page.goto('/');

    const title = page.locator('.driver-popover-title');
    const next = page.locator('.driver-popover-next-btn');

    await expect(page.locator('.driver-hint')).toHaveCount(1);

    await page.getByRole('button', { name: 'Take the tour' }).click();
    await expect(title).toHaveText('A tour across Inertia pages');

    await next.click();
    await expect(title).toHaveText('Anchors by id');

    await next.click();
    await expect(page).toHaveURL(/\/inbox$/);
    await expect(title).toHaveText('After an Inertia visit');
    await expect(page.locator('[data-tour="inbox.list"]')).toHaveClass(
        /driver-active-element/,
    );
    await expect(page.locator('.driver-overlay')).toHaveCount(1);

    await next.click();
    await expect(page.locator('.driver-popover')).toHaveCount(0);

    await expect
        .poll(() => persisted.at(-1))
        .toEqual({ tour_key: 'welcome', status: 'completed', step_index: 2 });
    expect(persisted.map((item) => item.step_index)).toEqual([0, 1, 2, 2, 2]);
    expect(errors).toEqual([]);
});
