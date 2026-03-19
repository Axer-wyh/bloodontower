const cloud = require("wx-server-sdk");
const { applyRoomAction, buildRoomView } = require("../../packages/domain/src");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const rooms = db.collection("rooms");

exports.main = async function main(event) {
  const context = cloud.getWXContext();
  const actorId = context.OPENID;
  const roomId = event.roomId;
  const actionType = event.actionType || "advance_phase";
  const payload = event.payload || {};

  if (!roomId) {
    throw new Error("roomId is required.");
  }

  const snapshot = await rooms.doc(roomId).get();
  const room = snapshot.data;
  applyRoomAction(room, {
    actorId: actorId,
    actionType: actionType,
    payload: payload,
  });

  await rooms.doc(roomId).update({
    data: sanitizeForWrite(room),
  });

  return {
    ok: true,
    roomId: roomId,
    view: buildRoomView(room, {
      viewerId: actorId,
    }),
  };
};

function sanitizeForWrite(room) {
  const next = Object.assign({}, room);
  delete next._id;
  delete next._openid;
  return next;
}
