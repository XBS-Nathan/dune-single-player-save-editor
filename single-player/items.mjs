// Item edits for the single-player save. Stack planning and slot claiming are ported from
// dune-docker console/api/src/duneDb.js (planStackRows, createStackPositionClaimer).
export const DEFAULT_STATS = '{"FItemStackAndDurabilityStats":[[],{"DecayedMaxDurability":0.0}]}';
export const DEFAULT_MAX_STACK = 1000;
export const MAX_STACK_ROWS_PER_OPERATION = 1000;

export function player(db) {
  const row = db.prepare("select id, character_name, player_controller_id, player_pawn_id from player_state order by id limit 1").get();
  if (!row) throw new Error("No character found in this save");
  return { id: row.id, name: row.character_name, controllerId: row.player_controller_id, pawnId: row.player_pawn_id };
}

export function backpack(db) {
  const { pawnId } = player(db);
  const inv = db.prepare("select id, max_item_count, max_item_volume from inventories where actor_id = ? and inventory_type = 0 order by id limit 1").get(pawnId);
  if (!inv) throw new Error("The character's backpack inventory was not found");
  return { id: inv.id, maxItemCount: inv.max_item_count ?? 0, maxItemVolume: inv.max_item_volume ?? 0 };
}

export function listItems(db, { all = false } = {}) {
  const { pawnId } = player(db);
  const rows = db.prepare(`
    select it.id, it.inventory_id as inventoryId, inv.inventory_type as inventoryType,
           it.position_index as position, it.template_id as templateId, it.stack_size as stackSize
    from items it join inventories inv on inv.id = it.inventory_id
    where inv.actor_id = ? ${all ? "" : "and inv.inventory_type = 0"}
    order by inv.inventory_type, inv.id, it.position_index`).all(pawnId);
  return rows.map((r) => ({ ...r }));
}

export function planStackRows(totalQuantity, maxStack, slotsAvailable, rowCap = MAX_STACK_ROWS_PER_OPERATION) {
  const slotBudget = Number.isFinite(slotsAvailable) ? Math.max(0, Math.trunc(slotsAvailable)) : Infinity;
  const rowBudget = Math.min(slotBudget, rowCap);
  const total = Math.min(totalQuantity, maxStack * rowBudget);
  const stacks = [];
  for (let remaining = total; remaining > 0; remaining -= Math.min(maxStack, remaining)) {
    stacks.push(Math.min(maxStack, remaining));
  }
  const clamped = total < totalQuantity;
  return { stacks, total, clamped, clampReason: clamped ? (slotBudget < rowCap ? "slots" : "stack-rows") : null };
}

export function positionClaimer(db, inventoryId, maxItemCount) {
  const used = db.prepare("select position_index as p from items where inventory_id = ?").all(inventoryId).map((r) => r.p);
  if (!(maxItemCount > 0)) {
    let next = Math.max(-1, ...used) + 1;
    return () => next++;
  }
  const occupied = new Set(used);
  let cursor = 0;
  return () => {
    while (cursor < maxItemCount) {
      const index = cursor++;
      if (!occupied.has(index)) return index;
    }
    throw new Error("No free backpack slot left");
  };
}

// items.id is AUTOINCREMENT, but the game draws new ids from items_id_sequencer instead, so we
// do the same; stay above max(id) in case the two disagree. SQLite maintains sqlite_sequence itself.
export function allocateItemIds(db, count) {
  if (count === 0) return [];
  const seq = db.prepare("select next_id from items_id_sequencer limit 1").get();
  const maxId = db.prepare("select coalesce(max(id), 0) as m from items").get().m;
  const first = Math.max(seq?.next_id ?? 1, maxId + 1);
  if (seq) db.prepare("update items_id_sequencer set next_id = ?").run(first + count);
  else db.prepare("insert into items_id_sequencer (next_id) values (?)").run(first + count);
  return Array.from({ length: count }, (_, i) => first + i);
}

export function giveItem(db, templateId, quantity, {
  maxStack = DEFAULT_MAX_STACK,
  volumeOf = () => 0,
  now = () => Math.floor(Date.now() / 1000)
} = {}) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantity must be a whole number of at least 1");
  if (!Number.isInteger(maxStack) || maxStack < 1) throw new Error("Stack size must be a whole number of at least 1");
  const inv = backpack(db);
  const warnings = [];
  const existing = db.prepare("select template_id as t, stack_size as s from items where inventory_id = ?").all(inv.id);
  const slotsAvailable = inv.maxItemCount > 0 ? Math.max(0, inv.maxItemCount - existing.length) : Infinity;

  let wanted = quantity;
  const unitVolume = volumeOf(templateId);
  if (inv.maxItemVolume > 0 && unitVolume > 0) {
    let used = 0;
    let unknown = 0;
    for (const row of existing) {
      const v = volumeOf(row.t);
      if (v > 0) used += v * row.s; else unknown++;
    }
    if (unknown) warnings.push(`${unknown} backpack item(s) have no known volume, so the volume check may allow too much`);
    wanted = Math.min(wanted, Math.max(0, Math.floor((inv.maxItemVolume - used) / unitVolume + 1e-9)));
  } else if (inv.maxItemVolume > 0) {
    warnings.push(`The volume of ${templateId} is unknown, so backpack volume was not checked`);
  }

  const plan = planStackRows(wanted, maxStack, slotsAvailable);
  const clampReason = plan.total < quantity ? (plan.clamped ? plan.clampReason : "volume") : null;
  if (plan.total === 0) throw new Error(`No room in the backpack (${clampReason})`);

  const claim = positionClaimer(db, inv.id, inv.maxItemCount);
  const ids = allocateItemIds(db, plan.stacks.length);
  const insert = db.prepare(`
    insert into items (id, inventory_id, stack_size, position_index, template_id, is_new, acquisition_time, stats, quality_level)
    values (?, ?, ?, ?, ?, 1, ?, ?, 0)`);
  const acquired = now();
  const inserted = plan.stacks.map((stackSize, i) => {
    const position = claim();
    insert.run(ids[i], inv.id, stackSize, position, templateId, acquired, DEFAULT_STATS);
    return { id: ids[i], position, stackSize };
  });
  return { templateId, requested: quantity, total: plan.total, clamped: clampReason !== null, clampReason, inserted, warnings };
}

// Any table with an ON DELETE CASCADE foreign key into items would silently lose rows
// if we deleted an item they point at. Find the first such row, if any.
function findItemReference(db, itemId) {
  const tables = db.prepare("select name from sqlite_master where type = 'table' and name != 'items'").all();
  for (const { name: table } of tables) {
    const fks = db.prepare(`pragma foreign_key_list("${table}")`).all();
    for (const fk of fks) {
      if (fk.table !== "items") continue;
      if (db.prepare(`select 1 from "${table}" where "${fk.from}" = ? limit 1`).get(itemId)) return table;
    }
  }
  return null;
}

export function removeItem(db, itemId, quantity) {
  if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1)) {
    throw new Error("Quantity must be a whole number of at least 1");
  }
  const { pawnId } = player(db);
  const row = db.prepare(`
    select it.id, it.template_id as templateId, it.stack_size as stackSize
    from items it join inventories inv on inv.id = it.inventory_id
    where it.id = ? and inv.actor_id = ?`).get(itemId, pawnId);
  if (!row) throw new Error(`Item ${itemId} is not in this character's inventories`);
  const referencedBy = findItemReference(db, itemId);
  if (referencedBy === "inventories") {
    // Deleting a container item would cascade to its inventory and contents.
    throw new Error(`Item ${itemId} holds its own inventory; remove it in game instead`);
  }
  if (referencedBy) throw new Error(`Item ${itemId} is referenced by ${referencedBy}; remove it in game instead`);
  if (quantity === undefined || quantity >= row.stackSize) {
    db.prepare("delete from items where id = ?").run(itemId);
    return { templateId: row.templateId, removed: row.stackSize, remaining: 0 };
  }
  db.prepare("update items set stack_size = ? where id = ?").run(row.stackSize - quantity, itemId);
  return { templateId: row.templateId, removed: quantity, remaining: row.stackSize - quantity };
}
