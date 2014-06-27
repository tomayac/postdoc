'use strict';

Polymer('polymer-actor', {
  created: function() {
  },
  ready: function() {
    var that = this;
    var container = that.$.container;
    if (that.url && that.name) {
      container.innerHTML = '<a href="' + that.url + '">' +
          that.name + '</a>';
    } else if (that.name) {
      container.innerHTML = that.name;
    } else if (that.url) {
      container.innerHTML = that.url;
    }
    container.style.display = 'none';

    document.addEventListener('hypervideoinnerhtmlupdate', function(e) {
      var data = e.detail;
      if (that.xywh && /\d+,\d+,\d+,\d+/.test(that.xywh)) {
        var components = that.xywh.split(',');
        var xywh = document.createElement('div');
        container.appendChild(xywh);
        xywh.classList.add('xywh');
        var offsetLeft = data.actorsOffset.left;
        var offsetTop = data.actorsOffset.top;
        xywh.style.left = (components[0] - offsetLeft) + 'px';
        xywh.style.top = (components[1] - offsetTop) + 'px';
        xywh.style.width = components[2] + 'px';
        xywh.style.height = components[3] + 'px';
      }
    });

    // listen for the parent hypervideo's timeupdate events and toggle the
    // overlay's visibility accordingly to its start and end
    document.addEventListener('hypervideotimeupdate', function(e) {
      that.currentTime = e.detail.currentTime;
      if ((that.start <= that.currentTime) &&
          (that.currentTime < that.end)) {
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    });
  }
});