const cloud = require("wx-server-sdk");
const { buildRoomView } = require("../../packages/domain/src");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const rooms = db.collection("rooms");

exports.main = async function main(event) {
  const context = cloud.getWXContext();
  const viewerId = context.OPENID;
  const roomId = event.roomId;

  if (!roomId) {
    throw new Error("roomId is required.");
  }

  const snapshot = await rooms.doc(roomId).get();
  const room = snapshot.data;

  return {
    ok: true,
    roomId: roomId,
    view: buildRoomView(room, {
      viewerId: viewerId,
    }),
  };
};

