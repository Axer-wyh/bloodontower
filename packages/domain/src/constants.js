const ALIGNMENTS = {
  GOOD: "good",
  EVIL: "evil",
};

const ROLE_TYPES = {
  TOWNSFOLK: "townsfolk",
  OUTSIDER: "outsider",
  MINION: "minion",
  DEMON: "demon",
  TRAVELER: "traveler",
};

const ROOM_STATUS = {
  LOBBY: "lobby",
  IN_PROGRESS: "in_progress",
  FINISHED: "finished",
};

const PHASES = {
  LOBBY: "lobby",
  FIRST_NIGHT: "first_night",
  DAY: "day",
  NIGHT: "night",
  ENDED: "ended",
};

const AI_HOST_INTENTS = [
  "announce",
  "prompt_action",
  "request_confirmation",
  "explain_rule",
  "resolve_action",
  "pause_game",
];

module.exports = {
  ALIGNMENTS,
  ROLE_TYPES,
  ROOM_STATUS,
  PHASES,
  AI_HOST_INTENTS,
};

