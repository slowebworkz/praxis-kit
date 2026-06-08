#!/usr/bin/env node

// src/index.ts
import { Project, SyntaxKind } from "ts-morph";
import { parseArgs } from "util";
function printUsage() {
  console.error(
    `
Usage: praxis-codemod [options]

Options:
  --from <name>     Factory function name to rename (default: createPolymorphicComponent)
  --to <name>       New factory function name (default: createContractComponent)
  --files <glob>    Glob pattern for files to transform (default: **/*.{ts,tsx})
  --dry-run         Preview changes without writing to disk
  --help            Show this help message
`.trim()
  );
}
function main() {
  const { values } = parseArgs({
    options: {
      from: { type: "string", default: "createPolymorphicComponent" },
      to: { type: "string", default: "createContractComponent" },
      files: { type: "string", default: "**/*.{ts,tsx}" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false }
    },
    strict: true
  });
  if (values.help) {
    printUsage();
    process.exit(0);
  }
  const fromName = values.from;
  const toName = values.to;
  const isDryRun = values["dry-run"];
  const glob = values.files;
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  project.addSourceFilesFromTsConfig("tsconfig.json");
  project.addSourceFilesAtPaths(glob);
  const sourceFiles = project.getSourceFiles();
  let totalRenames = 0;
  let filesModified = 0;
  for (const sourceFile of sourceFiles) {
    let fileRenames = 0;
    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
    for (const ident of identifiers) {
      if (ident.getText() === fromName) {
        if (!isDryRun) ident.replaceWithText(toName);
        fileRenames++;
      }
    }
    if (fileRenames > 0) {
      totalRenames += fileRenames;
      filesModified++;
      console.log(
        `${isDryRun ? "[dry-run] " : ""}${sourceFile.getFilePath()}: ${fileRenames} rename(s)`
      );
      if (!isDryRun) sourceFile.saveSync();
    }
  }
  const dryRunNote = isDryRun ? " (dry run \u2014 no files written)" : "";
  console.log(`
Done: ${totalRenames} rename(s) across ${filesModified} file(s)${dryRunNote}.`);
}
main();
