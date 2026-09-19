import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileAtomic } from "../../single-player/atomic.mjs";

test("writeFileAtomic writes the bytes and leaves no tmp file behind", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "single-player-atomic-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "game.db");
  writeFileAtomic(path, Buffer.from("hello"));
  assert.equal(readFileSync(path, "utf8"), "hello");
  assert.equal(existsSync(`${path}.tmp`), false);
});

test("writeFileAtomic cleans up the tmp file and appends context when the rename fails", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "single-player-atomic-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "game.db");
  mkdirSync(path); // renameSync(tmp, path) fails because path is a directory
  assert.throws(() => writeFileAtomic(path, Buffer.from("hello")), /the save was not changed/);
  assert.equal(existsSync(`${path}.tmp`), false);
});
