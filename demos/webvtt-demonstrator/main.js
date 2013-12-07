(function () {
  var video = new Video(document.querySelector('#editor video'));
  var editor = new CueEditor(video);

  editor.init();
  showMetadata(video);

  function showMetadata(video) {
    video.addEventListener('loadedmetadata', function () {
      displayCode(video.getWebVttDocument().toJSON());
    });
  }

  function displayCode(source) {
    var pre = document.createElement('pre');
    pre.innerText = JSON.stringify(source, null, 2);
    document.getElementById('code').appendChild(pre);
  }
})();
