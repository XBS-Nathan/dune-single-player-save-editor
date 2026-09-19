import { test } from "node:test";
import assert from "node:assert/strict";
import { openFixtureDb } from "./helpers.mjs";
import {
  DEFAULT_STATS, allocateItemIds, backpack, giveItem, listItems, planStackRows, player, positionClaimer, removeItem
} from "../../single-player/items.mjs";

function withDb(options, fn) {
  const { db, close } = openFixtureDb(options);
  try { return fn(db); } finally { close(); }
}

test("planStackRows splits into full stacks plus a remainder", () => {
  assert.deepEqual(planStackRows(1200, 500, Infinity), { stacks: [500, 500, 200], total: 1200, clamped: false, clampReason: null });
  assert.deepEqual(planStackRows(300, 500, Infinity).stacks, [300]);
});

test("planStackRows stops at the free slots", () => {
  assert.deepEqual(planStackRows(1200, 500, 2), { stacks: [500, 500], total: 1000, clamped: true, clampReason: "slots" });
  assert.deepEqual(planStackRows(10, 500, 0), { stacks: [], total: 0, clamped: true, clampReason: "slots" });
});

test("player and backpack come from player_state and the pawn's type-0 inventory", () => {
  withDb({ slots: 7, volume: 525 }, (db) => {
    assert.deepEqual(player(db), { id: 1, name: "Test Char", controllerId: 1, pawnId: 2 });
    assert.deepEqual(backpack(db), { id: 1, maxItemCount: 7, maxItemVolume: 525 });
  });
});

test("positionClaimer hands out the lowest free slots, then refuses", () => {
  withDb({ items: [{ id: 10, position: 0, templateId: "Stone" }, { id: 11, position: 2, templateId: "Stone" }] }, (db) => {
    const claim = positionClaimer(db, 1, 5);
    assert.deepEqual([claim(), claim(), claim()], [1, 3, 4]);
    assert.throws(() => claim(), /No free backpack slot/);
  });
});

test("positionClaimer appends after the highest slot when the inventory is uncapped", () => {
  withDb({ items: [{ id: 10, position: 4, templateId: "Stone" }] }, (db) => {
    const claim = positionClaimer(db, 1, -1);
    assert.deepEqual([claim(), claim()], [5, 6]);
  });
});

test("allocateItemIds uses next_id and keeps it above the highest item id", () => {
  withDb({ nextId: 1000, items: [{ id: 5000, position: 0, templateId: "Stone" }] }, (db) => {
    assert.deepEqual(allocateItemIds(db, 2), [5001, 5002]);
    assert.equal(db.prepare("select next_id from items_id_sequencer").get().next_id, 5003);
  });
  withDb({ nextId: 9000 }, (db) => {
    assert.deepEqual(allocateItemIds(db, 1), [9000]);
    assert.equal(db.prepare("select next_id from items_id_sequencer").get().next_id, 9001);
  });
});

test("giveItem inserts stacks into free backpack slots", () => {
  withDb({ slots: 5, items: [{ id: 10, position: 0, templateId: "Stone", stackSize: 5 }] }, (db) => {
    const result = giveItem(db, "AzuriteOre", 1200, { maxStack: 500, now: () => 1789000000 });
    assert.equal(result.total, 1200);
    assert.equal(result.clamped, false);
    assert.deepEqual(result.inserted, [
      { id: 1000, position: 1, stackSize: 500 },
      { id: 1001, position: 2, stackSize: 500 },
      { id: 1002, position: 3, stackSize: 200 }
    ]);
    const row = db.prepare("select * from items where id = 1000").get();
    assert.equal(row.inventory_id, 1);
    assert.equal(row.template_id, "AzuriteOre");
    assert.equal(row.is_new, 1);
    assert.equal(row.acquisition_time, 1789000000);
    assert.equal(row.quality_level, 0);
    assert.equal(row.stats, DEFAULT_STATS);
  });
});

test("giveItem gives what fits when slots run out", () => {
  withDb({ slots: 2, items: [{ id: 10, position: 0, templateId: "Stone" }] }, (db) => {
    const result = giveItem(db, "AzuriteOre", 1200, { maxStack: 500 });
    assert.equal(result.total, 500);
    assert.equal(result.clamped, true);
    assert.equal(result.clampReason, "slots");
  });
});

test("giveItem refuses when nothing fits", () => {
  withDb({ slots: 1, items: [{ id: 10, position: 0, templateId: "Stone" }] }, (db) => {
    assert.throws(() => giveItem(db, "AzuriteOre", 10, { maxStack: 500 }), /No room/);
    assert.equal(db.prepare("select count(*) as c from items").get().c, 1);
  });
});

test("giveItem caps by remaining backpack volume when volumes are known", () => {
  const volumeOf = (t) => ({ Stone: 0.1, AzuriteOre: 0.2 })[t] ?? 0;
  withDb({ slots: 10, volume: 100, items: [{ id: 10, position: 0, templateId: "Stone", stackSize: 500 }] }, (db) => {
    const result = giveItem(db, "AzuriteOre", 1000, { maxStack: 500, volumeOf });
    assert.equal(result.total, 250);
    assert.equal(result.clampReason, "volume");
    assert.deepEqual(result.warnings, []);
  });
});

test("giveItem warns when a volume is unknown", () => {
  withDb({ slots: 10, volume: 100 }, (db) => {
    const result = giveItem(db, "SolarisCoin", 10, { maxStack: 1000, volumeOf: () => 0 });
    assert.equal(result.total, 10);
    assert.match(result.warnings[0], /volume was not checked/);
  });
});

test("giveItem rejects bad quantities and stack sizes", () => {
  withDb({}, (db) => {
    assert.throws(() => giveItem(db, "Stone", 0), /Quantity/);
    assert.throws(() => giveItem(db, "Stone", 1.5), /Quantity/);
    assert.throws(() => giveItem(db, "Stone", 5, { maxStack: 0 }), /Stack size/);
  });
});

test("listItems shows the backpack, or every inventory of the character with all", () => {
  const items = [
    { id: 10, position: 1, templateId: "Stone", stackSize: 3 },
    { id: 11, position: 0, templateId: "Water", stackSize: 2 },
    { id: 12, position: 0, templateId: "Helmet", inventoryId: 2 },
    { id: 13, position: 0, templateId: "ChestLoot", inventoryId: 3 }
  ];
  withDb({ items }, (db) => {
    assert.deepEqual(listItems(db).map((i) => i.id), [11, 10]);
    assert.deepEqual(listItems(db, { all: true }).map((i) => i.id), [11, 10, 12]);
    assert.deepEqual(listItems(db)[0], { id: 11, inventoryId: 1, inventoryType: 0, position: 0, templateId: "Water", stackSize: 2 });
  });
});

test("removeItem takes part of a stack or the whole row", () => {
  withDb({ items: [{ id: 10, position: 0, templateId: "Stone", stackSize: 100 }] }, (db) => {
    assert.deepEqual(removeItem(db, 10, 30), { templateId: "Stone", removed: 30, remaining: 70 });
    assert.deepEqual(removeItem(db, 10), { templateId: "Stone", removed: 70, remaining: 0 });
    assert.equal(db.prepare("select count(*) as c from items").get().c, 0);
  });
});

test("removeItem refuses other actors' items, containers and bad quantities", () => {
  withDb({ items: [{ id: 10, position: 0, templateId: "Stone", stackSize: 5 }, { id: 13, position: 0, templateId: "ChestLoot", inventoryId: 3 }] }, (db) => {
    assert.throws(() => removeItem(db, 13), /not in this character's inventories/);
    assert.throws(() => removeItem(db, 10, 0), /Quantity/);
    db.prepare("insert into inventories (id, item_id, inventory_type) values (9, 10, 5)").run();
    assert.throws(() => removeItem(db, 10), /holds its own inventory/);
  });
});
