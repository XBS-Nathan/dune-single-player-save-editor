// game.db = u32le version (1) + u32le uncompressed size + zlib stream of a SQLite database.
import { deflateSync, inflateSync } from "node:zlib";

export const SAVE_VERSION = 1;
const HEADER_BYTES = 8;
const SQLITE_MAGIC = Buffer.from("SQLite format 3\0", "latin1");

export function unpack(fileBytes) {
  if (fileBytes.length < HEADER_BYTES) throw new Error("Save file is too short to be a game.db");
  const version = fileBytes.readUInt32LE(0);
  if (version !== SAVE_VERSION) throw new Error(`Unsupported save version ${version} (expected ${SAVE_VERSION})`);
  const declaredSize = fileBytes.readUInt32LE(4);
  const sqlite = inflateSync(fileBytes.subarray(HEADER_BYTES));
  if (sqlite.length !== declaredSize) {
    throw new Error(`Save header says ${declaredSize} bytes but the data unpacked to ${sqlite.length}; size mismatch`);
  }
  if (!sqlite.subarray(0, SQLITE_MAGIC.length).equals(SQLITE_MAGIC)) throw new Error("Unpacked save is not a SQLite database");
  return sqlite;
}

export function pack(sqliteBytes) {
  const header = Buffer.alloc(HEADER_BYTES);
  header.writeUInt32LE(SAVE_VERSION, 0);
  header.writeUInt32LE(sqliteBytes.length, 4);
  return Buffer.concat([header, deflateSync(sqliteBytes)]);
}
