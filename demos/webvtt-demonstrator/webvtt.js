(function() {

  var videos = document.querySelectorAll('video');
  for (var i = 0, lenI = videos.length; i < lenI; i++) {
    var video = videos[i];
    var textTracks = video.textTracks;
    var metadataTextTracks = [];
    for (var j = 0, lenJ = textTracks.length; j < lenJ; j++) {
      var textTrack = textTracks[j];
      console.log(textTrack);
      if (textTrack.kind === 'metadata') {
        metadataTextTracks.push(textTrack);
        textTrack.mode = 'hidden';
        textTrack.addEventListener('cuechange', function(e) {
          oncuechange(e, video);
        }, false);
      }
    }
    video.addEventListener('canplaythrough', function() {
      metadataTextTracks.forEach(function(textTrack) {
        webVttToJsonLd(textTrack.cues, video.currentSrc);
      });
      video.play();
    }, false);
  }

  var plugins = {
    tags: function(video, activeCue, value, opt_speaker) {
      var valueStringified = value.toString();
      for (var i = 0, lenI = video.textTracks.length; i < lenI; i++) {
        var textTrack = video.textTracks[i];
        if (textTrack.mode === 'showing' || textTrack.default) {
          for (var j = 0, lenJ = textTrack.activeCues.length; j < lenJ; j++) {
            if (textTrack.activeCues[j].id === valueStringified) {
              return;
            }
          }
          var newCue = new TextTrackCue(
              activeCue.startTime,
              activeCue.endTime,
              (opt_speaker ? opt_speaker : '<v.meta-tags>Scene Tags: ') +
                  value.join(', '));
          newCue.id = valueStringified;
          textTrack.addCue(newCue);
          break;
        }
      }
    },
    actors: function(video, activeCue, value) {
      plugins.tags(video, activeCue, value,
          '<v.meta-scene-actors>Scene Actors: ');
    },
    volume: function(video, activeCue, value) {
      video.volume = parseFloat(value);
    },
    playbackRate: function(video, activeCue, value) {
      video.playbackRate = parseFloat(value);
    },
    style: function(video, activeCue, value) {
      var className = 'cue-' +
          activeCue.startTime.toString().replace(/\./g, '_') + '-' +
          activeCue.endTime.toString().replace(/\./g, '_');
      if (!document.querySelector('#' + className)) {
        var style = document.createElement('style');
        style.id = className;
        style.textContent = 'video.' + className + ' {' + value + ';}';
        style.setAttribute('type', 'text/css');
        document.head.appendChild(style);
        video.classList.add(className);
        (function(currentClassName) {
          activeCue.addEventListener('exit', function(e) {
            var classList = video.classList;
            classList.remove(className);
            currentTime = parseFloat(video.currentTime);
            try {
              document.querySelector('#' + className).remove();
              // not all cue.onexit events always fire, so clean up manually
              for (var i = 0, lenI = classList.length; i < lenI; i++) {
                var currentClassName = classList.item(i);
                var cueEndTime = parseFloat(currentClassName.split(/-/g)[2]
                    .replace(/_/g, '.'));
                if (currentTime > cueEndTime) {
                  classList.remove(currentClassName);
                  document.querySelector('#' + currentClassName).remove();
                }
              }
            } catch(e) {
              // no-op
            }
          }, false);
        })(className);
      }
    },
    spatialFragment: function(video, activeCue, value) {
      var components = value.replace(/^xywh=/, '').split(/,/);
      var x = components[0];
      var y = components[1];
      var width = components[2];
      var height = components[3];
      var div = document.createElement('div');
      var id = 'cue-' +
          activeCue.startTime.toString().replace(/\./g, '_') + '-' +
          activeCue.endTime.toString().replace(/\./g, '_');
      div.id = id;
      div.style.border = 'solid 4px yellow';
      video.parentNode.appendChild(div);
      div.style.position = 'absolute';
      div.style.left = (video.offsetLeft + parseInt(x, 10)) + 'px';
      div.style.top = (video.offsetTop + parseInt(y, 10)) + 'px';
      div.style.width = width + 'px';
      div.style.height = height + 'px';
      div.style.zIndex = 10000;
      (function(currentId) {
        activeCue.addEventListener('exit', function(e) {
          try {
            document.querySelector('#' + currentId).remove();
          } catch(e) {
            // no-op
          }
        }, false);
      })(id);
    }
  };

  function oncuechange(e, video) {
    var activeCues = e.target.activeCues;
    for (var i = 0, len = activeCues.length; i < len; i++) {
      var activeCue = activeCues[i];
      if (!activeCue) {
        return;
      }
      var data = JSON.parse(activeCue.text);
      for (var key in data) {
        if (plugins[key]) {
          plugins[key](video, activeCue, data[key]);
        }
      }
    }
  }

  function webVttToJsonLd(cues, src) {
    var jsonLd = {
      "@context": {
        annotation: 'http://example.org/annotation',
        hasFragment: 'http://www.w3.org/ns/ma-ont#hasFragment',
        MediaResource: 'http://www.w3.org/ns/ma-ont#MediaResource',
        MediaFragment: 'http://www.w3.org/ns/ma-ont#MediaFragment'
      },
      "@id": src,
      "@type": 'MediaResource',
      hasFragment: []
    };
    for (var i = 0, lenI = cues.length; i < lenI; i++) {
      var cue = cues[i];
      var mediaFragment = {};
      jsonLd.hasFragment.push(mediaFragment);
      mediaFragment['@id'] = src + '#t=' + cue.startTime + ',' + cue.endTime;
      mediaFragment['@type'] = 'MediaFragment';
      mediaFragment.annotations = JSON.parse(cue.text);
    }
    var fragment = document.createDocumentFragment();
    var pre = document.createElement('pre');
    pre.innerHTML = JSON.stringify(jsonLd, null, 2);
    fragment.appendChild(pre);
    document.body.appendChild(fragment);
    return JSON.stringify(jsonLd, null, 2);
  }

})();
