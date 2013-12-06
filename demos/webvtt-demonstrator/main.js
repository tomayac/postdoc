(function () {
  var forEach = Function.prototype.call.bind([].forEach);

  var video = new Video(document.querySelector('#editor video'));
  var editor = new CueEditor(video);

  showMetadata(video);

  function showMetadata(video) {
    video.addEventListener('loadedmetadata', function () {
      video.metadataTracks.forEach(function (track) {
        displayCode(new WebVttDocument(track.cues, video.currentSrc).toJSON());
      });
    });
  }

  function displayCode(source) {
    var fragment = document.createDocumentFragment(),
        pre = document.createElement('pre');
    pre.innerHTML = JSON.stringify(source, null, 2);
    fragment.appendChild(pre);
    document.getElementById('code').appendChild(fragment);
  }
})();
