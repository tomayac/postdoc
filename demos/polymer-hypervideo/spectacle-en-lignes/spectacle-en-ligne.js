var CORS_PROXY = document.location.hostname === 'localhost' ?
    document.location.origin + '/cors/' : '';

var LDF_START_FRAGMENT = 'http://spectacleenlignes.fr/ldf/spectacle_en_lignes';
var LDF_QUERY = 'SELECT DISTINCT ?tag WHERE {' +
                   '[ a <http://advene.org/ns/cinelab/ld#Annotation> ;' +
                     '<http://advene.org/ns/cinelab/ld#taggedWith>' +
                       '[ <http://purl.org/dc/elements/1.1/title>  ?tag ]' +
                    ']' +
                 '}';

var createHypervideo = function(video, json, transcript) {
  var container = document.querySelector('#container');
  container.innerHTML = '';
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

  var createPolymerElements = function(metadataJson, transcriptHtml, lines) {
    var fragment = document.createDocumentFragment();

    var hypervideo = document.createElement('polymer-hypervideo');
    hypervideo.setAttribute('src', video + '.mp4 ' + video + '.mkv');
    hypervideo.setAttribute('width', 800);
    hypervideo.setAttribute('height', 450);
    hypervideo.setAttribute('muted', false);
    fragment.appendChild(hypervideo);

    var ldfClient = document.createElement('polymer-ldf-client');
    ldfClient.setAttribute('startFragment', LDF_START_FRAGMENT);
    ldfClient.setAttribute('query', LDF_QUERY);
    container.appendChild(ldfClient);
    ldfClient.addEventListener('ldf-query-streaming-response-partial',
        function(e) {
      var pre = document.createElement('pre');
      pre.textContent = JSON.stringify(e.detail.response);
      document.body.appendChild(pre);
    });
    ldfClient.executeQuery();

    var timeline = document.createElement('polymer-visualization-timeline');
    timeline.setAttribute('orientation', 'landscape');
    timeline.setAttribute('width', 800);
    timeline.setAttribute('height', 150);
    hypervideo.appendChild(timeline);

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
        textLine.style.opacity = 0.25;
        if (lines[textLine.id]) {
          textLine.style.opacity = 1;
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

    var chapters = document.createElement('polymer-track-chapters');
    chapters.setAttribute('src', video + '.vtt');
    chapters.setAttribute('displaychaptersthumbnails', true);
    chapters.setAttribute('width', 800);
    hypervideo.appendChild(chapters);

    hypervideo.addEventListener('hypervideoloadedmetadata', function(e) {
      var duration = e.detail.duration;

      metadataJson.annotations.filter(function(annotation) {
        return annotation.begin / 1000 < duration;
      }).sort(function(a, b) {
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
    });

    container.appendChild(fragment);
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

  var start = (function() {
    async.parallel({
      metadataJson: getMetadataJson,
      transcriptHtml: getTranscriptHtml
    }, function(err, results) {
      if (err) {
        throw(err);
      }
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
        metadataJson = JSON.parse(results.metadataJson);
        createPolymerElements(metadataJson, results.transcriptHtml, lines);
      });
      var source1 = document.createElement('source');
      tmpVideo.appendChild(source1);
      source1.src = video + '.mp4';
      var source2 = document.createElement('source');
      tmpVideo.appendChild(source2);
      source2.src = video + '.mkv';
      container.appendChild(tmpVideo);
    });
  })();
};


var init = (function() {
  var videoSelect = document.querySelector('#videoSelect');

  var videoSelectChange = function() {
    if (videoSelect.selectedIndex < 0) {
      videoSelect.selectedIndex = 0;
    }
    var index = videoSelect.options[videoSelect.selectedIndex].value || 0;
    var video = VIDEO_DATA[index].video;
    var json = VIDEO_DATA[index].json;
    var id = VIDEO_DATA[index].id;
    var transcript = 'http://spectacleenlignes.fr/plateforme/ctb';
    var title = id.replace(/-/g, ' ').replace(/_.*?$/, '');
    history.pushState({}, 'Spectacle en Ligne(s)—' + title, '#' + id);
    return createHypervideo(video, json, transcript);
  };
  videoSelect.addEventListener('change', videoSelectChange);

  var functions = {};
  var lookUp = {};
  VIDEO_DATA.forEach(function(video, i) {
    // check if the .vtt-s exist
    var url = video.video;
    functions[url] = function(callback) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        // fill the select box
        var id = video.id;
        lookUp[id] = i;
        var option = document.createElement('option');
        option.textContent = id.replace(/-/g, ' ');
        option.value = i;
        videoSelect.appendChild(option);
        return callback(null, url);
      };
      xhr.onerror = function() {
        return callback(url);
      };
      xhr.open('get', url + '.vtt', true);
      xhr.send();
    };
  });
  async.parallel(
    functions,
    function(err, results) {
      var index;
      if (document.location.hash) {
        var videoId = document.location.hash.substr(1);
        index = lookUp[videoId];
        console.log('Starting with video ' + videoId);
      }
      videoSelect.selectedIndex = index || 4;
      return videoSelectChange();
    }
  );
})();