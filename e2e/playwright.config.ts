import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests against the example apps with real driver.js.
 *
 * The examples resolve `@shapperize/react-tour` to the built package and have
 * their own installs, so run `npm run build` and `npm run examples:install`
 * first.
 */
export default defineConfig({
    testDir: '.',
    outputDir: '../test-results',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'desktop',
            testMatch: 'tour.spec.ts',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile',
            testMatch: 'tour.spec.ts',
            use: { ...devices['Pixel 7'] },
        },
        {
            name: 'inertia',
            testMatch: 'inertia.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'http://localhost:4174',
            },
        },
    ],
    webServer: [
        {
            command:
                'npm run build --prefix examples/react-router && npm run preview --prefix examples/react-router',
            cwd: '..',
            url: 'http://localhost:4173',
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
        },
        {
            command: 'npm run dev --prefix examples/inertia-react',
            cwd: '..',
            url: 'http://localhost:4174',
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
        },
    ],
});
