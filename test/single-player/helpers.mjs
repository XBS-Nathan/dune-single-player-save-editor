import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pack } from "../../single-player/savefile.mjs";

const SCHEMA = readFileSync(new URL("../fixtures/schema.sql", import.meta.url), "utf8");

export const noGame = () => ["explorer.exe", "steam.exe"];
export const gameRunning = () => ["explorer.exe", "DuneSandbox-Win64-Shipping.exe"];

export function seedFixture(db, { slots = 5, volume = 0, solari = 1000, nextId = 1000, items = [] } = {}) {
  db.exec(SCHEMA);
  db.exec(`
    insert into accounts (id, user, platform_name) values (1, 'TESTUSER', 'Steam');
    insert into actors (id, class) values
      (1, '/Game/Test/PlayerController'),
      (2, '/Game/Dune/Characters/Player/BP_DunePlayerCharacter.BP_DunePlayerCharacter_C'),
      (3, '/Game/Test/Chest');
    insert into player_state (id, account_id, character_name, player_controller_id, player_pawn_id)
      values (1, 1, 'Test Char', 1, 2);
  `);
  const inv = db.prepare("insert into inventories (id, actor_id, inventory_type, max_item_count, max_item_volume) values (?, ?, ?, ?, ?)");
  inv.run(1, 2, 0, slots, volume);
  inv.run(2, 2, 1, 10, 0);
  inv.run(3, 3, 4, 20, 0);
  db.prepare("insert into items_id_sequencer (next_id) values (?)").run(nextId);
  db.prepare("insert into player_virtual_currency_balances (player_controller_id, currency_id, balance) values (1, 0, ?)").run(solari);
  const item = db.prepare("insert into items (id, inventory_id, stack_size, position_index, template_id, stats) values (?, ?, ?, ?, ?, '{}')");
  for (const it of items) item.run(it.id, it.inventoryId ?? 1, it.stackSize ?? 1, it.position, it.templateId);
}

export function openFixtureDb(options) {
  const db = new DatabaseSync(":memory:");
  seedFixture(db, options);
  return { db, close: () => db.close() };
}

export function buildFixtureSqlite(options) {
  const dir = mkdtempSync(join(tmpdir(), "single-player-fixture-db-"));
  try {
    const path = join(dir, "fixture.sqlite");
    const db = new DatabaseSync(path);
    seedFixture(db, options);
    db.close();
    return readFileSync(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function makeSaveFixture(options) {
  const root = mkdtempSync(join(tmpdir(), "single-player-fixture-"));
  const saveDir = join(root, "save");
  mkdirSync(join(saveDir, "autosave"), { recursive: true });
  writeFileSync(join(saveDir, "autosave", "0.bak"), "autosave-bytes");
  const savePath = join(saveDir, "game.db");
  writeFileSync(savePath, pack(buildFixtureSqlite(options)));
  return {
    root,
    saveDir,
    savePath,
    backupRoot: join(root, "backups"),
    cleanup: () => rmSync(root, { recursive: true, force: true })
  };
}
