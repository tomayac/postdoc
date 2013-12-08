/* Set up the WebVTT editor application. */

(function () {
  // Load the video in the editor and display its metadata
  var video = new Video(document.querySelector('#editor video'));
  var editor = new CueEditor(video);
  editor.init();
  displayMetadata(video);

  // Displays the metadata of the given video when ready
  function displayMetadata(video) {
    video.addEventListener('loadedmetadata', function () {
      displayCode(video.getWebVttDocument().toJSON());
    });
  }

  // Displays the given piece of source code
  function displayCode(source) {
    var pre = document.createElement('pre');
    pre.innerText = source;
    document.getElementById('code').appendChild(pre);
  }
})();
