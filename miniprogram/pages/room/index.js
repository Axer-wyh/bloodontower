const api = require("../../lib/room-api");

Page({
  data: {
    hostName: "说书人",
    joinName: "玩家",
    seatCount: 7,
    roomIdInput: "",
    currentRoomId: "",
    room: null,
    viewerRole: "public",
    permissions: {},
    loading: false,
    error: "",
  },
  onLoad: function onLoad(options) {
    const roomId = options.roomId || api.getCurrentRoomId() || "";
    this.setData({
      currentRoomId: roomId,
      roomIdInput: roomId,
    });
    if (roomId) {
      this.refreshRoom();
      this.startPolling();
    }
  },
  onUnload: function onUnload() {
    this.stopPolling();
  },
  onPullDownRefresh: function onPullDownRefresh() {
    this.refreshRoom().finally(function done() {
      wx.stopPullDownRefresh();
    });
  },
  startPolling: function startPolling() {
    const that = this;
    this.stopPolling();
    this.poller = setInterval(function poll() {
      if (that.data.currentRoomId) {
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
  createRoom: function createRoom() {
    const that = this;
    this.setData({ loading: true, error: "" });
    api.createRoom({
      hostName: this.data.hostName,
      seatCount: Number(this.data.seatCount),
      scriptId: "trouble_brewing",
    }).then(function handle(result) {
      that.setData({
        currentRoomId: result.roomId,
        roomIdInput: result.roomId,
      });
      wx.showToast({
        title: "房间已创建",
        icon: "success",
      });
      that.startPolling();
      return that.refreshRoom();
    }).catch(function handleError(error) {
      that.setData({
        error: error.message || "创建房间失败",
      });
    }).finally(function done() {
      that.setData({ loading: false });
    });
  },
  joinRoom: function joinRoom() {
    const that = this;
    this.setData({ loading: true, error: "" });
    api.joinRoom({
      roomId: this.data.roomIdInput,
      name: this.data.joinName,
    }).then(function handle(result) {
      that.setData({
        currentRoomId: result.roomId,
        viewerRole: result.view.viewerRole,
        room: result.view.room,
        permissions: result.view.permissions,
      });
      wx.showToast({
        title: "已加入房间",
        icon: "success",
      });
      that.startPolling();
    }).catch(function handleError(error) {
      that.setData({
        error: error.message || "加入房间失败",
      });
    }).finally(function done() {
      that.setData({ loading: false });
    });
  },
  refreshRoom: function refreshRoom() {
    const that = this;
    if (!this.data.currentRoomId) {
      return Promise.resolve();
    }
    return api.getRoomView(this.data.currentRoomId).then(function handle(result) {
      that.setData({
        room: result.view.room,
        viewerRole: result.view.viewerRole,
        permissions: result.view.permissions,
        error: "",
      });
    }).catch(function handleError(error) {
      that.setData({
        error: error.message || "读取房间失败",
      });
    });
  },
  openHostPanel: function openHostPanel() {
    wx.navigateTo({
      url: "/pages/host/index?roomId=" + this.data.currentRoomId,
    });
  },
  openPlayerPanel: function openPlayerPanel() {
    wx.navigateTo({
      url: "/pages/player/index?roomId=" + this.data.currentRoomId,
    });
  },
});
