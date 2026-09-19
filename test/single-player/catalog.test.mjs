import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog } from "../../single-player/catalog.mjs";

const catalog = loadCatalog();

test("resolves a template id regardless of case", () => {
  assert.equal(catalog.resolveItem("solariscoin").id, "SolarisCoin");
});

test("resolves an exact display name", () => {
  assert.equal(catalog.resolveItem("Copper Ore").id, "AzuriteOre");
});

test("lists the candidates when a query matches several items", () => {
  assert.throws(() => catalog.resolveItem("ore"), /matches several items/);
});

test("says so when nothing matches", () => {
  assert.throws(() => catalog.resolveItem("zzzz-no-such-item"), /No catalogue item matches/);
});

test("search matches names and ids", () => {
  const ids = catalog.search("copper").map((e) => e.id);
  assert.ok(ids.includes("AzuriteOre"));
});

test("stack size and volume come from the catalogue when known", () => {
  assert.equal(catalog.stackSizeOf("AzuriteOre"), 500);
  assert.equal(catalog.volumeOf("AzuriteOre"), 0.2);
  assert.equal(catalog.stackSizeOf("SolarisCoin"), null);
  assert.equal(catalog.volumeOf("SolarisCoin"), 0);
});

test("only resources and consumables are giveable", () => {
  assert.equal(catalog.isGiveable(catalog.lookup("SolarisCoin")), true);
  assert.equal(catalog.isGiveable(catalog.lookup("T6_Augment_Acuracy1")), false);
  assert.equal(catalog.isGiveable(catalog.lookup("AtreidesReputation")), false);
});

test("displayName falls back to the id for unknown templates", () => {
  assert.equal(catalog.displayName("AzuriteOre"), "Copper Ore");
  assert.equal(catalog.displayName("NotInCatalogue"), "NotInCatalogue");
});
