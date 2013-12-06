(function () {
  var forEach = Function.prototype.call.bind([].forEach);

  forEach(document.querySelectorAll('video'), activateVideo);

  function activateVideo(videoElement) {
    var video = new Video(videoElement);

    // Display the metadata when loaded
    video.addEventListener('loadedmetadata', function () {
      video.metadataTracks.forEach(function (track) {
        displayCode(new WebVttDocument(track.cues, video.currentSrc).toJSON());
      });
    });

    // Play the video when ready
    video.addEventListener('canplaythrough', video.play);
  }

  function displayCode(source) {
    var fragment = document.createDocumentFragment(),
        pre = document.createElement('pre');
    pre.innerHTML = JSON.stringify(source, null, 2);
    fragment.appendChild(pre);
    document.body.appendChild(fragment);
  }
})();
