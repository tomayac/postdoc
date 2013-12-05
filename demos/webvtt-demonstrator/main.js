(function () {
  var forEach = Function.prototype.call.bind([].forEach);

  forEach(document.querySelectorAll('video'), enableMetadataDisplay);

  function enableMetadataDisplay(video) {
    var textTracks = video.textTracks;
    var metadataTextTracks = [];
    for (var j = 0, lenJ = textTracks.length; j < lenJ; j++) {
      var textTrack = textTracks[j];
      if (textTrack.kind === 'metadata') {
        metadataTextTracks.push(textTrack);
        textTrack.mode = 'hidden';
        textTrack.addEventListener('cuechange', function (event) {
          applyCues(video, event.target.activeCues);
        }, false);
      }
    }
    video.addEventListener('canplaythrough', function () {
      metadataTextTracks.forEach(function (textTrack) {
        var document = new WebVttDocument(textTrack.cues, video.currentSrc);
        displayCode(document.toJSON());
      });
      video.play();
    }, false);
  }

  function applyCues(video, cues) {
    forEach(cues, function (cue) {
      var cueData = JSON.parse(cue.text);
      for (var pluginName in cueData)
        if (WebVttPlugins[pluginName])
          WebVttPlugins[pluginName](video, cue, cueData[pluginName]);
    });
  }

  function displayCode(source) {
    var fragment = document.createDocumentFragment(),
        pre = document.createElement('pre');
    pre.innerHTML = JSON.stringify(source, null, 2);
    fragment.appendChild(pre);
    document.body.appendChild(fragment);
  }
})();
