(function() {
  var video = document.querySelector('#video');

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
      source.src = videoSource.original_url;
      source.type = videoSource.type.replace(/\+/g, ' ').replace(/"/g, '\"');
      video.appendChild(source);
    }
  });

  video.addEventListener('canplaythrough', function() {
    var canvas = document.createElement('canvas');
    var currentTime = 0;
    var endTime = Math.floor(video.duration);
    var step = endTime / 10;
  }, false);
})();
