const store = require("../../lib/demo-store");

Page({
  data: {
    room: {},
    player: {},
  },
  onLoad: function onLoad() {
    const playerView = store.getPlayerView("p1");
    this.setData({
      room: playerView,
      player: playerView.privateState,
    });
  },
});

