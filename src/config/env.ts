import * as dotenv from "dotenv";

dotenv.config();

export type AutotestEnvironment = "dev" | "prod";

function readString(name: string): string {
  return (process.env[name] ?? "").trim();
}

function readOptionalString(name: string): string | undefined {
  const value = readString(name);
  return value === "" ? undefined : value;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = readOptionalString(name);
  if (value === undefined) {
    return fallback;
  }

  return value === "1" || value.toLowerCase() === "true";
}

function readNumber(name: string, fallback: number): number {
  const value = readOptionalString(name);
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsed;
}

const requestedEnv = readOptionalString("AUTOTEST_ENV") ?? "dev";

if (requestedEnv !== "dev" && requestedEnv !== "prod") {
  throw new Error("AUTOTEST_ENV must be either 'dev' or 'prod'");
}

export const env = {
  autotestEnv: requestedEnv as AutotestEnvironment,
  devBaseUrl: readOptionalString("DEV_BASE_URL"),
  prodBaseUrl: readOptionalString("PROD_BASE_URL"),
  buildUrl: readOptionalString("BUILD_URL"),
  extraQuery: readOptionalString("AUTOTEST_QUERY"),
  expectTutor: readBoolean("PLAYWRIGHT_EXPECT_TUTOR", false),
  headless: readBoolean("PLAYWRIGHT_HEADLESS", true),
  retries: readNumber("PLAYWRIGHT_RETRIES", process.env.CI ? 1 : 0),
  workers: readNumber("PLAYWRIGHT_WORKERS", 1),
  defaultTimeoutMs: readNumber("PLAYWRIGHT_DEFAULT_TIMEOUT_MS", 30_000),
  navigationTimeoutMs: readNumber("PLAYWRIGHT_NAVIGATION_TIMEOUT_MS", 60_000),
  readyTimeoutMs: readNumber("PLAYWRIGHT_READY_TIMEOUT_MS", 60_000),
  eventTimeoutMs: readNumber("PLAYWRIGHT_EVENT_TIMEOUT_MS", 20_000)
};

export function resolveBaseUrl(targetEnv = env.autotestEnv): string {
  if (env.buildUrl) {
    return env.buildUrl;
  }

  if (targetEnv === "dev") {
    if (!env.devBaseUrl) {
      throw new Error("DEV_BASE_URL is required when AUTOTEST_ENV=dev and BUILD_URL is empty");
    }

    return env.devBaseUrl;
  }

  if (!env.prodBaseUrl) {
    throw new Error("PROD_BASE_URL is required when AUTOTEST_ENV=prod and BUILD_URL is empty");
  }

  return env.prodBaseUrl;
}
