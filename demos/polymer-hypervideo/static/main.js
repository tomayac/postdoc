'use strict';

(function() {

  var CORS_PROXY = 'http://localhost:5001/';

  var video = document.querySelector('#video');
  var chapters = document.querySelector('#chapters');
  chapters.addEventListener('click', function(e) {
    var current = e.target;
    while (current.nodeName !== 'LI') {
      current = current.parentNode;
    }
    video.currentTime = current.dataset.start;
  }, false);

  var canvas = document.createElement('canvas');
  canvas.style.display = 'none';
  canvas.width = video.width;
  canvas.height = video.height;
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  function getYouTubeHtml5VideoUrl(videoId, callback) {

    var decodeQueryString = function(queryString) {
      var key, keyValPair, keyValPairs, r, val, _i, _len;
      r = {};
      keyValPairs = queryString.split('&');
      for (_i = 0, _len = keyValPairs.length; _i < _len; _i++) {
        keyValPair = keyValPairs[_i];
        key = decodeURIComponent(keyValPair.split('=')[0]);
        val = decodeURIComponent(keyValPair.split('=')[1] || '');
        r[key] = val;
      }
      return r;
    };

    var decodeStreamMap = function(url_encoded_fmt_stream_map) {
      var quality, sources, stream, type, urlEncodedStream, _i, _len, _ref;
      sources = {};
      _ref = url_encoded_fmt_stream_map.split(',');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        urlEncodedStream = _ref[_i];
        if (!urlEncodedStream) {
          return false;
        }
        stream = decodeQueryString(urlEncodedStream);
        type = stream.type.split(';')[0];
        quality = stream.quality.split(',')[0];
        stream.original_url = stream.url;
        stream.url = '' + stream.url + '&signature=' + stream.sig;
        sources['' + type + ' ' + quality] = stream;
      }
      return sources;
    };

    // Translate to HTML5 video URL, try at least
    var  url = CORS_PROXY + 'www.youtube.com/get_video_info?video_id=' +
        videoId
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var video = decodeQueryString(xhr.responseText);
        // video.live_playback is '1' for Hangouts on Air
        if (video.status === 'fail' || video.live_playback) {
          return callback(false);
        }
        if (!video.url_encoded_fmt_stream_map) {
          return callback(false);
        }
        video.sources = decodeStreamMap(video.url_encoded_fmt_stream_map);
        if (!video.sources) {
          return callback(false);
        }
        return callback(video.sources);
      }
    }
    xhr.open('GET', url, true);
    xhr.send();
  }

  getYouTubeHtml5VideoUrl('m2ml0oAwWBE', function(videoSources) {
    for (var videoSource in videoSources) {
      videoSource = videoSources[videoSource];
      var source = document.createElement('source');
      source.src = CORS_PROXY + videoSource.original_url
          .replace(/^https?:\/\//, '');
      source.type = videoSource.type.replace(/\+/g, ' ').replace(/"/g, '\"');
      video.appendChild(source);
      video.crossOrigin = 'Anonymous';
    }
  });

  video.addEventListener('loadedmetadata', function() {
    console.log('loadedmetadata');
    var tracks = video.textTracks || video.querySelectorAll('track');
    for (var i = 0, lenI = tracks.length; i < lenI; i++) {
      var track = tracks[i];
      if (track.kind = 'chapters') {
        track.mode = 'hidden';
        if (!track.cues) {
          console.log('Track not loaded yet, adding load listener');
          track.addEventListener('load', function(e) {
            console.log('Track finally loaded, reading cues');
            return readChapterCues(e.target.cues);
          });
        } else {
          setTimeout(function() {
            console.log('Track loaded, reading cues');
            return readChapterCues(track.cues);
          }, 2000);
        }
      }
    }

  }, false);

  function readChapterCues(cues) {
    for (var i = 0, lenI = cues.length; i < lenI; i++) {
      var cue = cues.item(i);
      (function(innerCue) {
        setTimeout(function() {
          getStillFrame(innerCue, function(err, img, text) {
            displayStillFrame(img, text, innerCue.startTime);
          });
        }, 2000 * i);
      })(cue);
    }
  }

  function getStillFrame(cue, callback) {
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
  }

  function displayStillFrame(img, text, start) {
    var li = document.createElement('li');
    li.dataset.start = start;
    var figure = document.createElement('figure');
    li.appendChild(figure);
    figure.appendChild(img);
    var figcaption = document.createElement('figcaption');
    figcaption.textContent = text;
    figure.appendChild(figcaption);
    chapters.appendChild(li);
  }
})();
