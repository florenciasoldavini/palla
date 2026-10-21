#!/usr/bin/env node

const { readFileSync, existsSync } = require("fs");
const { resolve } = require("path");
const { spawnSync } = require("child_process");

const VALID_TARGETS = new Set(["all", "vercel", "eas"]);

function parseArgs(argv) {
  const args = {
    dryRun: false,
    only: null,
    target: "all"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--target") {
      args.target = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg.startsWith("--target=")) {
      args.target = arg.split("=")[1] ?? "";
      continue;
    }

    if (arg === "--only") {
      args.only = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg.startsWith("--only=")) {
      args.only = arg.split("=")[1] ?? "";
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!VALID_TARGETS.has(args.target)) {
    throw new Error(
      `Invalid target "${args.target}". Use all, vercel, or eas.`
    );
  }

  return args;
}

function parseEnvFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const result = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function maskValue(name, value) {
  return name.startsWith("EXPO_PUBLIC_") ? value : "[hidden]";
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    input: options.input
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    throw new Error(`${command} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const displayArgs = options.displayArgs ?? args;
    const error = new Error(
      `${command} ${displayArgs.join(" ")} failed with exit code ${result.status}`
    );
    error.commandOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    throw error;
  }
}

function printPlan(prefix, name, environment, value) {
  console.log(`${prefix} ${name} -> ${environment} (${value})`);
}

function syncVercelVariable(name, value, config, dryRun, cwd) {
  for (const environment of config.environments) {
    const args = ["env", "add", name, environment, "--force"];
    if (config.sensitive) {
      args.push("--sensitive");
    }

    if (dryRun) {
      printPlan("vercel", name, environment, maskValue(name, value));
      continue;
    }

    runCommand("vercel", args, { cwd, input: value });
  }
}

function syncEasVariable(name, value, config, dryRun, cwd) {
  for (const environment of config.environments) {
    const createArgs = [
      "env:create",
      environment,
      "--name",
      name,
      "--value",
      value,
      "--visibility",
      config.visibility,
      "--type",
      "string",
      "--scope",
      "project",
      "--non-interactive"
    ];

    if (dryRun) {
      printPlan("eas", name, environment, maskValue(name, value));
      continue;
    }

    const displayCreateArgs = createArgs.map((arg, index) =>
      createArgs[index - 1] === "--value" ? maskValue(name, value) : arg
    );

    try {
      runCommand("eas", createArgs, {
        cwd,
        displayArgs: displayCreateArgs
      });
    } catch (error) {
      if (
        !error.commandOutput?.includes(
          "already has an environment variable named"
        )
      ) {
        throw error;
      }

      const updateArgs = [
        "env:update",
        environment,
        "--variable-name",
        name,
        "--value",
        value,
        "--visibility",
        config.visibility,
        "--type",
        "string",
        "--scope",
        "project",
        "--non-interactive"
      ];
      const displayUpdateArgs = updateArgs.map((arg, index) =>
        updateArgs[index - 1] === "--value" ? maskValue(name, value) : arg
      );

      runCommand("eas", updateArgs, {
        cwd,
        displayArgs: displayUpdateArgs
      });
    }
  }
}

function main() {
  const cwd = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const configPath = resolve(cwd, "env-sync.config.json");

  if (!existsSync(configPath)) {
    throw new Error("Missing env-sync.config.json");
  }

  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const envFilePath = resolve(cwd, config.sourceFile ?? ".env.local");

  if (!existsSync(envFilePath)) {
    throw new Error(`Missing source env file: ${envFilePath}`);
  }

  const envValues = parseEnvFile(envFilePath);
  const requestedNames = args.only
    ? new Set(
        args.only
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      )
    : null;

  const variables = Object.entries(config.variables).filter(
    ([name, destinations]) => {
      if (requestedNames && !requestedNames.has(name)) {
        return false;
      }

      if (args.target === "vercel") {
        return Boolean(destinations.vercel);
      }

      if (args.target === "eas") {
        return Boolean(destinations.eas);
      }

      return Boolean(destinations.vercel || destinations.eas);
    }
  );

  if (variables.length === 0) {
    throw new Error("No variables selected for syncing.");
  }

  for (const [name, destinations] of variables) {
    if (
      (args.target === "all" || args.target === "vercel") &&
      destinations.vercel
    ) {
      const value = envValues[name];
      if (value === undefined) {
        throw new Error(`Missing ${name} in ${config.sourceFile}`);
      }
      syncVercelVariable(name, value, destinations.vercel, args.dryRun, cwd);
    }

    if ((args.target === "all" || args.target === "eas") && destinations.eas) {
      const value = envValues[name];
      if (value === undefined) {
        throw new Error(`Missing ${name} in ${config.sourceFile}`);
      }
      syncEasVariable(name, value, destinations.eas, args.dryRun, cwd);
    }
  }

  if (args.dryRun) {
    console.log("Dry run complete.");
  } else {
    console.log("Environment sync complete.");
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
