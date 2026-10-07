#!/usr/bin/env node

const { existsSync, readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");

function parseArgs(argv) {
  return {
    check: argv.includes("--check")
  };
}

function loadConfig(cwd) {
  const configPath = resolve(cwd, "env-sync.config.json");

  if (!existsSync(configPath)) {
    throw new Error("Missing env-sync.config.json");
  }

  return JSON.parse(readFileSync(configPath, "utf8"));
}

function renderEnvExample(config) {
  const lines = [];
  let currentSection = null;

  for (const [name, metadata] of Object.entries(config.variables)) {
    if (!metadata.example) {
      continue;
    }

    if (metadata.section && metadata.section !== currentSection) {
      if (lines.length > 0) {
        lines.push("");
      }

      lines.push(`# ${metadata.section}`);
      currentSection = metadata.section;
    }

    if (metadata.comment) {
      lines.push(`# ${metadata.comment}`);
    }

    lines.push(`${name}="${metadata.example}"`);
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const cwd = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig(cwd);
  const outputPath = resolve(cwd, ".env.example");
  const nextContent = renderEnvExample(config);

  if (args.check) {
    if (!existsSync(outputPath)) {
      throw new Error(".env.example is missing. Run `npm run env:example`.");
    }

    const currentContent = readFileSync(outputPath, "utf8");
    if (currentContent !== nextContent) {
      throw new Error(
        ".env.example is out of date. Run `npm run env:example`."
      );
    }

    console.log(".env.example is up to date.");
    return;
  }

  writeFileSync(outputPath, nextContent, "utf8");
  console.log("Generated .env.example");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
