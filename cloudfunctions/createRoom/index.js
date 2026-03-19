const cloud = require("wx-server-sdk");
const { createManagedRoom } = require("../../packages/domain/src");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const rooms = db.collection("rooms");

exports.main = async function main(event) {
  const context = cloud.getWXContext();
  const hostId = context.OPENID;
  const hostName = event.hostName || "说书人";
  const scriptId = event.scriptId || "trouble_brewing";
  const seatCount = Number(event.seatCount || 7);

  const room = createManagedRoom({
    hostId: hostId,
    hostName: hostName,
    scriptId: scriptId,
    seatCount: seatCount,
  });

  await rooms.doc(room.roomId).set({
    data: room,
  });

  return {
    ok: true,
    roomId: room.roomId,
    room: room,
  };
};

