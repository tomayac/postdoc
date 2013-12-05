(function () {

  var videos = document.querySelectorAll('video');
  for (var i = 0, lenI = videos.length; i < lenI; i++) {
    var video = videos[i];
    var textTracks = video.textTracks;
    var metadataTextTracks = [];
    for (var j = 0, lenJ = textTracks.length; j < lenJ; j++) {
      var textTrack = textTracks[j];
      if (textTrack.kind === 'metadata') {
        metadataTextTracks.push(textTrack);
        textTrack.mode = 'hidden';
        textTrack.addEventListener('cuechange', function (e) {
          oncuechange(e, video);
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

  function oncuechange(e, video) {
    var activeCues = e.target.activeCues;
    for (var i = 0, len = activeCues.length; i < len; i++) {
      var activeCue = activeCues[i];
      if (!activeCue) {
        return;
      }
      var data = JSON.parse(activeCue.text);
      for (var key in data) {
        if (WebVttPlugins[key]) {
          WebVttPlugins[key](video, activeCue, data[key]);
        }
      }
    }
  }

  function displayCode(source) {
    var fragment = document.createDocumentFragment(),
        pre = document.createElement('pre');
    pre.innerHTML = JSON.stringify(source, null, 2);
    fragment.appendChild(pre);
    document.body.appendChild(fragment);
  }
})();
