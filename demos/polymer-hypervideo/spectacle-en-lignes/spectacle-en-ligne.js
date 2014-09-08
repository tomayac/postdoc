// global config with the video URLs and the metadata JSONs
var CORS_PROXY = document.location.origin + '/cors/';
var video = CORS_PROXY + encodeURIComponent(VIDEO_DATA[0].video);
var json = CORS_PROXY + encodeURIComponent(VIDEO_DATA[0].json);

var createHypervideo = function() {
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
  fragment.appendChild(timeline);


  var chapters = document.createElement('polymer-track-chapters');
  chapters.setAttribute('src', './vtt/lecture-a-la-table_4af0d0_a10.vtt');
  chapters.setAttribute('displaychaptersthumbnails', true);
  chapters.setAttribute('width', 800);
  fragment.appendChild(chapters);

  var link = document.createElement('link');
  link.setAttribute('rel', 'import');
  link.setAttribute('href', './polymer-hypervideo/polymer-hypervideo.html');
  document.body.appendChild(link);

  document.body.appendChild(fragment);
};

// get the metadata json
var xhr = new XMLHttpRequest();
xhr.onload = createHypervideo;
xhr.open('get', json, true);
xhr.send();
