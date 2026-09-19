#!/usr/bin/env node
// Single-player save editor. See README "Single-player save editor".
// node:sqlite prints an ExperimentalWarning on Node 24; hide just that one.
const emitWarning = process.emitWarning;
process.emitWarning = (warning, ...rest) => {
  if (String(warning).includes("SQLite is an experimental feature")) return;
  return emitWarning.call(process, warning, ...rest);
};

const { main } = await import("./single-player/cli.mjs");
process.exitCode = await main(process.argv.slice(2));
