const api = require("../../lib/room-api");

Page({
  data: {
    roomId: "",
    room: null,
    player: null,
    error: "",
    loading: false,
    actionIntent: "custom",
    actionTargetSeats: "",
    actionNotes: "",
    nominationTargetSeat: "",
    nominationReason: "",
  },
  onLoad: function onLoad(options) {
    const roomId = options.roomId || api.getCurrentRoomId() || "";
    this.setData({ roomId: roomId });
    if (roomId) {
      this.refreshRoom();
      this.startPolling();
    }
  },
  onUnload: function onUnload() {
    this.stopPolling();
  },
  startPolling: function startPolling() {
    const that = this;
    this.stopPolling();
    this.poller = setInterval(function poll() {
      if (that.data.roomId) {
        that.refreshRoom();
      }
    }, 5000);
  },
  stopPolling: function stopPolling() {
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = null;
    }
  },
  updateField: function updateField(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [field]: event.detail.value,
    });
  },
  refreshRoom: function refreshRoom() {
    const that = this;
    if (!this.data.roomId) {
      return Promise.resolve();
    }
    return api.getRoomView(this.data.roomId).then(function handle(result) {
      that.setData({
        room: result.view.room,
        player: result.view.room.privateState || null,
        error: "",
      });
    }).catch(function handleError(error) {
      that.setData({
        error: error.message || "加载玩家视图失败",
      });
    });
  },
  submitNightAction: function submitNightAction() {
    if (!this.data.player) {
      this.setData({ error: "当前账号还不是房间内玩家。" });
      return;
    }
    const targetIds = parseSeats(this.data.actionTargetSeats, this.data.room);
    return this.runAction("submit_night_action", {
      playerId: this.data.player.playerId,
      intent: this.data.actionIntent,
      targetIds: targetIds,
      notes: this.data.actionNotes,
    });
  },
  createNomination: function createNomination() {
    if (!this.data.player) {
      this.setData({ error: "当前账号还不是房间内玩家。" });
      return;
    }
    const targetIds = parseSeats(this.data.nominationTargetSeat, this.data.room);
    if (targetIds.length !== 1) {
      this.setData({ error: "提名目标席位无效。" });
      return;
    }
    return this.runAction("record_nomination", {
      nominatorId: this.data.player.playerId,
      targetId: targetIds[0],
      reason: this.data.nominationReason,
    });
  },
  runAction: function runAction(actionType, payload) {
    const that = this;
    this.setData({ loading: true, error: "" });
    return api.runRoomAction(this.data.roomId, actionType, payload).then(function handle(result) {
      that.setData({
        room: result.view.room,
        player: result.view.room.privateState || null,
      });
      wx.showToast({
        title: "已提交",
        icon: "success",
      });
    }).catch(function handleError(error) {
      that.setData({
        error: error.message || "提交失败",
      });
    }).finally(function done() {
      that.setData({ loading: false });
    });
  },
});

function parseSeats(input, room) {
  if (!input || !room || !room.players) {
    return [];
  }
  return input
    .split(",")
    .map(function trim(value) {
      return Number(value.trim());
    })
    .filter(function filterValue(value) {
      return !Number.isNaN(value);
    })
    .map(function mapSeat(seat) {
      const player = room.players.find(function findPlayer(candidate) {
        return Number(candidate.seat) === seat;
      });
      return player ? player.playerId : null;
    })
    .filter(Boolean);
}
