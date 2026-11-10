import { defineConfig } from '@playwright/test';

// Point the tests at a running instance (e.g. the develop deployment) instead of building locally.
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
	webServer: process.env.PLAYWRIGHT_TEST_BASE_URL
		? undefined
		: {
				command: 'npm run build && npm run preview',
				port: 4173
			},
	use: { baseURL, ignoreHTTPSErrors: true },
	testDir: 'e2e'
});
