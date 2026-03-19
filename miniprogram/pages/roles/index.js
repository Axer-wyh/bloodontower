const store = require("../../lib/demo-store");

Page({
  data: {
    roles: [],
  },
  onLoad: function onLoad() {
    this.setData({
      roles: store.getRoles(),
    });
  },
});

