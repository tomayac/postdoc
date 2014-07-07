'use strict';

Polymer('polymer-track-chapters', {
  created: function() {
  },
  ready: function() {
    var that = this;

    that.fire(
      'trackready',
      {
        src: that.src,
        kind: 'chapters'
      }
    );
/*

    // creates the chapters table of contents
    var createChaptersToc = function() {
      var CORS_PROXY = document.location.href + 'cors/';
      var chapters = that.querySelector('polymer-chapters');
      chapters.addEventListener('click', function(e) {
        var current = e.target;
        while (current.nodeName !== 'LI') {
          current = current.parentNode;
        }
        video.currentTime = current.dataset.start;
        video.play();
      }, false);

      var canvas = document.createElement('canvas');
      canvas.style.display = 'none';
      canvas.width = video.width;
      canvas.height = video.height;
      container.appendChild(canvas);
      var ctx = canvas.getContext('2d');




      video.addEventListener('loadedmetadata', function() {
        var tracks = video.textTracks || video.querySelectorAll('track');
        for (var i = 0, lenI = tracks.length; i < lenI; i++) {
          var track = tracks[i];
          (function(innerTrack) {
            if (innerTrack.kind === 'chapters') {
              innerTrack.mode = 'hidden';
              if (!innerTrack.cues) {
                innerTrack.addEventListener('load', function(e) {
                  return readChapterCues(e.target.cues);
                });
              } else {
                setTimeout(function() {
                  return readChapterCues(innerTrack.cues);
                }, 2000);
              }
            } else if (innerTrack.kind === 'subtitles') {
            }
          })(track);
        }
      }, false);

      var getStillFrame = function(cue, callback) {
        var time = cue.startTime;
        var text = cue.text;
        if (time > video.duration) {
          return callback('Requested time greater than video duration');
        }
        video.currentTime = time;
        setTimeout(function() {
          ctx.drawImage(video, 0, 0, video.clientWidth, video.clientHeight);
          var img = document.createElement('img');
          img.setAttribute('class', 'hypervideo');
          var url = canvas.toDataURL();
          img.src = url;
          return callback(null, img, text);
        }, 1000);
      };

      var displayStillFrame = function(img, text, start, end) {
        var li = document.createElement('li');
        li.dataset.start = start;
        li.dataset.end = end;
        var figure = document.createElement('figure');
        li.appendChild(figure);
        figure.appendChild(img);
        var figcaption = document.createElement('figcaption');
        figcaption.textContent = text;
        figure.appendChild(figcaption);
        chapters.shadowRoot.querySelector('ul').appendChild(li);
      };
    };

    document.addEventListener('hypervideotimeupdate', function(e) {
      var thumbnails = chapters.querySelectorAll('li');
      for (var i = 0, lenI = thumbnails.length; i < lenI; i++) {
        var thumbnail = thumbnails[i];
        var start = thumbnail.dataset.start;
        var end = thumbnail.dataset.end;
        if (start <= currentTime && currentTime < end) {
          thumbnail.classList.add('current');
        } else {
          thumbnail.classList.remove('current');
        }
      }
    }, false);
*/
  }

});