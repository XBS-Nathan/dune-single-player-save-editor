# Single-player save editor — design

Date: 2026-09-19
Status: approved in chat, spec for review

## Goal

A command-line tool in this repo that reads and edits the Dune: Awakening
**single-player** save, starting with **items** and **Solari**. It reuses the
item and currency rules from the dune-docker console
(`~/Projects/dune-docker/console/api/src/duneDb.js`) but runs against the single-player
save's SQLite database instead of the self-hosted server's Postgres.

## The save format (as found 2026-09-19)

- Location: `%LOCALAPPDATA%\DuneSandbox\Saved\Cloud\PlayerClientStorage\FLS_retail\<steamid>\game.db`.
  The folder is synced by Steam Cloud. Rolling autosaves sit in `autosave\N.bak`.
- `game.db` = 8-byte header (`u32le version = 1`, `u32le uncompressed size`)
  followed by a zlib stream. Decompressed, it is a SQLite 3 database
  (about 101 `STRICT` tables, the same layout as the server's `dune` schema).
- The game writes the database about every 20 s while running, so the game must
  be closed before editing.

Relevant tables:

| Table | Use |
|---|---|
| `player_state` | character (`character_name`, `player_controller_id`, `player_pawn_id`) |
| `inventories` | per-actor inventories; the backpack is `inventory_type = 0` on the player pawn actor, with `max_item_count`/`max_item_volume` |
| `items` | `id, inventory_id, stack_size (>0), position_index (>=0), template_id, is_new, acquisition_time, stats (JSON text), quality_level, volume_override` |
| `items_id_sequencer` | single row `next_id`; new item ids come from here, not from AUTOINCREMENT |
| `player_virtual_currency_balances` | `player_controller_id, currency_id (0 = Solari), balance` |

Default stats for a plain item: `{"FItemStackAndDurabilityStats":[[],{"DecayedMaxDurability":0.0}]}`.

## Solari

Two separate things, both supported:

1. **Solari credit**: `player_virtual_currency_balances.balance` for currency 0.
   `solari set <n>` and `solari add <±n>`. A negative result is refused.
2. **Physical coins**: `SolarisCoin` items, handled by the normal `give` command.

## Commands

All commands need `--save <path to game.db>`. The tool never finds the real save by itself.

```
node single-player.mjs --save <path> info
node single-player.mjs --save <path> items [--all]
node single-player.mjs --save <path> find <text>
node single-player.mjs --save <path> give <item> <qty> [--stack N]
node single-player.mjs --save <path> remove <itemRowId> [qty]
node single-player.mjs --save <path> solari set <n>
node single-player.mjs --save <path> solari add <±n>
node single-player.mjs --save <path> backups
node single-player.mjs --save <path> restore <backupName>
```

Global flags: `--force` skips the "game is running" check; `--dry-run` prints
the planned changes and writes nothing.

`<item>` is a template id (case-insensitive) or a catalogue name. If a name
matches more than one item, the command stops and lists the matches.

## Modules

| File | Responsibility |
|---|---|
| `single-player/savefile.mjs` | `unpack(buffer) → sqliteBytes`, `pack(sqliteBytes) → buffer`; checks version 1 and the declared size |
| `single-player/catalog.mjs` | loads `single-player/data/admin-items.json` (copied from dune-docker); `resolveItem(query)`, `search(text)`, `displayName(id)` |
| `single-player/items.mjs` | `listItems(db, {all})`, `giveItem(db, templateId, qty, {maxStack})`, `removeItem(db, rowId, qty)`; ports `planStackRows` and free-position claiming; allocates ids from `items_id_sequencer` |
| `single-player/currency.mjs` | `getSolari(db)`, `setSolari(db, n)`, `addSolari(db, delta)` |
| `single-player/session.mjs` | the write cycle: game-running check, backup, unpack to a temp file, open with `node:sqlite`, run the edit in one transaction, `PRAGMA integrity_check`, repack, atomic replace |
| `single-player/backup.mjs` | copies the save's whole folder to `single-player-backups/<timestamp>/`, lists backups, restores one |
| `single-player.mjs` | argument parsing and output |

SQLite access uses Node's built-in `node:sqlite` (Node 24), so there are no new dependencies.

## Rules carried over from the console

- **Stack splitting** (`planStackRows`): a quantity becomes full stacks plus a
  remainder, capped by free slots. The stack size comes from the catalogue if
  it has one, otherwise 1000, or from `--stack N`. A request that does not fit
  gives a partial result, and the output says so plainly.
- **Positions**: new rows take the lowest free `position_index` values in
  `0 .. max_item_count-1`.
- **Item ids**: read `next_id`, use it for each new row, and write back the next
  unused value. Also make sure it stays above `max(items.id)`.
- **Scope limit**: `give` only accepts catalogue categories `resources`,
  `consumables` and `misc`. Weapons, clothing and the rest need durability,
  augment or unlock data, so they are refused. The catalogue has 2558 entries
  but only 97 carry `stackSize`/`volume` (mostly resources), which is why the
  1000 default and `--stack` exist.
- **Volume**: if the backpack has `max_item_volume > 0` and the catalogue knows
  the item's volume, the give is capped by the volume that is left; otherwise
  volume is not checked, and the output warns about it.

## Safety

- The game-running check calls `tasklist.exe` for `DuneSandbox`. If a
  matching process is found, the tool refuses unless `--force` is given.
- **Every** write backs up the entire save folder first. Nothing is written
  if the backup fails.
- The edit runs in one SQLite transaction. The file is written as
  `game.db.tmp` and then renamed over `game.db`. `game_prepatch.db` and the
  autosaves are never touched.
- Read-only commands open a temporary unpacked copy and never write.
- `single-player-backups/` is gitignored.

## Testing

`node --test` against a **synthetic** save only, never the real one:

- `test/fixtures/schema.sql`: the table definitions (no data) taken from a
  scratch copy of a single-player save.
- A fixture builder creates a database from that schema, inserts a made-up
  player, backpack and a few items, then packs it into the `game.db` format in
  a temp folder.
- Tests cover: unpack/pack round trip, bad header, stack plans (exact, with a
  remainder, capped by slots), position claiming with gaps, id-sequencer
  behaviour, Solari set/add/negative refusal, remove partial/whole, dry-run
  writes nothing, backup-then-restore gives back identical bytes, the
  game-running check (with the process list stubbed).

The first run against the real save is up to Nathan, done by hand with a small
give, after a backup.

## Out of scope (later)

Gear with durability or augments, research/recipes, reputation, bases and
vehicles, a web UI, and editing the self-hosted Postgres (the existing scripts
already do that).
