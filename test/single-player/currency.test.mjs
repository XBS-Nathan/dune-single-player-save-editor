import { test } from "node:test";
import assert from "node:assert/strict";
import { openFixtureDb } from "./helpers.mjs";
import { addSolari, getSolari, setSolari } from "../../single-player/currency.mjs";

function withDb(options, fn) {
  const { db, close } = openFixtureDb(options);
  try { return fn(db); } finally { close(); }
}

test("reads the Solari credit balance", () => {
  withDb({ solari: 39431 }, (db) => assert.equal(getSolari(db), 39431));
});

test("set replaces the balance and reports before and after", () => {
  withDb({ solari: 1000 }, (db) => {
    assert.deepEqual(setSolari(db, 5), { before: 1000, after: 5 });
    assert.equal(getSolari(db), 5);
  });
});

test("add changes the balance by a delta", () => {
  withDb({ solari: 1000 }, (db) => {
    assert.deepEqual(addSolari(db, 500), { before: 1000, after: 1500 });
    assert.deepEqual(addSolari(db, -1500), { before: 1500, after: 0 });
  });
});

test("the balance can never go negative or past the cap", () => {
  withDb({ solari: 1000 }, (db) => {
    assert.throws(() => addSolari(db, -1001), /below 0/);
    assert.throws(() => setSolari(db, -1), /whole number from 0/);
    assert.throws(() => setSolari(db, 1_000_000_000_001), /whole number from 0/);
    assert.throws(() => setSolari(db, 1.5), /whole number from 0/);
    assert.throws(() => addSolari(db, 0), /non-zero/);
    assert.equal(getSolari(db), 1000);
  });
});

test("a missing balance row reads as 0 and set creates it", () => {
  withDb({}, (db) => {
    db.exec("delete from player_virtual_currency_balances");
    assert.equal(getSolari(db), 0);
    assert.deepEqual(setSolari(db, 250), { before: 0, after: 250 });
    assert.equal(getSolari(db), 250);
  });
});
