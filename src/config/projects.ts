import { env } from "./env";

export const tags = {
  smoke: "@smoke",
  release: "@release",
  prodSafe: "@prod-safe",
  tutor: "@tutor",
  devOnly: "@dev-only",
  prodOnly: "@prod-only",
  regression: "@regression"
} as const;

export function isDevRun(): boolean {
  return env.autotestEnv === "dev";
}

export function isProdRun(): boolean {
  return env.autotestEnv === "prod";
}
