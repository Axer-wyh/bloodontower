const domain = require("../../packages/domain/src");
const { troubleBrewing } = require("../../packages/rules-data/src");

const DEMO_ROLE_IDS = [
  "washerwoman",
  "librarian",
  "investigator",
  "chef",
  "empath",
  "poisoner",
  "imp",
];

function buildDemoRoom() {
  const room = domain.createRoom({
    hostId: "host-1",
    hostName: "说书人",
    scriptId: troubleBrewing.id,
    seatCount: 7,
  });

  [
    ["p1", "阿泽"],
    ["p2", "念安"],
    ["p3", "连翘"],
    ["p4", "白荇"],
    ["p5", "半夏"],
    ["p6", "霜降"],
    ["p7", "暮云"],
  ].forEach(function register(player) {
    domain.addPlayer(room, {
      playerId: player[0],
      name: player[1],
    });
  });

  domain.assignRoles(room, troubleBrewing, {
    roleIds: DEMO_ROLE_IDS,
    rng: function seeded() {
      return 0.42;
    },
  });
  domain.startGame(room, troubleBrewing);
  domain.submitNightAction(room, {
    playerId: "p6",
    intent: "poison",
    targetIds: ["p5"],
    notes: "示例中毒目标",
  });
  domain.advancePhase(room, troubleBrewing);
  domain.recordNomination(room, {
    nominatorId: "p1",
    targetId: "p6",
    reason: "测试提名",
  });
  domain.resolveVote(room, {
    nominationId: room.nominations[0].nominationId,
    voterIds: ["p1", "p2", "p4", "p5"],
  });

  return room;
}

const demoRoom = buildDemoRoom();

module.exports = {
  demoRoom,
  troubleBrewing,
  getHostView: function getHostView() {
    return domain.getVisibleRoomState(demoRoom, { viewerRole: "host" });
  },
  getPlayerView: function getPlayerView(playerId) {
    return domain.getVisibleRoomState(demoRoom, { viewerId: playerId });
  },
  getScript: function getScript() {
    return troubleBrewing;
  },
  getRoles: function getRoles() {
    return troubleBrewing.roles;
  },
  getAIContext: function getAIContext() {
    return domain.buildAIHostContext(demoRoom, { viewerRole: "host" });
  },
};

