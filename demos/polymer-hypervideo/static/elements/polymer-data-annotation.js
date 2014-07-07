'use strict';

Polymer('polymer-data-annotation', {
  created: function() {
  },
  ready: function() {
    var that = this;

    document.addEventListener('hypervideotimeupdate', function(e) {
      that.currentTime = e.detail.currentTime;
      if ((that.start <= that.currentTime) &&
          (that.currentTime < that.end)) {
        that.style.display = 'block';
      } else {
        that.style.display = 'none';
      }
    });
  }
});
