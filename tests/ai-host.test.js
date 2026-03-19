const test = require("node:test");
const assert = require("node:assert/strict");

const domain = require("../packages/domain/src");
const { troubleBrewing } = require("../packages/rules-data/src");

test("AI host schema exposes fixed fields", function () {
  const schema = domain.buildAIHostDecisionSchema();
  assert.deepEqual(schema.required, [
    "intent",
    "message",
    "target",
    "requires_confirmation",
    "safety_flags",
  ]);
});

test("AI host decision validator rejects invalid intent", function () {
  assert.throws(function invalidIntent() {
    domain.validateAIHostDecision({
      intent: "hack_state",
      message: "bad",
      target: { scope: "public", player_ids: [] },
      requires_confirmation: true,
      safety_flags: [],
    });
  });
});

test("AI host context contains sanitized room and constraints", function () {
  const room = domain.createRoom({
    hostId: "host",
    hostName: "主持",
    scriptId: troubleBrewing.id,
    seatCount: 5,
  });
  ["a", "b", "c", "d", "e"].forEach(function eachPlayer(id) {
    domain.addPlayer(room, {
      playerId: id,
      name: id,
    });
  });
  domain.assignRoles(room, troubleBrewing, {
    roleIds: ["chef", "washerwoman", "slayer", "poisoner", "imp"],
    rng: function rng() {
      return 0.3;
    },
  });

  const context = domain.buildAIHostContext(room, { viewerRole: "host" });
  assert.equal(context.room.players.length, 5);
  assert.ok(context.constraints.includes("不得修改房间状态"));
});

