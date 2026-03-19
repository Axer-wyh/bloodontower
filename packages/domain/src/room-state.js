const {
  ALIGNMENTS,
  ROLE_TYPES,
  ROOM_STATUS,
  PHASES,
} = require("./constants");
const {
  cloneDeep,
  countAdjacentPairs,
  getNeighbors,
  indexBy,
  makeId,
  sample,
  shuffle,
} = require("./utils");

function createRoom(input) {
  if (!input.hostId || !input.hostName) {
    throw new Error("Room host is required.");
  }

  return {
    roomId: input.roomId || makeId("room"),
    hostId: input.hostId,
    hostName: input.hostName,
    scriptId: input.scriptId || null,
    scriptName: null,
    seatCount: input.seatCount || 7,
    day: 0,
    status: ROOM_STATUS.LOBBY,
    statusLabel: "等待中",
    phase: PHASES.LOBBY,
    phaseLabel: "大厅",
    players: [],
    roleCatalog: {},
    privateStates: {},
    publicLog: [],
    actionLog: [],
    nominations: [],
    pendingNightQueue: [],
    metadata: {
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    },
  };
}

function addPlayer(room, input) {
  ensureLobby(room);
  if (room.players.length >= room.seatCount) {
    throw new Error("Room is full.");
  }
  if (!input.playerId || !input.name) {
    throw new Error("Player id and name are required.");
  }
  if (room.players.some(function hasPlayer(player) {
    return player.playerId === input.playerId;
  })) {
    throw new Error("Player already joined.");
  }

  room.players.push({
    playerId: input.playerId,
    name: input.name,
    seat: room.players.length + 1,
    isAlive: true,
    alignment: null,
    alignmentLabel: "未知",
    roleId: null,
    visibleRoleName: "未发牌",
  });
  touch(room);
  return room;
}

function assignRoles(room, script, options) {
  ensureLobby(room);
  if (!script) {
    throw new Error("Script data is required.");
  }
  if (room.players.length < script.minPlayers || room.players.length > script.maxPlayers) {
    throw new Error("Player count is not supported by this script.");
  }

  const rng = options && options.rng ? options.rng : Math.random;
  const roleMap = indexBy(script.roles, "id");
  const selectedRoleIds = options && options.roleIds
    ? options.roleIds.slice()
    : buildRoleBag(script, room.players.length, rng);

  if (selectedRoleIds.length !== room.players.length) {
    throw new Error("Role bag size must match player count.");
  }

  const shuffledRoles = shuffle(selectedRoleIds, rng);
  room.scriptId = script.id;
  room.scriptName = script.name;
  room.roleCatalog = cloneDeep(roleMap);
  room.players = room.players.map(function assign(player, index) {
    const role = roleMap[shuffledRoles[index]];
    if (!role) {
      throw new Error("Unknown role id: " + shuffledRoles[index]);
    }
    return {
      playerId: player.playerId,
      name: player.name,
      seat: player.seat,
      isAlive: true,
      alignment: role.alignment,
      alignmentLabel: role.alignmentLabel,
      roleId: role.id,
      visibleRoleName: role.name,
    };
  });

  room.privateStates = buildPrivateStates(room, script, rng);
  room.publicLog.push({
    logId: makeId("log"),
    title: "完成发牌",
    message: "已按 " + script.name + " 生成本局身份。",
    visibility: "public",
  });
  touch(room);
  return room;
}

function startGame(room, script) {
  if (!room.players.every(function hasRole(player) {
    return Boolean(player.roleId);
  })) {
    throw new Error("Cannot start game before assigning roles.");
  }
  room.status = ROOM_STATUS.IN_PROGRESS;
  room.statusLabel = "进行中";
  room.phase = PHASES.FIRST_NIGHT;
  room.phaseLabel = "首夜";
  room.day = 0;
  room.pendingNightQueue = buildNightQueue(room, script, PHASES.FIRST_NIGHT);
  room.publicLog.push({
    logId: makeId("log"),
    title: "游戏开始",
    message: "进入首夜，等待说书人按夜序推进。",
    visibility: "public",
  });
  touch(room);
  return room;
}

function advancePhase(room, script) {
  if (room.phase === PHASES.FIRST_NIGHT) {
    room.phase = PHASES.DAY;
    room.phaseLabel = "白天";
    room.day = 1;
    room.pendingNightQueue = [];
    room.publicLog.push({
      logId: makeId("log"),
      title: "天亮了",
      message: "进入第 1 天发言和提名阶段。",
      visibility: "public",
    });
  } else if (room.phase === PHASES.DAY) {
    room.phase = PHASES.NIGHT;
    room.phaseLabel = "夜晚";
    room.pendingNightQueue = buildNightQueue(room, script, PHASES.NIGHT);
    room.publicLog.push({
      logId: makeId("log"),
      title: "夜幕降临",
      message: "进入第 " + room.day + " 夜。",
      visibility: "public",
    });
  } else if (room.phase === PHASES.NIGHT) {
    room.phase = PHASES.DAY;
    room.phaseLabel = "白天";
    room.day += 1;
    room.pendingNightQueue = [];
    room.publicLog.push({
      logId: makeId("log"),
      title: "新的一天",
      message: "进入第 " + room.day + " 天。",
      visibility: "public",
    });
  } else {
    throw new Error("Phase transition is not supported from " + room.phase + ".");
  }
  touch(room);
  return room;
}

function submitNightAction(room, input) {
  if (!room.privateStates[input.playerId]) {
    throw new Error("Player private state not found.");
  }
  const action = {
    actionId: makeId("action"),
    playerId: input.playerId,
    intent: input.intent,
    targetIds: input.targetIds || [],
    notes: input.notes || "",
    phase: room.phase,
    createdAt: new Date().toISOString(),
  };
  room.actionLog.push(action);
  room.privateStates[input.playerId].actionHistory.push(action);
  touch(room);
  return action;
}

function recordNomination(room, input) {
  const nominator = requirePlayer(room, input.nominatorId);
  const target = requirePlayer(room, input.targetId);
  const nomination = {
    nominationId: makeId("nom"),
    nominatorId: nominator.playerId,
    nominatorName: nominator.name,
    targetId: target.playerId,
    targetName: target.name,
    voteCount: 0,
    passed: false,
    reason: input.reason || "",
  };
  room.nominations.push(nomination);
  room.publicLog.push({
    logId: makeId("log"),
    title: "发起提名",
    message: nominator.name + " 提名了 " + target.name + "。",
    visibility: "public",
  });
  touch(room);
  return nomination;
}

function resolveVote(room, input) {
  const nomination = room.nominations.find(function findNomination(candidate) {
    return candidate.nominationId === input.nominationId;
  });
  if (!nomination) {
    throw new Error("Nomination not found.");
  }
  nomination.voteCount = (input.voterIds || []).length;
  nomination.passed = nomination.voteCount > Math.floor(room.players.filter(function isAlive(player) {
    return player.isAlive;
  }).length / 2);

  room.publicLog.push({
    logId: makeId("log"),
    title: "投票结算",
    message: nomination.targetName + " 获得 " + nomination.voteCount + " 票，" + (nomination.passed ? "票数通过。" : "未过半。"),
    visibility: "public",
  });

  if (nomination.passed) {
    executePlayer(room, {
      playerId: nomination.targetId,
      reason: "execution",
    });
  }
  touch(room);
  return nomination;
}

function executePlayer(room, input) {
  const player = requirePlayer(room, input.playerId);
  player.isAlive = false;
  room.publicLog.push({
    logId: makeId("log"),
    title: "玩家死亡",
    message: player.name + " 因 " + input.reason + " 死亡。",
    visibility: "public",
  });
  touch(room);
  return player;
}

function getVisibleRoomState(room, options) {
  const viewerRole = options && options.viewerRole ? options.viewerRole : "player";
  const viewerId = options && options.viewerId ? options.viewerId : null;
  const next = cloneDeep(room);
  const roleMap = room.roleCatalog || {};

  next.players = next.players.map(function sanitizePlayer(player) {
    const role = roleMap[player.roleId] || {
      name: player.roleId || "未知身份",
      alignmentLabel: player.alignmentLabel || "未知",
    };
    const isSelf = viewerId && viewerId === player.playerId;
    if (viewerRole === "host") {
      return {
        playerId: player.playerId,
        seat: player.seat,
        name: player.name,
        isAlive: player.isAlive,
        alignment: player.alignment,
        alignmentLabel: role.alignmentLabel,
        roleId: player.roleId,
        visibleRoleName: role.name,
      };
    }
    return {
      playerId: player.playerId,
      seat: player.seat,
      name: player.name,
      isAlive: player.isAlive,
      alignment: null,
      alignmentLabel: "未知",
      roleId: isSelf ? (next.privateStates[player.playerId].displayRoleId) : null,
      visibleRoleName: isSelf ? (next.privateStates[player.playerId].displayRoleName) : "未知身份",
    };
  });

  if (viewerRole === "host") {
    Object.keys(next.privateStates).forEach(function eachPrivateState(playerId) {
      next.privateStates[playerId].actualRoleName = roleMap[next.privateStates[playerId].actualRoleId].name;
    });
  } else if (viewerId) {
    next.privateState = next.privateStates[viewerId] || null;
    delete next.privateStates;
  } else {
    delete next.privateStates;
  }

  return next;
}

function buildRoleBag(script, seatCount, rng) {
  const distribution = getSeatDistribution(script, seatCount);
  const townsfolk = script.roles.filter(function filterRole(role) {
    return role.roleType === ROLE_TYPES.TOWNSFOLK;
  }).map(function mapRole(role) {
    return role.id;
  });
  const outsiders = script.roles.filter(function filterRole(role) {
    return role.roleType === ROLE_TYPES.OUTSIDER;
  }).map(function mapRole(role) {
    return role.id;
  });
  const minions = sample(script.roles.filter(function filterRole(role) {
    return role.roleType === ROLE_TYPES.MINION;
  }).map(function mapRole(role) {
    return role.id;
  }), distribution.minions, rng);
  const demons = sample(script.roles.filter(function filterRole(role) {
    return role.roleType === ROLE_TYPES.DEMON;
  }).map(function mapRole(role) {
    return role.id;
  }), distribution.demons, rng);

  let outsiderCount = distribution.outsiders;
  let townsfolkCount = distribution.townsfolk;
  if (minions.indexOf("baron") !== -1) {
    outsiderCount += 2;
    townsfolkCount -= 2;
  }

  return []
    .concat(sample(townsfolk, townsfolkCount, rng))
    .concat(sample(outsiders, outsiderCount, rng))
    .concat(minions)
    .concat(demons);
}

function getSeatDistribution(script, seatCount) {
  const distribution = script.seatDistributions[String(seatCount)];
  if (!distribution) {
    throw new Error("Unsupported seat count: " + seatCount);
  }
  return distribution;
}

function buildPrivateStates(room, script, rng) {
  const roleMap = indexBy(script.roles, "id");
  const evilPlayers = room.players.filter(function filterPlayer(player) {
    return roleMap[player.roleId].alignment === ALIGNMENTS.EVIL;
  });
  const minions = evilPlayers.filter(function filterPlayer(player) {
    return roleMap[player.roleId].roleType === ROLE_TYPES.MINION;
  });
  const demon = evilPlayers.find(function findPlayer(player) {
    return roleMap[player.roleId].roleType === ROLE_TYPES.DEMON;
  });
  const redHerring = sample(
    room.players.filter(function filterPlayer(player) {
      return roleMap[player.roleId].alignment === ALIGNMENTS.GOOD;
    }).map(function mapPlayer(player) {
      return player.playerId;
    }),
    1,
    rng
  )[0];

  return room.players.reduce(function reducer(accumulator, player) {
    const role = roleMap[player.roleId];
    const privateState = {
      playerId: player.playerId,
      playerName: player.name,
      actualRoleId: role.id,
      displayRoleId: role.id,
      displayRoleName: role.name,
      alignment: role.alignment,
      alignmentLabel: role.alignmentLabel,
      nightMessages: [],
      knownPlayers: [],
      reminders: [],
      actionHistory: [],
      metadata: {},
    };

    if (role.id === "drunk") {
      const falseRole = sample(
        script.roles.filter(function filterCandidate(candidate) {
          return candidate.roleType === ROLE_TYPES.TOWNSFOLK;
        }).map(function mapCandidate(candidate) {
          return candidate.id;
        }),
        1,
        rng
      )[0];
      privateState.displayRoleId = falseRole;
      privateState.displayRoleName = roleMap[falseRole].name;
      privateState.reminders.push("你被视为镇民身份，但真实身份为醉鬼。");
    }

    if (role.roleType === ROLE_TYPES.MINION) {
      if (demon) {
        privateState.knownPlayers.push({
          playerId: demon.playerId,
          playerName: demon.name,
          reason: "恶魔",
          summary: "你知道恶魔是谁。",
        });
      }
      minions.filter(function filterPeer(peer) {
        return peer.playerId !== player.playerId;
      }).forEach(function eachPeer(peer) {
        privateState.knownPlayers.push({
          playerId: peer.playerId,
          playerName: peer.name,
          reason: "爪牙",
          summary: "你知道同阵营爪牙。",
        });
      });
    }

    if (role.roleType === ROLE_TYPES.DEMON) {
      minions.forEach(function eachMinion(peer) {
        privateState.knownPlayers.push({
          playerId: peer.playerId,
          playerName: peer.name,
          reason: "爪牙",
          summary: "你知道你的爪牙。",
        });
      });
    }

    appendRoleSpecificKnowledge(privateState, player, room.players, roleMap, redHerring, rng);
    accumulator[player.playerId] = privateState;
    return accumulator;
  }, {});
}

function appendRoleSpecificKnowledge(privateState, player, players, roleMap, redHerring, rng) {
  const role = roleMap[privateState.actualRoleId];

  if (role.id === "washerwoman") {
    const townsfolk = players.filter(function filterPlayer(candidate) {
      return roleMap[candidate.roleId].roleType === ROLE_TYPES.TOWNSFOLK;
    });
    const confirmed = sample(townsfolk, 1, rng)[0];
    const decoy = sample(players.filter(function filterPlayer(candidate) {
      return candidate.playerId !== confirmed.playerId;
    }), 1, rng)[0];
    privateState.nightMessages.push({
      messageId: makeId("msg"),
      title: "首夜信息",
      body: confirmed.name + " 或 " + decoy.name + " 之中有一位是 " + roleMap[confirmed.roleId].name + "。",
    });
  }

  if (role.id === "librarian") {
    const outsiders = players.filter(function filterPlayer(candidate) {
      return roleMap[candidate.roleId].roleType === ROLE_TYPES.OUTSIDER;
    });
    if (outsiders.length > 0) {
      const confirmed = sample(outsiders, 1, rng)[0];
      const decoy = sample(players.filter(function filterPlayer(candidate) {
        return candidate.playerId !== confirmed.playerId;
      }), 1, rng)[0];
      privateState.nightMessages.push({
        messageId: makeId("msg"),
        title: "首夜信息",
        body: confirmed.name + " 或 " + decoy.name + " 之中有一位是 " + roleMap[confirmed.roleId].name + "。",
      });
    } else {
      privateState.nightMessages.push({
        messageId: makeId("msg"),
        title: "首夜信息",
        body: "本局没有可以确认的外来者信息。",
      });
    }
  }

  if (role.id === "investigator") {
    const evilMinions = players.filter(function filterPlayer(candidate) {
      return roleMap[candidate.roleId].roleType === ROLE_TYPES.MINION;
    });
    const confirmed = sample(evilMinions, 1, rng)[0];
    const decoy = sample(players.filter(function filterPlayer(candidate) {
      return candidate.playerId !== confirmed.playerId;
    }), 1, rng)[0];
    privateState.nightMessages.push({
      messageId: makeId("msg"),
      title: "首夜信息",
      body: confirmed.name + " 或 " + decoy.name + " 之中有一位是 " + roleMap[confirmed.roleId].name + "。",
    });
  }

  if (role.id === "chef") {
    const count = countAdjacentPairs(players, function isEvil(candidate) {
      return roleMap[candidate.roleId].alignment === ALIGNMENTS.EVIL;
    });
    privateState.nightMessages.push({
      messageId: makeId("msg"),
      title: "首夜信息",
      body: "你得知了 " + count + " 对相邻的邪恶玩家。",
    });
  }

  if (role.id === "empath") {
    const neighbors = getNeighbors(players, player.playerId);
    const count = neighbors.filter(function isEvil(candidate) {
      return roleMap[candidate.roleId].alignment === ALIGNMENTS.EVIL;
    }).length;
    privateState.nightMessages.push({
      messageId: makeId("msg"),
      title: "夜间信息",
      body: "你的相邻玩家中有 " + count + " 位邪恶阵营。",
    });
  }

  if (role.id === "fortune_teller") {
    privateState.metadata.redHerringPlayerId = redHerring;
    privateState.reminders.push("本局已生成一个红鲱鱼目标。");
  }

  if (role.id === "baron") {
    privateState.reminders.push("你的存在让本局额外增加了 2 名外来者。");
  }

  if (role.id === "poisoner") {
    privateState.nightMessages.push({
      messageId: makeId("msg"),
      title: "每夜行动",
      body: "每晚选择一位玩家使其中毒，持续到次日黄昏。",
    });
  }

  if (role.id === "imp") {
    privateState.nightMessages.push({
      messageId: makeId("msg"),
      title: "每夜行动",
      body: "每晚选择一位玩家击杀；若你自杀，可能由猩红女巫接任。",
    });
  }
}

function buildNightQueue(room, script, phase) {
  const roleMap = indexBy(script.roles, "id");
  const orderKey = phase === PHASES.FIRST_NIGHT ? "firstNightOrder" : "otherNightOrder";

  return room.players
    .map(function mapPlayer(player) {
      const role = roleMap[player.roleId];
      return {
        queueId: makeId("queue"),
        playerId: player.playerId,
        playerName: player.name,
        roleId: role.id,
        roleName: role.name,
        order: role[orderKey],
        intentLabel: role.wakeLabel,
      };
    })
    .filter(function filterEntry(entry) {
      return typeof entry.order === "number";
    })
    .sort(function sortByOrder(left, right) {
      return left.order - right.order;
    });
}

function requirePlayer(room, playerId) {
  const player = room.players.find(function findPlayer(candidate) {
    return candidate.playerId === playerId;
  });
  if (!player) {
    throw new Error("Unknown player: " + playerId);
  }
  return player;
}

function ensureLobby(room) {
  if (room.status !== ROOM_STATUS.LOBBY) {
    throw new Error("Room can only be modified in lobby.");
  }
}

function touch(room) {
  room.metadata.lastUpdatedAt = new Date().toISOString();
}

module.exports = {
  createRoom,
  addPlayer,
  assignRoles,
  startGame,
  advancePhase,
  submitNightAction,
  recordNomination,
  resolveVote,
  executePlayer,
  getVisibleRoomState,
  buildRoleBag,
  getSeatDistribution,
};
