import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { pack, unpack } from "../../single-player/savefile.mjs";
import { buildFixtureSqlite } from "./helpers.mjs";

function header(version, size) {
  const h = Buffer.alloc(8);
  h.writeUInt32LE(version, 0);
  h.writeUInt32LE(size, 4);
  return h;
}

test("pack writes version 1, the raw size and a zlib stream", () => {
  const sqlite = buildFixtureSqlite();
  const packed = pack(sqlite);
  assert.equal(packed.readUInt32LE(0), 1);
  assert.equal(packed.readUInt32LE(4), sqlite.length);
  assert.equal(packed[8], 0x78);
});

test("unpack gives back exactly what pack was given", () => {
  const sqlite = buildFixtureSqlite();
  assert.deepEqual(unpack(pack(sqlite)), sqlite);
});

test("unpack rejects a file shorter than the header", () => {
  assert.throws(() => unpack(Buffer.alloc(4)), /too short/);
});

test("unpack rejects an unknown version", () => {
  const packed = pack(buildFixtureSqlite());
  packed.writeUInt32LE(2, 0);
  assert.throws(() => unpack(packed), /version 2/);
});

test("unpack rejects a size that does not match", () => {
  const packed = pack(buildFixtureSqlite());
  packed.writeUInt32LE(123, 4);
  assert.throws(() => unpack(packed), /size/);
});

test("unpack rejects data that is not SQLite", () => {
  const bogus = Buffer.from("definitely not a sqlite database");
  const file = Buffer.concat([header(1, bogus.length), deflateSync(bogus)]);
  assert.throws(() => unpack(file), /SQLite/);
});
