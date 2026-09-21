# Dune Awakening single-player save editor

`single-player.mjs` edits the Dune Awakening **single-player** save. The save is `game.db` under
`%LOCALAPPDATA%\DuneSandbox\Saved\Cloud\PlayerClientStorage\FLS_retail\<steamid>\`:
an 8-byte header plus a zlib-compressed SQLite database with the same tables as
the self-hosted server's `dune` schema. Design: `docs/superpowers/specs/2026-09-19-single-player-save-editor-design.md`.

Needs Node 22.5 or newer (it uses the built-in `node:sqlite`). There are no npm dependencies.

```bash
SAVE=/path/to/FLS_retail/<steamid>/game.db
node single-player.mjs --save "$SAVE" info
node single-player.mjs --save "$SAVE" items
node single-player.mjs find spice
node single-player.mjs --save "$SAVE" give "Copper Ore" 500 --dry-run
node single-player.mjs --save "$SAVE" solari add 10000
node single-player.mjs --save "$SAVE" backups
```

- Close the game first: it rewrites the save every 20 seconds, and writes are refused while `DuneSandbox*` is running.
- Every write copies the whole save folder to `single-player-backups/<timestamp>/` first; `restore <name>` puts one back.
- `give` only takes resources and consumables. Stack sizes come from the catalogue, otherwise 1000 (`--stack N` overrides).
- The folder is synced by Steam Cloud, so a bad edit syncs too; keep the backups.
- Tests: `npm test` (synthetic saves only).
