const store = require("../../lib/demo-store");

Page({
  data: {
    script: {},
  },
  onLoad: function onLoad() {
    this.setData({
      script: store.getScript(),
    });
  },
});

