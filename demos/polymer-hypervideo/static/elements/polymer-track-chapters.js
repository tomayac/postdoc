'use strict';

Polymer('polymer-track-chapters', {
  created: function() {
  },
  ready: function() {
    var that = this;
    var container = that.$.container;
    var hyperVideoLoadedMetadata = false;
    var cuesElements = [];
    var cueData;
    var cuesRead = false;
    that.displaychaptersthumbnails = true;

    that.fire(
      'trackready',
      {
        src: that.src,
        kind: 'chapters'
      }
    );

    document.addEventListener('hypervideoloadedmetadata', function() {
      hyperVideoLoadedMetadata = true;
      if ((that.displaychaptersthumbnails) &&
          (hyperVideoLoadedMetadata) &&
          (cuesRead)) {
        displayChaptersThumbnails(cueData);
      }
    });

    document.addEventListener('cuesread', function(e) {
      cuesRead = true;
      var data = e.detail;
      if (data.kind !== 'chapters') {
        return;
      }
      cueData = data.cueData;
      if ((that.displaychaptersthumbnails) &&
          (hyperVideoLoadedMetadata) &&
          (cuesRead)) {
        displayChaptersThumbnails(cueData);
      }
    });

    var displayChaptersThumbnails = function(cues) {
      that.fire(
        'requeststillframes',
        {
          cues: cues
        }
      );
    };

    document.addEventListener('receivestillframe', function(e) {
      var data = e.detail;
      var img = data.img;
      var text = data.text;
      var start = data.start;
      var end = data.end;
      var li = document.createElement('li');
      cuesElements.push(li);
      li.dataset.start = start;
      li.dataset.end = end;
      var figure = document.createElement('figure');
      li.appendChild(figure);
      figure.appendChild(img);
      var figcaption = document.createElement('figcaption');
      figcaption.textContent = text;
      figure.appendChild(figcaption);
      container.appendChild(li);
    });

    container.addEventListener('click', function(e) {
      var current = e.target;
      if (current === container) {
        return;
      }
      while (current.nodeName !== 'LI') {
        current = current.parentNode;
      }
      that.fire(
        'currenttimeupdate',
        {
          currentTime: current.dataset.start
        }
      );
    });

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