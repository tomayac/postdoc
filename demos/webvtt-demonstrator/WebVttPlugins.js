(function (root) {
  var plugins = {
    tags: function (video, activeCue, value, opt_speaker) {
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

    actors: function (video, activeCue, value) {
      plugins.tags(video, activeCue, value,
          '<v.meta-scene-actors>Scene Actors: ');
    },

    volume: function (video, activeCue, value) {
      video.volume = parseFloat(value);
    },

    playbackRate: function (video, activeCue, value) {
      video.playbackRate = parseFloat(value);
    },

    style: function (video, activeCue, value) {
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
        activeCue.addEventListener('exit', function () {
          var classList = video.classList;
          classList.remove(className);
          var currentTime = parseFloat(video.currentTime);
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
          }
          catch (e) { }
        }, false);
      }
    },

    spatialFragment: function (video, activeCue, value) {
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
      activeCue.addEventListener('exit', function () {
        try {
          document.querySelector('#' + id).remove();
        }
        catch (e) { }
      }, false);
    }
  };

  root.WebVttPlugins = plugins;
})(window);
