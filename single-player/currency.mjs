// Solari credit (the bank balance), not physical SolarisCoin items.
import { player } from "./items.mjs";

export const SOLARI_CURRENCY_ID = 0;
export const MAX_SOLARI = 1_000_000_000_000;

export function getSolari(db) {
  const { controllerId } = player(db);
  const row = db.prepare("select balance from player_virtual_currency_balances where player_controller_id = ? and currency_id = ?")
    .get(controllerId, SOLARI_CURRENCY_ID);
  return row ? row.balance : 0;
}

export function setSolari(db, amount) {
  if (!Number.isInteger(amount) || amount < 0 || amount > MAX_SOLARI) {
    throw new Error(`Solari must be a whole number from 0 to ${MAX_SOLARI}`);
  }
  const before = getSolari(db);
  const { controllerId } = player(db);
  db.prepare(`
    insert into player_virtual_currency_balances (player_controller_id, currency_id, balance) values (?, ?, ?)
    on conflict (player_controller_id, currency_id) do update set balance = excluded.balance`)
    .run(controllerId, SOLARI_CURRENCY_ID, amount);
  return { before, after: amount };
}

export function addSolari(db, delta) {
  if (!Number.isInteger(delta) || delta === 0) throw new Error("Amount must be a non-zero whole number");
  const after = getSolari(db) + delta;
  if (after < 0) throw new Error(`That would leave ${after} Solari; the balance cannot go below 0`);
  return setSolari(db, after);
}
