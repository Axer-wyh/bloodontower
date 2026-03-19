const { advancePhase, startGame } = require("../../packages/domain/src");
const { troubleBrewing } = require("../../packages/rules-data/src");

exports.main = async function main(event) {
  const room = event.room;

  if (event.action === "start") {
    startGame(room, troubleBrewing);
  } else {
    advancePhase(room, troubleBrewing);
  }

  return {
    ok: true,
    room,
  };
};

