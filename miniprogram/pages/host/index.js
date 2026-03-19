const store = require("../../lib/demo-store");

Page({
  data: {
    room: {},
    aiContext: {},
  },
  onLoad: function onLoad() {
    this.setData({
      room: store.getHostView(),
      aiContext: store.getAIContext(),
    });
  },
});

