'use strict';

Polymer('polymer-hypervideo', {
  publish: {
    currentTime: 0,
    duration: 0,
    chaptersData: [],
    height: 0,
    width: 0,
    actorsOffset: {}
  },
  currentTimeChanged: function(oldTime, currentTime) {
    var chapters = this.$.chapters;
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

    var subtitles = this.$.subtitles;
    var subtitleCues = subtitles.querySelectorAll('span');
    for (var i = 0, lenI = subtitleCues.length; i < lenI; i++) {
      var subtitleCue = subtitleCues[i];
      var start = subtitleCue.dataset.start;
      var end = subtitleCue.dataset.end;
      if (start <= currentTime && currentTime < end) {
        subtitleCue.classList.add('current');
      } else {
        subtitleCue.classList.remove('current');
      }
    }
  },
  created: function() {
  },
  ready: function() {
    var that = this;

    document.addEventListener('webcomponentstocready', function() {
      // get all child <polymer-*> child nodes
      var treeWalker = document.createTreeWalker(
        that,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: function(node) {
            return /^polymer-/gi.test(node.nodeName) ?
                NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        },
        false
      );
      var webComponents = [];
      while(treeWalker.nextNode()) {
        webComponents.push(treeWalker.currentNode);
      }
console.log('fire')
      that.fire(
        'webcomponentstoc',
        {
          webComponentsToC: webComponents
        }
      );
    }, false);

    // listen for subtitles
    that.subtitles = false;
    that.displaySubtitlesGroup = false;
    document.addEventListener('subtitlesfound', function(e) {
      var data = e.detail;
      that.subtitles = data.src;
      that.displaySubtitlesGroup = data.displaySubtitlesGroup === 'true' ?
          true : false;
      if (that.subtitles) {
        createSubtitlesGroup();
      }
    });

    // listen for chapters
    that.chapters = false;
    that.displayChaptersThumbnails = false;
    document.addEventListener('chaptersfound', function(e) {
      var data = e.detail;
      that.chapters = data.src;
      that.displayChaptersThumbnails =
          data.displayChaptersThumbnails === 'true' ? true : false;
      if (that.chapters) {
        createChaptersToc();
      }
    });

    // initialize the video
    var video = that.$.hypervideo;
    if (that.src) {
      that.src.split(/\s/g).forEach(function(src) {
        var source = document.createElement('source');
        source.src = src;
        video.appendChild(source);
      });
    }
    video.height = that.height || video.offsetHeight;
    video.width = that.width || video.offsetWidth;
    if (that.poster) {
      video.poster = that.poster;
    }
    var container = that.$.wrapper;

    // show spinner while the hypervideo gets prepared
    var splashDiv = document.createElement('div');
    splashDiv.setAttribute('class', 'spinner');
    var splashSpinner = document.createElement('div');
    splashSpinner.setAttribute('class', 'progress');
    splashDiv.appendChild(splashSpinner);
    splashDiv.style.width = video.width + 'px';
    splashDiv.style.height = video.height + 'px';
    splashDiv.style.position = 'absolute';
    splashDiv.style.top = video.offsetTop + 'px';
    splashDiv.style.left = video.offsetLeft + 'px';
    splashSpinner.style.position = 'relative';
    splashSpinner.style.top = (video.offsetHeight / 2 - 60 / 2) + 'px';
    splashSpinner.style.left = (video.offsetWidth / 2 - 60 / 2) + 'px';
    var loadingDiv = document.createElement('div');
    loadingDiv.textContent = 'Loading';
    splashSpinner.appendChild(loadingDiv);
    container.appendChild(splashDiv);

    // display the overlays and place them on top of the video
    var overlays = that.$.overlays;
    var polymerOverlays = that.querySelectorAll('polymer-overlay');
    for (var i = 0, lenI = polymerOverlays.length; i < lenI; i++) {
      overlays.appendChild(polymerOverlays[i]);
    }
    overlays.style.position = 'absolute';
    overlays.style.top = (video.offsetTop + 0.75 * video.offsetHeight) +
        'px';
    overlays.style.left = (video.offsetLeft + (0.05 * that.width)) + 'px';
    overlays.style.width = (0.9 * that.width) + 'px';

    // display the actors and place them on top of the video
    var actors = that.$.actors;
    var polymerActors = that.querySelectorAll('polymer-actor');
    for (var i = 0, lenI = polymerActors.length; i < lenI; i++) {
      actors.appendChild(polymerActors[i]);
    }
    actors.style.position = 'absolute';
    actors.style.top = (video.offsetTop + 0.25 * video.offsetHeight) +
        'px';
    actors.style.left = (video.offsetLeft + (0.05 * that.width)) + 'px';
    actors.style.width = (0.9 * that.width) + 'px';

    // display the timelines
    var timelines = that.$.timelines;
    var polymerTimelines = that.querySelectorAll('polymer-timeline');
    for (var i = 0, lenI = polymerTimelines.length; i < lenI; i++) {
      timelines.appendChild(polymerTimelines[i]);
    }

    // listen for events coming from the timeline component
    document.addEventListener('currenttimeupdate', function(e) {
      var data = e.detail;
      video.currentTime = data.currentTime;
      video.play();
    }, false);

    video.addEventListener('loadedmetadata', function() {
      that.duration = video.duration;
      // adjust the timeline dimensions according to the video duration
      timelines.style.left = (video.offsetLeft + (0.05 * that.width)) + 'px';
      that.fire(
        'hypervideoinnerhtmlupdate',
        {
          overlays: overlays.innerHTML,
          actors: actors.innerHTML,
          duration: that.duration,
          height: that.height,
          width: that.width,
          actorsOffset: {
            left: actors.offsetLeft,
            top: actors.offsetTop
          }
        }
      );
    });

    // publish timeupdate events
    video.addEventListener('timeupdate', function() {
      that.currentTime = video.currentTime;
      that.fire(
        'hypervideotimeupdate',
        {
          currentTime: that.currentTime
        }
      );
    }, false);

    // create the captions
    if (that.captions) {
      var track = document.createElement('track');
      track.src = that.captions;
      track.kind = 'captions';
      track.srclang = 'en';
      video.appendChild(track);
    }

    // create the subtitles
    var createSubtitlesGroup = function() {
      var track = document.createElement('track');
      track.src = that.subtitles;
      track.kind = 'subtitles';
      track.srclang = 'en';
      video.appendChild(track);

      if (that.displaySubtitlesGroup) {
        var subtitles = that.$.subtitles;
        subtitles.addEventListener('click', function(e) {
          var current = e.target;
          if (current === subtitles) {
            return;
          }
          while (current.nodeName !== 'SPAN') {
            current = current.parentNode;
          }
          video.currentTime = current.dataset.start;
          video.play();
        }, false);

        subtitles.addEventListener('mouseover', function(e) {
          var current = e.target;
          if (current === subtitles) {
            return;
          }
          while (current.nodeName !== 'SPAN') {
            current = current.parentNode;

          }
          current.classList.add('subtitlesMouseover');
        }, false);

        subtitles.addEventListener('mouseout', function(e) {
          var current = e.target;
          if (current === subtitles) {
            return;
          }
          while (current.nodeName !== 'SPAN') {
            current = current.parentNode;
          }
          current.classList.remove('subtitlesMouseover');
        }, false);
      }
    };

    // creates the chapters table of contents
    var createChaptersToc = function() {
      var CORS_PROXY = document.location.href + 'cors/';
      var track = document.createElement('track');
      track.src = that.chapters;
      track.kind = 'chapters';
      track.srclang = 'en';
      video.appendChild(track);
      var chapters = that.$.chapters;
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

      var getYouTubeHtml5VideoUrl = function(videoId, callback) {
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
          var quality, sources, stream, type, urlEncodedStream, _i, _len,
              _ref;
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
        var  url = CORS_PROXY + encodeURIComponent(
            'http://www.youtube.com/get_video_info?video_id=' + videoId);
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4 && xhr.status === 200) {
            var youTubeVideo = decodeQueryString(xhr.responseText);
            // video.live_playback is '1' for Hangouts on Air
            if ((youTubeVideo.status === 'fail') ||
                (youTubeVideo.live_playback)) {
              return callback(false);
            }
            if (!youTubeVideo.url_encoded_fmt_stream_map) {
              return callback(false);
            }
            youTubeVideo.sources =
                decodeStreamMap(youTubeVideo.url_encoded_fmt_stream_map);
            if (!youTubeVideo.sources) {
              return callback(false);
            }
            var mediumQuality = {};
            for (var key in youTubeVideo.sources) {
              if (/.*?medium.*?/gi.test(key)) {
                mediumQuality[key] = youTubeVideo.sources[key];
              }
            }
            return callback(mediumQuality);
          }
        };
        xhr.open('GET', url, true);
        xhr.send();
      };

      if (that.youTubeVideoId) {
        getYouTubeHtml5VideoUrl(that.youTubeVideoId,
            function(videoSources) {
          for (var videoSource in videoSources) {
            videoSource = videoSources[videoSource];
            var source = document.createElement('source');
            source.src = CORS_PROXY +
                encodeURIComponent(videoSource.original_url);
            source.type = videoSource.type.replace(/\+/g, ' ')
                .replace(/"/g, '\"');
            video.appendChild(source);
          }
        });
      }

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
              if (!innerTrack.cues) {
                innerTrack.addEventListener('load', function(e) {
                  return readSubtitleCues(e.target.cues);
                });
              } else {
                setTimeout(function() {
                  return readSubtitleCues(innerTrack.cues);
                }, 2000);
              }
            }
          })(track);
        }
      }, false);

      var readSubtitleCues = function(cues) {
        if (!that.displaySubtitlesGroup) {
          return;
        }
        var subtitles = that.$.subtitles;
        var subtitlesData = [];
        var tempDiv = document.createElement('div');
        for (var i = 0, lenI = cues.length; i < lenI; i++) {
          var cue = cues.item(i);
          subtitlesData.push({
            startTime: cue.startTime,
            endTime: cue.endTime,
            text: cue.text,
            id: cue.id
          });
          var span = document.createElement('span');
          span.dataset.start = cue.startTime;
          span.dataset.end = cue.endTime;
          tempDiv.innerHTML = cue.text + ' ';
          span.textContent = tempDiv.textContent;
          subtitles.appendChild(span);
        }
      };

      var readChapterCues = function(cues) {
        var chaptersData = [];
        for (var i = 0, lenI = cues.length; i < lenI; i++) {
          var cue = cues.item(i);
          (function(innerCue, innerI) {
            chaptersData.push({
              startTime: innerCue.startTime,
              endTime: innerCue.endTime,
              text: innerCue.text,
              id: innerCue.id
            });
            if (that.displayChaptersThumbnails) {
              setTimeout(function() {
                getStillFrame(innerCue, function(err, img, text) {
                  displayStillFrame(img, text, innerCue.startTime,
                      innerCue.endTime);
                  if (innerI === lenI - 1) {
                    video.currentTime = 0;
                    chapters.style.display = 'block';
                    splashDiv.remove();
                  }
                });
              }, 2000 * i);
            }
          })(cue, i);
        }
        that.fire(
          'chaptersupdate',
          {
            chapters: chaptersData,
            duration: that.duration,
            height: that.height,
            width: that.width
          }
        );
        if (!that.displayChaptersThumbnails) {
          splashDiv.remove();
        }
      };

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
        chapters.appendChild(li);
      };
    };
  }
});