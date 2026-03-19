const api = require("../../lib/room-api");

Page({
  data: {
    roomId: "",
    room: null,
    aiContext: {},
    loading: false,
    error: "",
    nominationNominatorSeat: "",
    nominationTargetSeat: "",
    nominationReason: "",
    voteSeats: "",
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
        aiContext: result.view.aiContext || {},
        error: "",
      });
    }).catch(function handleError(error) {
      that.setData({
        error: error.message || "加载主持台失败",
      });
    });
  },
  runAction: function runAction(actionType, payload) {
    const that = this;
    this.setData({ loading: true, error: "" });
    return api.runRoomAction(this.data.roomId, actionType, payload).then(function handle(result) {
      that.setData({
        room: result.view.room,
        aiContext: result.view.aiContext || {},
      });
    }).catch(function handleError(error) {
      that.setData({
        error: error.message || "主持动作执行失败",
      });
    }).finally(function done() {
      that.setData({ loading: false });
    });
  },
  startGame: function startGame() {
    return this.runAction("assign_roles_and_start");
  },
  advancePhase: function advancePhase() {
    return this.runAction("advance_phase");
  },
  createNomination: function createNomination() {
    const room = this.data.room;
    const nominator = findPlayerBySeat(room, this.data.nominationNominatorSeat);
    const target = findPlayerBySeat(room, this.data.nominationTargetSeat);
    if (!nominator || !target) {
      this.setData({ error: "提名席位无效。" });
      return;
    }
    return this.runAction("record_nomination", {
      nominatorId: nominator.playerId,
      targetId: target.playerId,
      reason: this.data.nominationReason,
    });
  },
  resolveVote: function resolveVote(event) {
    const nominationId = event.currentTarget.dataset.nominationId;
    const room = this.data.room;
    const voterIds = this.data.voteSeats
      .split(",")
      .map(function trim(value) {
        return Number(value.trim());
      })
      .filter(function filterValue(value) {
        return !Number.isNaN(value);
      })
      .map(function mapSeat(seat) {
        const player = findPlayerBySeat(room, seat);
        return player ? player.playerId : null;
      })
      .filter(Boolean);
    return this.runAction("resolve_vote", {
      nominationId: nominationId,
      voterIds: voterIds,
    });
  },
});

function findPlayerBySeat(room, seatValue) {
  const seat = Number(seatValue);
  if (!room || Number.isNaN(seat)) {
    return null;
  }
  return room.players.find(function findPlayer(player) {
    return Number(player.seat) === seat;
  }) || null;
}
