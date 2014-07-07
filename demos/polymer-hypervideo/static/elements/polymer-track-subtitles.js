'use strict';

Polymer('polymer-track-subtitles', {
  created: function() {
  },
  ready: function() {
    var that = this;
    var container = that.$.container;
    var cuesElements = [];

    that.fire(
      'trackready',
      {
        src: that.src,
        kind: 'subtitles'
      }
    );

    document.addEventListener('cuesread', function(e) {
      var data = e.detail;
      if (that.displaysubtitlesgroup && data.kind === 'subtitles') {
        displaySubtitlesGroup(data.cueData);
      }
    });

    var displaySubtitlesGroup = function(cues) {
      var tempDiv = document.createElement('div');
      cues.forEach(function(cue) {
        var span = document.createElement('span');
        span.dataset.start = cue.start;
        span.dataset.end = cue.end;
        tempDiv.innerHTML = cue.text + ' ';
        span.textContent = tempDiv.textContent;
        container.appendChild(span);
        cuesElements.push(span);
      });
    };

    container.addEventListener('click', function(e) {
      var current = e.target;
      if (current === container) {
        return;
      }
      while (current.nodeName !== 'SPAN') {
        current = current.parentNode;
      }
      that.fire(
        'currenttimeupdate',
        {
          currentTime: current.dataset.start
        }
      );
    }, false);

    document.addEventListener('hypervideotimeupdate', function(e) {
      var currentTime = e.detail.currentTime;
      for (var i = 0, lenI = cuesElements.length; i < lenI; i++) {
        var cue = cuesElements[i];
        var start = cue.dataset.start;
        var end = cue.dataset.end;
        if (start <= currentTime && currentTime < end) {
          cue.classList.add('current');
        } else {
          cue.classList.remove('current');
        }
      }
    }, false);
  }
});