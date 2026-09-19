// Item catalogue copied from dune-docker (runtime/data/admin-items.json).
import { readFileSync } from "node:fs";

export const GIVEABLE_CATEGORIES = new Set(["resources", "consumables"]);
const DEFAULT_PATH = new URL("./data/admin-items.json", import.meta.url);

export function loadCatalog(path = DEFAULT_PATH) {
  const entries = JSON.parse(readFileSync(path, "utf8"));
  const byId = new Map(entries.map((e) => [e.id.toLowerCase(), e]));

  const lookup = (id) => byId.get(String(id).toLowerCase()) ?? null;

  function search(text, limit = 25) {
    const q = String(text).trim().toLowerCase();
    if (!q) return [];
    return entries.filter((e) => e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)).slice(0, limit);
  }

  function resolveItem(query) {
    const q = String(query).trim();
    const direct = lookup(q);
    if (direct) return direct;
    const byName = entries.filter((e) => e.name.toLowerCase() === q.toLowerCase());
    if (byName.length === 1) return byName[0];
    const matches = byName.length > 1 ? byName : search(q, 11);
    if (matches.length === 1) return matches[0];
    if (matches.length === 0) throw new Error(`No catalogue item matches "${q}"`);
    const list = matches.slice(0, 10).map((e) => `  ${e.id}  (${e.name}, ${e.category})`).join("\n");
    throw new Error(`"${q}" matches several items; use one of these ids:\n${list}`);
  }

  const displayName = (id) => lookup(id)?.name ?? id;
  const isGiveable = (entry) => GIVEABLE_CATEGORIES.has(entry?.category);

  function stackSizeOf(id) {
    const size = lookup(id)?.stackSize;
    return Number.isInteger(size) && size > 0 ? size : null;
  }

  function volumeOf(id) {
    const volume = lookup(id)?.volume;
    return typeof volume === "number" && volume > 0 ? volume : 0;
  }

  return { entries, lookup, search, resolveItem, displayName, isGiveable, stackSizeOf, volumeOf };
}
