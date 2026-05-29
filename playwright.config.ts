import { defineConfig } from "@playwright/test";
import { env } from "./src/config/env";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: env.retries,
  workers: env.workers,
  timeout: env.defaultTimeoutMs,
  expect: {
    timeout: env.eventTimeoutMs
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["json", { outputFile: "test-results/results.json" }]
  ],
  use: {
    headless: env.headless,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: env.navigationTimeoutMs,
    actionTimeout: env.defaultTimeoutMs,
    viewport: {
      width: 1600,
      height: 900
    }
  },
  outputDir: "test-results/artifacts"
});
