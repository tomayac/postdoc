// global config with the video URLs and the metadata JSONs
var CORS_PROXY = document.location.hostname === 'localhost' ?
    document.location.origin + '/cors/' : '';
var video = CORS_PROXY ?
    CORS_PROXY + encodeURIComponent(VIDEO_DATA[0].video) : VIDEO_DATA[0].video;
var json = CORS_PROXY ?
    CORS_PROXY + encodeURIComponent(VIDEO_DATA[0].json) : VIDEO_DATA[0].json;
var transcriptUrl = 'http://spectacleenlignes.fr/plateforme/ctb';
var transcript = CORS_PROXY ?
    CORS_PROXY + encodeURIComponent(transcriptUrl) : transcriptUrl;

var createHypervideo = (function(video, json, transcript) {

  var createPolymerElements = function(metadataJson, transcriptHtml) {
    var start = transcriptHtml.indexOf('<body ');
    var end = transcriptHtml.indexOf('</body>');
    var temp = document.createElement('div');
    temp.innerHTML = transcriptHtml.substring(start, end);
    var paragraphs = temp.querySelectorAll('p[id]');
    console.log(paragraphs);

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
    var vtt = video.split('/')[5];
    chapters.setAttribute('src', './vtt/' + vtt + '.vtt');
    chapters.setAttribute('displaychaptersthumbnails', true);
    chapters.setAttribute('width', 800);
    hypervideo.appendChild(chapters);

    metadataJson.annotations.sort(function(a, b) {
      // sort annotations by ascending start time
      return a.begin - b.begin;
    }).forEach(function(data) {
      var start = data.begin / 1000;
      var end = data.end / 1000;
      var description = data.content.description;
      var annotation = document.createElement('polymer-data-annotation');
      annotation.setAttribute('start', start);
      annotation.setAttribute('end', end);
      annotation.textContent = description;
      hypervideo.appendChild(annotation);
    });

    document.body.appendChild(fragment);
  };

  var getMetadataJson = function(callback) {
    // get the metadata json
    var xhr = new XMLHttpRequest();
    xhr.onload =  function() {
      return callback(null, this.responseText);
    };
    xhr.open('get', json, true);
    xhr.send();
  };

  var getTranscriptHtml = function(callback) {
    // get the transcript html
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      return callback(null, this.responseText);
    };
    xhr.open('get', transcript, true);
    xhr.send();
  };

  async.parallel({
    metadataJson: getMetadataJson,
    transcriptHtml: getTranscriptHtml
  }, function(err, results) {
    if (err) {
      throw(err);
    }
    createPolymerElements(JSON.parse(results.metadataJson), results.transcriptHtml);
  });

})(video, json, transcript);