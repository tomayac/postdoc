// global config with the video URLs and the metadata JSONs
var CORS_PROXY = document.location.origin + '/cors/';
var video = CORS_PROXY + encodeURIComponent(VIDEO_DATA[0].video);
var json = CORS_PROXY + encodeURIComponent(VIDEO_DATA[0].json);

var createHypervideo = (function(video, json) {
  var createPolymerElements = function() {
    var fragment = document.createDocumentFragment();

    var hypervideo = document.createElement('polymer-hypervideo');
    hypervideo.setAttribute('src', video);
    hypervideo.setAttribute('width', 800);
    hypervideo.setAttribute('height', 450);
    hypervideo.setAttribute('muted', true);
    fragment.appendChild(hypervideo);

    var timeline = document.createElement('polymer-visualization-timeline');
    timeline.setAttribute('orientation', 'landscape');
    timeline.setAttribute('width', 800);
    timeline.setAttribute('height', 150);
    hypervideo.appendChild(timeline);

    var chapters = document.createElement('polymer-track-chapters');
    var vtt = video.split('/')[4].split('%2F')[5];
    chapters.setAttribute('src', './vtt/' + vtt + '.vtt');
    chapters.setAttribute('displaychaptersthumbnails', true);
    chapters.setAttribute('width', 800);
    hypervideo.appendChild(chapters);

    var data = JSON.parse(this.responseText);
    data.annotations.forEach(function(data) {
      var start = data.begin / 1000;
      var end = data.end / 1000;
      var description = data.content.description;
      var annotation = document.createElement('polymer-data-annotation');
      annotation.setAttribute('start', start);
      annotation.setAttribute('end', end);
      annotation.textContent = description;
      hypervideo.appendChild(annotation);
    });

    var link = document.createElement('link');
    link.setAttribute('rel', 'import');
    link.setAttribute('href', './polymer-hypervideo/polymer-hypervideo.html');
    document.body.appendChild(link);

    document.body.appendChild(fragment);
  };

  // get the metadata json
  var xhr = new XMLHttpRequest();
  xhr.onload = createPolymerElements;
  xhr.open('get', json, true);
  xhr.send();
})(video, json);