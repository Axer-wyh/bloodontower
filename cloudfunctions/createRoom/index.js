const { createRoom } = require("../../packages/domain/src");

exports.main = async function main(event) {
  const room = createRoom({
    hostId: event.hostId,
    hostName: event.hostName,
    scriptId: event.scriptId,
    seatCount: event.seatCount,
  });

  return {
    ok: true,
    room,
  };
};

