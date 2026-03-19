App({
  onLaunch: function onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true,
      });
    }
  },
  globalData: {
    appName: "血染钟楼",
  },
});
