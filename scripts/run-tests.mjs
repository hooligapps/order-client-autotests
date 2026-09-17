import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const inputArgs = process.argv.slice(2);
const playwrightArgs = [];

let buildUrl;

for (let index = 0; index < inputArgs.length; index += 1) {
  const argument = inputArgs[index];

  if (argument === "--url" || argument === "--build-url") {
    buildUrl = inputArgs[index + 1];
    index += 1;
    continue;
  }

  if (argument.startsWith("--url=") || argument.startsWith("--build-url=")) {
    buildUrl = argument.slice(argument.indexOf("=") + 1);
    continue;
  }

  playwrightArgs.push(argument);
}

if (!buildUrl) {
  throw new Error("Missing required --url <build-url> argument");
}

const parsedUrl = new URL(buildUrl);
if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
  throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
}

const child = spawn(process.execPath, [playwrightCli, "test", ...playwrightArgs], {
  env: { ...process.env, BUILD_URL: parsedUrl.toString() },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
