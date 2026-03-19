const { addPlayer } = require("../../packages/domain/src");

exports.main = async function main(event) {
  const room = event.room;
  addPlayer(room, {
    playerId: event.playerId,
    name: event.name,
  });

  return {
    ok: true,
    room,
  };
};

