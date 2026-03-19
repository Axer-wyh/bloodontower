const {
  createRoom,
  addPlayer,
  assignRoles,
  startGame,
  advancePhase,
  submitNightAction,
  recordNomination,
  resolveVote,
  getVisibleRoomState,
} = require("./room-state");
const { buildAIHostContext } = require("./ai-host");
const { troubleBrewing } = require("../../rules-data/src");
const { ROOM_STATUS } = require("./constants");

const scripts = {
  [troubleBrewing.id]: troubleBrewing,
};

function getScriptById(scriptId) {
  const script = scripts[scriptId];
  if (!script) {
    throw new Error("Unsupported script: " + scriptId);
  }
  return script;
}

function createManagedRoom(input) {
  const script = getScriptById(input.scriptId);
  const room = createRoom({
    hostId: input.hostId,
    hostName: input.hostName,
    scriptId: script.id,
    seatCount: input.seatCount,
  });
  room.scriptName = script.name;
  room.metadata.scriptVersion = "tb-v1";
  room.metadata.mode = "internal-test";
  return room;
}

function joinManagedRoom(room, input) {
  if (room.status !== ROOM_STATUS.LOBBY) {
    throw new Error("Game already started. New players cannot join.");
  }

  const existing = room.players.find(function findPlayer(player) {
    return player.playerId === input.playerId;
  });

  if (existing) {
    if (input.name && existing.name !== input.name) {
      existing.name = input.name;
      room.metadata.lastUpdatedAt = new Date().toISOString();
    }
    return room;
  }

  addPlayer(room, {
    playerId: input.playerId,
    name: input.name,
  });
  return room;
}

function applyRoomAction(room, input) {
  const script = getScriptById(room.scriptId);
  const actorId = input.actorId;

  switch (input.actionType) {
    case "assign_roles_and_start":
      assertHost(room, actorId);
      assignRoles(room, script, {});
      startGame(room, script);
      return room;
    case "advance_phase":
      assertHost(room, actorId);
      advancePhase(room, script);
      return room;
    case "submit_night_action":
      assertPlayerOrHost(room, actorId, input.payload.playerId);
      submitNightAction(room, input.payload);
      return room;
    case "record_nomination":
      assertPlayerOrHost(room, actorId, input.payload.nominatorId);
      recordNomination(room, input.payload);
      return room;
    case "resolve_vote":
      assertHost(room, actorId);
      resolveVote(room, input.payload);
      return room;
    default:
      throw new Error("Unsupported room action: " + input.actionType);
  }
}

function buildRoomView(room, input) {
  const viewerId = input.viewerId;
  const isHost = viewerId === room.hostId;
  const isJoinedPlayer = room.players.some(function hasPlayer(player) {
    return player.playerId === viewerId;
  });

  if (isHost) {
    return {
      viewerRole: "host",
      room: getVisibleRoomState(room, { viewerRole: "host" }),
      aiContext: buildAIHostContext(room, { viewerRole: "host" }),
      permissions: {
        canManage: true,
        canJoin: false,
        canActAsPlayer: false,
      },
    };
  }

  if (isJoinedPlayer) {
    return {
      viewerRole: "player",
      room: getVisibleRoomState(room, { viewerId: viewerId }),
      permissions: {
        canManage: false,
        canJoin: false,
        canActAsPlayer: true,
      },
    };
  }

  return {
    viewerRole: "public",
    room: {
      roomId: room.roomId,
      scriptId: room.scriptId,
      scriptName: room.scriptName,
      seatCount: room.seatCount,
      status: room.status,
      statusLabel: room.statusLabel,
      phase: room.phase,
      phaseLabel: room.phaseLabel,
      day: room.day,
      players: room.players.map(function mapPlayer(player) {
        return {
          playerId: player.playerId,
          name: player.name,
          seat: player.seat,
          isAlive: player.isAlive,
          visibleRoleName: "未知身份",
        };
      }),
      publicLog: room.publicLog,
      nominations: room.nominations,
      pendingNightQueue: [],
    },
    permissions: {
      canManage: false,
      canJoin: true,
      canActAsPlayer: false,
    },
  };
}

function assertHost(room, actorId) {
  if (actorId !== room.hostId) {
    throw new Error("Only host can perform this action.");
  }
}

function assertPlayerOrHost(room, actorId, playerId) {
  if (actorId === room.hostId) {
    return;
  }
  if (actorId !== playerId) {
    throw new Error("Only the owning player or host can perform this action.");
  }
}

module.exports = {
  getScriptById,
  createManagedRoom,
  joinManagedRoom,
  applyRoomAction,
  buildRoomView,
};

