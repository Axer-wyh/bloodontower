const test = require("node:test");
const assert = require("node:assert/strict");

const domain = require("../packages/domain/src");
const { troubleBrewing } = require("../packages/rules-data/src");

test("assignRoles creates private state and first night queue", function () {
  const room = domain.createRoom({
    hostId: "host",
    hostName: "主持",
    scriptId: troubleBrewing.id,
    seatCount: 7,
  });

  ["a", "b", "c", "d", "e", "f", "g"].forEach(function eachPlayer(id) {
    domain.addPlayer(room, {
      playerId: id,
      name: id.toUpperCase(),
    });
  });

  domain.assignRoles(room, troubleBrewing, {
    roleIds: [
      "washerwoman",
      "librarian",
      "investigator",
      "chef",
      "empath",
      "poisoner",
      "imp",
    ],
    rng: function rng() {
      return 0.25;
    },
  });
  domain.startGame(room, troubleBrewing);

  assert.equal(room.players.length, 7);
  assert.equal(room.status, "in_progress");
  assert.equal(room.phase, "first_night");
  assert.ok(room.privateStates.a || room.privateStates.b);
  assert.ok(room.pendingNightQueue.length >= 5);
});

test("buildRoleBag applies baron outsider bonus", function () {
  const bag = domain.buildRoleBag(troubleBrewing, 5, function rng() {
    return 0.99;
  });
  assert.equal(bag.length, 5);
  if (bag.includes("baron")) {
    const outsiderCount = bag.filter(function filterRole(roleId) {
      return ["butler", "drunk", "recluse", "saint"].includes(roleId);
    }).length;
    assert.equal(outsiderCount, 2);
  }
});

test("player view hides other roles and may mask drunk identity", function () {
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
    roleIds: ["drunk", "chef", "washerwoman", "baron", "imp"],
    rng: function rng() {
      return 0.12;
    },
  });

  const selfView = domain.getVisibleRoomState(room, { viewerId: "a" });
  const otherView = selfView.players.find(function findPlayer(player) {
    return player.playerId === "b";
  });

  assert.equal(otherView.visibleRoleName, "未知身份");
  assert.notEqual(selfView.privateState.displayRoleName, "醉鬼");
  assert.notEqual(selfView.players.find(function findSelf(player) {
    return player.playerId === "a";
  }).roleId, "drunk");
});

test("host view keeps actual drunk role", function () {
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
    roleIds: ["drunk", "chef", "washerwoman", "baron", "imp"],
    rng: function rng() {
      return 0.22;
    },
  });

  const hostView = domain.getVisibleRoomState(room, { viewerRole: "host" });
  const drunkPlayer = hostView.players.find(function findDrunk(player) {
    return player.roleId === "drunk";
  });

  assert.equal(drunkPlayer.visibleRoleName, "醉鬼");
});

test("resolveVote executes target on majority", function () {
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
      return 0.1;
    },
  });
  domain.startGame(room, troubleBrewing);
  domain.advancePhase(room, troubleBrewing);

  const nomination = domain.recordNomination(room, {
    nominatorId: room.players[0].playerId,
    targetId: room.players[3].playerId,
    reason: "测试投票",
  });
  domain.resolveVote(room, {
    nominationId: nomination.nominationId,
    voterIds: [room.players[0].playerId, room.players[1].playerId, room.players[2].playerId],
  });

  assert.equal(room.players[3].isAlive, false);
});
