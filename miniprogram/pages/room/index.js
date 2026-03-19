const store = require("../../lib/demo-store");

Page({
  data: {
    room: {},
  },
  onLoad: function onLoad() {
    this.setData({
      room: store.getHostView(),
    });
  },
});

