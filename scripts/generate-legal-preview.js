const fs = require("node:fs");
const path = require("node:path");

// Markdown is the source of truth. Keep the offline native preview byte-for-byte
// aligned with the reviewed documents; --check detects stale generated content.
const root = path.resolve(process.cwd());
const content = Object.fromEntries(
  ["es", "en"].map((language) => [
    language,
    Object.fromEntries(
      ["terms", "privacy"].map((document) => [
        document,
        fs.readFileSync(
          path.join(root, "docs/legal", `${document}.${language}.md`),
          "utf8"
        )
      ])
    )
  ])
);
const output = `${JSON.stringify(content, null, 2)}\n`;
const target = path.join(root, "src/features/legal/drafts.json");
if (process.argv.includes("--check")) {
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) {
    console.error(
      "Legal preview is stale. Run node scripts/generate-legal-preview.js"
    );
    process.exitCode = 1;
  }
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output);
}
