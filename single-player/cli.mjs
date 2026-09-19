import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listBackups, restoreBackup } from "./backup.mjs";
import { loadCatalog } from "./catalog.mjs";
import { addSolari, getSolari, setSolari } from "./currency.mjs";
import { DEFAULT_MAX_STACK, backpack, giveItem, listItems, player, removeItem } from "./items.mjs";
import { assertGameClosed, editSave, readSave } from "./session.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_BACKUP_ROOT = resolve(REPO_ROOT, "single-player-backups");

const USAGE = `Usage: node single-player.mjs [--save <path to game.db>] <command> [args] [--force] [--dry-run]

  info                      character, Solari credit and backpack use
  items [--all]             backpack items (--all: every inventory of the character)
  find <text>               search the item catalogue (no --save needed)
  give <item> <qty>         add a resource or consumable to the backpack [--stack N]
  remove <itemId> [qty]     remove a whole row, or qty from it
  solari set <n>            set the Solari credit balance
  solari add <±n>           change the Solari credit balance
  backups                   list backups
  restore <name>            restore a backup (the current state is backed up first)

Writes refuse while DuneSandbox is running (--force skips the check) and back up the save folder first.`;

function parseWhole(value, label) {
  if (value === undefined || !/^[+-]?\d+$/.test(value)) throw new Error(`${label} must be a whole number`);
  return Number(value);
}

export function parseArgs(argv) {
  const opts = { save: null, force: false, dryRun: false, all: false, stack: null, help: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--save") opts.save = argv[++i];
    else if (arg === "--force") opts.force = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--all") opts.all = true;
    else if (arg === "--stack") opts.stack = parseWhole(argv[++i], "--stack");
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option ${arg}`);
    else rest.push(arg);
  }
  return { opts, command: rest[0], args: rest.slice(1) };
}

export async function main(argv, {
  out = console.log,
  err = console.error,
  listProcesses,
  backupRoot = DEFAULT_BACKUP_ROOT,
  catalogPath,
  now = () => new Date()
} = {}) {
  try {
    const { opts, command, args } = parseArgs(argv);
    if (opts.help || !command) {
      out(USAGE);
      return opts.help ? 0 : 1;
    }
    const catalog = loadCatalog(catalogPath);

    if (command === "find") {
      if (args.length === 0) throw new Error("Usage: find <text>");
      const matches = catalog.search(args.join(" "));
      if (matches.length === 0) out("No matches.");
      for (const e of matches) out(`${e.id.padEnd(40)} ${e.name}  [${e.category}${catalog.isGiveable(e) ? "" : ", not giveable"}]`);
      return 0;
    }

    if (!opts.save) throw new Error("--save <path to game.db> is required");
    if (!existsSync(opts.save)) throw new Error(`Save file not found: ${opts.save}`);
    const edit = (fn) => editSave(opts.save, fn, { force: opts.force, dryRun: opts.dryRun, listProcesses, backupRoot, now });
    const reportWrite = (r) => out(r.dryRun ? "Dry run: nothing was written." : `Backup: ${r.backup.path}`);

    switch (command) {
      case "info":
        readSave(opts.save, (db) => {
          const bp = backpack(db);
          out(`Character: ${player(db).name}`);
          out(`Solari credit: ${getSolari(db)}`);
          out(`Backpack: ${listItems(db).length}/${bp.maxItemCount > 0 ? bp.maxItemCount : "unlimited"} slots used`);
        });
        return 0;

      case "items":
        readSave(opts.save, (db) => {
          const rows = listItems(db, { all: opts.all });
          if (rows.length === 0) out("No items.");
          for (const it of rows) {
            out(`${String(it.id).padStart(9)}  inv ${it.inventoryId} slot ${String(it.position).padStart(3)}  x${String(it.stackSize).padEnd(6)} ${it.templateId} (${catalog.displayName(it.templateId)})`);
          }
        });
        return 0;

      case "give": {
        if (args.length !== 2) throw new Error("Usage: give <item> <qty>");
        const entry = catalog.resolveItem(args[0]);
        if (!catalog.isGiveable(entry)) {
          throw new Error(`${entry.id} (${entry.name}) is in category "${entry.category}"; only resources and consumables can be given for now`);
        }
        const quantity = parseWhole(args[1], "Quantity");
        const maxStack = opts.stack ?? catalog.stackSizeOf(entry.id) ?? DEFAULT_MAX_STACK;
        const r = edit((db) => giveItem(db, entry.id, quantity, {
          maxStack,
          volumeOf: catalog.volumeOf,
          now: () => Math.floor(now().getTime() / 1000)
        }));
        const g = r.result;
        for (const w of g.warnings) out(`Warning: ${w}`);
        const what = `${entry.name} (${entry.id}) in ${g.inserted.length} stack(s)`;
        out(g.clamped
          ? `Added ${g.total} of the requested ${g.requested} ${what}; limited by backpack ${g.clampReason}.`
          : `Added ${g.total} ${what}.`);
        reportWrite(r);
        return 0;
      }

      case "remove": {
        if (args.length < 1 || args.length > 2) throw new Error("Usage: remove <itemId> [qty]");
        const itemId = parseWhole(args[0], "Item id");
        const quantity = args[1] === undefined ? undefined : parseWhole(args[1], "Quantity");
        const r = edit((db) => removeItem(db, itemId, quantity));
        out(`Removed ${r.result.removed} ${catalog.displayName(r.result.templateId)}; ${r.result.remaining} left in that stack.`);
        reportWrite(r);
        return 0;
      }

      case "solari": {
        const [sub, amount] = args;
        if (!["set", "add"].includes(sub) || amount === undefined) throw new Error("Usage: solari set <n> | solari add <±n>");
        const n = parseWhole(amount, "Amount");
        const r = edit((db) => (sub === "set" ? setSolari(db, n) : addSolari(db, n)));
        out(`Solari credit: ${r.result.before} → ${r.result.after}`);
        reportWrite(r);
        return 0;
      }

      case "backups": {
        const names = listBackups(backupRoot);
        if (names.length === 0) out("No backups yet.");
        for (const name of names) out(name);
        return 0;
      }

      case "restore": {
        if (args.length !== 1) throw new Error("Usage: restore <name>");
        assertGameClosed({ force: opts.force, listProcesses });
        if (opts.dryRun) {
          out(`Dry run: would restore ${args[0]}.`);
          return 0;
        }
        const r = restoreBackup(opts.save, backupRoot, args[0], now());
        out(`Restored ${r.restored}. The state before restoring was backed up as ${r.safetyBackup.name}.`);
        if (r.leftInPlace.length > 0) {
          out("Kept files that are not in that backup:");
          for (const path of r.leftInPlace) {
            out(`  ${path}`);
          }
        }
        return 0;
      }

      default:
        throw new Error(`Unknown command "${command}"\n\n${USAGE}`);
    }
  } catch (error) {
    err(`Error: ${error.message}`);
    return 1;
  }
}
