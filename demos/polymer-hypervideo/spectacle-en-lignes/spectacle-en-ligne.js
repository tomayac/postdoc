// global config with the video URLs and the metadata JSONs
var CORS_PROXY = document.location.hostname === 'localhost' ?
    document.location.origin + '/cors/' : '';
var video = VIDEO_DATA[4].video;
var json = VIDEO_DATA[4].json;
var transcript = 'http://spectacleenlignes.fr/plateforme/ctb';

var createHypervideo = (function(video, json, transcript) {

  var createTextTrack = function(transcriptHtml, lines) {

    var toHHMMSSmmm = function(duration) {
      var milliseconds = parseInt((duration % 1000) / 100);
      var seconds = parseInt((duration / 1000) %60);
      var minutes = parseInt((duration / (1000 * 60)) % 60);
      var hours = parseInt((duration / (1000 * 60 * 60)) % 24);
      hours = hours < 10 ? '0' + hours : hours;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      seconds = seconds < 10 ? '0' + seconds : seconds;
      milliseconds = milliseconds < 10 ? '00' + milliseconds :
          milliseconds < 100 ? '0' + milliseconds : milliseconds;
      return hours + ':' + minutes + ':' + seconds + '.' + milliseconds;
    };

    var temp = document.createElement('div');
    temp.innerHTML =
        transcriptHtml.replace(/^.*?<body\b.*?>(.*?)<\/body>.*?$/gi, '$1');
    var paragraphs = temp.querySelectorAll('p[id]');
    var textTrack = 'WEBVTT\n\n';
    for (var i = 0, lenI = paragraphs.length; i < lenI; i++) {
      var paragraph = paragraphs[i].textContent.replace(/\n/g, '').trim();
      // Extract the line number
      var line = paragraph.replace(/^(\d+-\d+).*?$/g, '$1');
      // Extract the text and create voice spans
      var text = paragraph.replace(/^(?:\d+-\d+)(.*?)$/g, '$1')
          .replace(/^(\w+(?:\s+\w+)?)(?:\s*\(.*?\))?(\s*:\s*)(.*?)$/g,
          function(m, v, c, t) {
            return '<v ' + v.replace(/\b\w+/g, function(n) {
              return n.charAt(0).toUpperCase() + n.substr(1).toLowerCase();
            }) + '>' + t;
          });
      if (lines[line]) {
        textTrack +=
            line + ':\n' + // id
            toHHMMSSmmm(lines[line].start * 1000) + ' --> ' + // start
            toHHMMSSmmm(lines[line].end * 1000) + '\n' + // end
            text + '\n\n'; // payload
      }
    }
    var textTrackBlob = new Blob([textTrack], {type: 'text/plain'});
    return URL.createObjectURL(textTrackBlob);
  };

  var createPolymerElements = function(metadataJson, transcriptHtml) {
    var fragment = document.createDocumentFragment();
    var hypervideo = document.createElement('polymer-hypervideo');
    hypervideo.setAttribute('src', video + '.mp4 ' + video + '.mkv');
    hypervideo.setAttribute('width', 800);
    hypervideo.setAttribute('height', 450);
    hypervideo.setAttribute('muted', false);
    fragment.appendChild(hypervideo);

    var tmpTrack = document.createElement('track');
    var tmpVideo = document.createElement('video');
    tmpVideo.setAttribute('crossorigin', 'Anonymous');
    tmpVideo.style.display = 'none';
    tmpVideo.appendChild(tmpTrack);
    tmpTrack.src = video + '.vtt';
    tmpTrack.track.mode = 'showing';
    tmpTrack.addEventListener('load', function() {
      var lines = {};
      for (var i = 0, lenI = tmpTrack.track.cues.length; i < lenI; i++) {
        var cue = tmpTrack.track.cues[i];
        lines[cue.text] = {
          start: cue.startTime,
          end: cue.endTime
        };
      }
      var subtitles = document.createElement('polymer-track-subtitles');
      var textTrackFile = createTextTrack(transcriptHtml, lines);
      subtitles.setAttribute('src', textTrackFile);
      subtitles.setAttribute('displaysubtitlesgroup', true);
      subtitles.setAttribute('width', 800);
      hypervideo.appendChild(subtitles);

      var iframe = document.createElement('iframe');
      iframe.style.width = '800px';
      iframe.style.height = '300px';
      iframe.addEventListener('load', function() {
        var contentDocument = iframe.contentDocument;
        var tmpDiv = contentDocument.createElement('div');
        tmpDiv.innerHTML = transcriptHtml;
        contentDocument.body.appendChild(tmpDiv);
        // Highlight lines in the current video
        var textLines = contentDocument.querySelectorAll('p[id]');
        for (var i = 0, lenI = textLines.length; i < lenI; i++) {
          var textLine = textLines[i];
          if (lines[textLine.id]) {
            textLine.style.backgroundColor = 'yellow';
          }
        }
        // Highlight the currently active line
        document.addEventListener('hypervideocuechange', function(e) {
          console.log('Received event (document): hypervideocuechange');
          var cues = e.detail.activeCues;
          var textLines = contentDocument.querySelectorAll('p[id]');
          for (var i = 0, lenI = textLines.length; i < lenI; i++) {
            var textLine = textLines[i];
            textLine.style.color = 'black';
          }
          for (var i = 0, lenI = cues.length; i < lenI; i++) {
            var cue = cues[i];
            if (/^\d+-\d+$/.test(cue.text)) {
              var textLine =
                  contentDocument.querySelector('p[id="' + cue.text + '"]');
              iframe.contentWindow.scrollTo(0, textLine.offsetTop - 20);
              textLine.style.color = 'red';
            }
          }
        });
      });
      hypervideo.appendChild(iframe);

      var timeline = document.createElement('polymer-visualization-timeline');
      timeline.setAttribute('orientation', 'landscape');
      timeline.setAttribute('width', 800);
      timeline.setAttribute('height', 150);
      hypervideo.appendChild(timeline);

      var chapters = document.createElement('polymer-track-chapters');
      chapters.setAttribute('src', video + '.vtt');
      chapters.setAttribute('displaychaptersthumbnails', true);
      chapters.setAttribute('width', 800);
      hypervideo.appendChild(chapters);
    });
    var source1 = document.createElement('source');
    tmpVideo.appendChild(source1);
    source1.src = video + '.mp4';
    var source2 = document.createElement('source');
    tmpVideo.appendChild(source2);
    source2.src = video + '.mkv';
    document.body.appendChild(tmpVideo);

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