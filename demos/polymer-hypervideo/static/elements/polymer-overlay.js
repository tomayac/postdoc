'use strict';

Polymer('polymer-overlay', {
  created: function() {
  },
  ready: function() {
    this.$.container.innerHTML = this.innerHTML.trim();
    this.$.container.style.display = 'none';

    // listen for the parent hypervideo's timeupdate events and toggle the
    // overlay's visibility accordingly to its start and end
    var that = this;
    document.addEventListener('hypervideotimeupdate', function(e) {
      that.currentTime = e.detail.currentTime;
      if ((that.start <= that.currentTime) &&
          (that.currentTime < that.end)) {
        that.$.container.style.display = 'block';
      } else {
        that.$.container.style.display = 'none';
      }
    });
  }
});
