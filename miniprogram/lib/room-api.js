const CURRENT_ROOM_KEY = "bloodontower.currentRoomId";

function ensureCloud() {
  if (!wx.cloud) {
    throw new Error("当前基础库未启用云开发，请使用微信开发者工具打开并启用云开发环境。");
  }
}

function callFunction(name, data) {
  ensureCloud();
  return wx.cloud.callFunction({
    name: name,
    data: data || {},
  }).then(function resolve(result) {
    return result.result;
  });
}

function createRoom(input) {
  return callFunction("createRoom", input).then(function handle(result) {
    persistCurrentRoomId(result.roomId);
    return result;
  });
}

function joinRoom(input) {
  return callFunction("joinRoom", input).then(function handle(result) {
    persistCurrentRoomId(result.roomId);
    return result;
  });
}

function getRoomView(roomId) {
  return callFunction("getRoomView", {
    roomId: roomId,
  });
}

function runRoomAction(roomId, actionType, payload) {
  return callFunction("advanceRoom", {
    roomId: roomId,
    actionType: actionType,
    payload: payload || {},
  });
}

function persistCurrentRoomId(roomId) {
  wx.setStorageSync(CURRENT_ROOM_KEY, roomId);
}

function getCurrentRoomId() {
  return wx.getStorageSync(CURRENT_ROOM_KEY);
}

function clearCurrentRoomId() {
  wx.removeStorageSync(CURRENT_ROOM_KEY);
}

module.exports = {
  createRoom,
  joinRoom,
  getRoomView,
  runRoomAction,
  persistCurrentRoomId,
  getCurrentRoomId,
  clearCurrentRoomId,
};
