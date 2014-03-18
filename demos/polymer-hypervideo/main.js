(function() {
  var video = document.querySelector('#video');
  var canvas = document.createElement('canvas');
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
    var  url = 'https://cors-anywhere.herokuapp.com/' +
        'www.youtube.com/get_video_info?video_id=' + videoId
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
      source.src = 'http://127.0.0.1:9292/' + videoSource.original_url.replace(/^https?:\/\//, '');
      source.type = videoSource.type.replace(/\+/g, ' ').replace(/"/g, '\"');
      video.appendChild(source);
      video.crossOrigin = 'Anonymous';
    }
  });

  video.addEventListener('loadedmetadata', function() {
    console.log('loadedmetadata');
    var endTime = Math.floor(video.duration);
    var step = endTime / 10;
    drawImage(step);
  }, false);

  function drawImage(step) {
    if (video.currentTime >= video.duration) {
      console.log('through');
      return false;
    }
    video.currentTime = video.currentTime + step;
    console.log(video.currentTime + ' ' + step);
    ctx.drawImage(video, 0, 0, video.clientWidth, video.clientHeight);
    var url = canvas.toDataURL();
    var img = document.createElement('img');
    img.src = url;
    document.body.appendChild(img);
    setTimeout(function() {
      drawImage(step);
    }, 2000);
  }

})();
