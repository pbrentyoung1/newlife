import assert from "node:assert/strict";
import { test } from "node:test";
import { changePublication } from "../scripts/lib/sermon-publication.mjs";

function transaction(state, { auditFails = false } = {}) {
  const calls = [];
  return {
    calls,
    async beginTransaction() { calls.push("begin"); },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
    async execute(sql, parameters) {
      calls.push([sql, parameters]);
      if (sql.startsWith("SELECT")) return [state ? [{ id: 7, state }] : []];
      if (auditFails && sql.startsWith("INSERT")) throw new Error("Audit unavailable");
      return [{ affectedRows: 1 }];
    },
  };
}

test("publishing locks an approved row and commits the state and audit together", async () => {
  const db = transaction("approved");
  assert.deepEqual(await changePublication(db, "publish", "weekly-sermon", " Editor "), {
    outcome: "changed", state: "published",
  });
  assert.equal(db.calls[0], "begin");
  assert.match(db.calls[1][0], /FOR UPDATE$/);
  assert.deepEqual(db.calls[1][1], ["weekly-sermon"]);
  assert.match(db.calls[2][0], /published_at = UTC_TIMESTAMP/);
  assert.deepEqual(db.calls[3][1], [7, "publish", "Editor"]);
  assert.equal(db.calls.at(-1), "commit");
});

test("withdrawing preserves the prior publication timestamp", async () => {
  const db = transaction("published");
  assert.deepEqual(await changePublication(db, "withdraw", "weekly-sermon", "Editor"), {
    outcome: "changed", state: "withdrawn",
  });
  assert.match(db.calls[2][0], /SET state = 'withdrawn'/);
  assert.doesNotMatch(db.calls[2][0], /published_at/);
});

test("a draft cannot bypass approval and a missing sermon cannot be changed", async () => {
  for (const [state, outcome] of [["draft", "invalid"], [null, "missing"]]) {
    const db = transaction(state);
    assert.equal((await changePublication(db, "publish", "weekly-sermon", "Editor")).outcome, outcome);
    assert.equal(db.calls.length, 3);
    assert.equal(db.calls.at(-1), "rollback");
  }
});

test("repeated publish or withdraw requests do not create duplicate events", async () => {
  for (const [action, state] of [["publish", "published"], ["withdraw", "withdrawn"]]) {
    const db = transaction(state);
    assert.equal((await changePublication(db, action, "weekly-sermon", "Editor")).outcome, "unchanged");
    assert.equal(db.calls.length, 3);
    assert.equal(db.calls.at(-1), "commit");
  }
});

test("an audit failure rolls back the editorial state change", async () => {
  const db = transaction("approved", { auditFails: true });
  await assert.rejects(changePublication(db, "publish", "weekly-sermon", "Editor"), /Audit unavailable/);
  assert.equal(db.calls.at(-1), "rollback");
  assert.ok(!db.calls.includes("commit"));
});
