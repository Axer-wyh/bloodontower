const test = require("node:test");
const assert = require("node:assert/strict");

const domain = require("../packages/domain/src");

test("createManagedRoom seeds script metadata", function () {
  const room = domain.createManagedRoom({
    hostId: "host-1",
    hostName: "主持",
    scriptId: "trouble_brewing",
    seatCount: 7,
  });

  assert.equal(room.scriptName, "暗流涌动");
  assert.equal(room.metadata.mode, "internal-test");
});

test("joinManagedRoom is idempotent for same player", function () {
  const room = domain.createManagedRoom({
    hostId: "host-1",
    hostName: "主持",
    scriptId: "trouble_brewing",
    seatCount: 7,
  });

  domain.joinManagedRoom(room, {
    playerId: "p1",
    name: "阿泽",
  });
  domain.joinManagedRoom(room, {
    playerId: "p1",
    name: "新名字",
  });

  assert.equal(room.players.length, 1);
  assert.equal(room.players[0].name, "新名字");
});

test("applyRoomAction restricts host-only actions", function () {
  const room = domain.createManagedRoom({
    hostId: "host-1",
    hostName: "主持",
    scriptId: "trouble_brewing",
    seatCount: 5,
  });

  ["p1", "p2", "p3", "p4", "p5"].forEach(function eachPlayer(id) {
    domain.joinManagedRoom(room, {
      playerId: id,
      name: id,
    });
  });

  assert.throws(function forbiddenStart() {
    domain.applyRoomAction(room, {
      actorId: "p1",
      actionType: "assign_roles_and_start",
    });
  });

  domain.applyRoomAction(room, {
    actorId: "host-1",
    actionType: "assign_roles_and_start",
  });

  assert.equal(room.status, "in_progress");
  assert.equal(room.phase, "first_night");
});

test("buildRoomView returns public and player scoped views", function () {
  const room = domain.createManagedRoom({
    hostId: "host-1",
    hostName: "主持",
    scriptId: "trouble_brewing",
    seatCount: 5,
  });
  ["p1", "p2", "p3", "p4", "p5"].forEach(function eachPlayer(id) {
    domain.joinManagedRoom(room, {
      playerId: id,
      name: id,
    });
  });
  domain.applyRoomAction(room, {
    actorId: "host-1",
    actionType: "assign_roles_and_start",
  });

  const publicView = domain.buildRoomView(room, {
    viewerId: "stranger",
  });
  const playerView = domain.buildRoomView(room, {
    viewerId: "p1",
  });

  assert.equal(publicView.viewerRole, "public");
  assert.equal(publicView.room.players[0].visibleRoleName, "未知身份");
  assert.equal(playerView.viewerRole, "player");
  assert.ok(playerView.room.privateState);
});
