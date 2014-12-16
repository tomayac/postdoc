var CORS_PROXY = document.location.hostname === 'localhost' ?
    document.location.origin + '/cors/' : '';

var LDF_START_FRAGMENT = 'http://spectacleenlignes.fr/ldf/spectacle_en_lignes';

var ID_LOOKUP_LDF_QUERY =
    'PREFIX cl: <http://advene.org/ns/cinelab/>\n' +
    'SELECT ?s WHERE {\n' +
      '?s cl:id-ref "{{id}}" .\n' +
    '}';

var ANNOTATIONS_LDF_QUERY =
    'PREFIX cl: <http://advene.org/ns/cinelab/ld#>\n' +
    'PREFIX ma: <http://www.w3.org/ns/ma-ont#>\n' +
    'SELECT * WHERE {\n' +
      '<{{url}}#{{title}}> ' +
          'cl:represents ?video .\n' +
      '?video ma:hasFragment ?frag .\n' +
      '?a cl:hasFragment ?frag ;\n' +
        'cl:hasContent [ cl:mimetype ?ctype ; cl:data ?cdata ]\n' +
    '}';

var createHypervideo = function(video, id, transcript) {
  var onHypervideoCueChange;
  var container = document.querySelector('#container');
  try {
    var oldVideos = container.querySelector('polymer-hypervideo').shadowRoot
      .querySelectorAll('video');
    for (var i = 0, lenI = oldVideos.length; i < lenI; i++) {
      var oldVideo = oldVideos[i];
      oldVideo.pause();
      oldVideo.muted = true;
      oldVideo.remove();
    }
  } catch(e) {
    // no-op
  }
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

  var createPolymerElements = function(transcriptHtml, lines) {
    var fragment = document.createDocumentFragment();

    var hypervideo = document.createElement('polymer-hypervideo');

    hypervideo.setAttribute('src', video + '.mp4 ' + video + '.mkv');
    hypervideo.setAttribute('width', 800);
    hypervideo.setAttribute('height', 450);
    hypervideo.setAttribute('muted', false);
    fragment.appendChild(hypervideo);

    var ldfClient = document.createElement('polymer-ldf-client');
    ldfClient.setAttribute('startFragment', LDF_START_FRAGMENT);
    ldfClient.setAttribute('auto', false);
    var query = ID_LOOKUP_LDF_QUERY.replace(/\{\{id\}\}/g, id);
    ldfClient.setAttribute('query', query);
    ldfClient.setAttribute('responseFormat', 'streaming');
    container.appendChild(ldfClient);
    ldfClient.addEventListener('ldf-query-streaming-response-partial',
        function(e) {
      console.log('Received event (ldf-client): ldf-query-streaming-response-partial');
      var data = JSON.parse(e.detail.response);
      try {
        if (data['?s']) {
          var url = data['?s'].split('#')[0];
          var query = ANNOTATIONS_LDF_QUERY.replace(/\{\{url\}\}/g, url)
              .replace(/\{\{title\}\}/g, id);
          ldfClient.setAttribute('query', query);
          ldfClient.executeQuery();
        } else {
          var frag = data['?frag'];
          var mediaFragment = MediaFragments.parseMediaFragmentsUri(frag);
          var start = mediaFragment.hash.t[0].startNormalized;
          var end = mediaFragment.hash.t[0].endNormalized;
          var description = JSON.parse((data)['?cdata']
              .replace(/^"/, '').replace(/"$/, '')).description;
          if (!description) {
            description = '(pas disponible)';
          }
          var annotation = document.createElement('polymer-data-annotation');
          annotation.setAttribute('start', start);
          annotation.setAttribute('end', end);
          annotation.innerHTML = description;
          hypervideo.appendChild(annotation);
        }
      } catch(e) {
        throw('Could not parse response: ' + e);
      }
    });
    ldfClient.addEventListener('ldf-query-streaming-response-end', function(e) {
      console.log('Received event (ldf-client): ldf-query-streaming-response-end');
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
            if (iframe.contentWindow) {
              iframe.contentWindow.scrollTo(0, textLine.offsetTop - 20);
              textLine.style.color = 'red';
            }
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
    container.appendChild(fragment);
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
        tmpVideo.pause();
        tmpVideo.remove();
        createPolymerElements(results.transcriptHtml, lines);
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
  var cueSelect = document.querySelector('#cueSelect');

  var videoSelectChange = function() {
    if (videoSelect.selectedIndex < 0) {
      videoSelect.selectedIndex = 0;
    }
    var cueId = document.location.hash.substr(1).split('/')[1] || '';
    if (!cueId) {
      cueSelect.selectedIndex = 0;
    }
    var index = videoSelect.options[videoSelect.selectedIndex].value || 0;
    var video = VIDEO_DATA[index].video;
    var id = VIDEO_DATA[index].id;
    var transcript = 'http://spectacleenlignes.fr/plateforme/ctb';
    var title = id.replace(/-/g, ' ').replace(/_(.*?)$/, ' ($1)');
    history.pushState({}, 'Spectacle en Ligne(s)—' + title, '#' + id);
    return createHypervideo(video, id, transcript);
  };
  videoSelect.addEventListener('change', videoSelectChange);

  var cueSelectChange = function() {
    console.log(cueSelect.selectedIndex)
    if (cueSelect.selectedIndex < 0) {
      cueSelect.selectedIndex = 0;
    }
    var value = cueSelect.options[cueSelect.selectedIndex].value;
    var cue = value.split('—')[0];
    var start = value.split('—')[1];
    var video = value.split('—')[2];
    var title = video.replace(/-/g, ' ').replace(/_(.*?)$/, ' ($1)');
    videoSelect.value = videoLookUp[video].index;
    videoSelectChange();
    history.pushState({}, 'Spectacle en Ligne(s)—' + title, '#' + video + '/' +
        cue);
    document.addEventListener('allstillframesreceived', function() {
      var event = new CustomEvent('currenttimeupdate', { detail: {
        currentTime: start
      }});
      document.dispatchEvent(event);
    });
  };
  cueSelect.addEventListener('change', cueSelectChange);

  var functions = {};
  var videoLookUp = {};
  var cueLookUp = {};
  var webVttParser = new WebVTTParser();
  VIDEO_DATA.forEach(function(video, i) {
    // check if the .vtt-s exist
    var url = video.video;
    functions[url] = function(callback) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        // fill the select box
        if (xhr.status !== 200) {
          return callback(null);
        }
        var id = video.id;
        videoLookUp[id] = {
          index: i,
          cues: []
        };
        var option = document.createElement('option');
        option.textContent = id.replace(/-/g, ' ').replace(/_(.*?)$/, ' ($1)');
        option.value = i;
        videoSelect.appendChild(option);

        var webVtt = this.responseText;
        webVtt = webVttParser.parse(webVtt);
        if (webVtt.errors.length > 0) {
          return callback(null);
        }
        webVtt.cues.forEach(function(cue) {
          var cueText = cue.text;
          videoLookUp[id].cues.push({
            cue: cueText,
            start: cue.startTime,
            end: cue.endTime
          });
          if (!cueLookUp[cueText]) {
            cueLookUp[cueText] = [];
          }
          cueLookUp[cueText].push({
            id: id,
            start: cue.startTime,
            end: cue.endTime
          });
        });
        return callback(null, url);
      };
      xhr.onerror = function() {
        return callback(null);
      };
      xhr.open('get', url + '.vtt', true);
      xhr.send();
    };
  });
  async.parallel(
    functions,
    function(err, results) {
      for (var cue in cueLookUp) {
        var optgroup = document.createElement('optgroup');
        optgroup.label = cue;
        cueSelect.appendChild(optgroup);
        cueLookUp[cue].forEach(function(video) {
          var option = document.createElement('option');
          option.textContent = cue + ': ' + video.id.replace(/-/g, ' ')
              .replace(/_(.*?)$/, ' ($1)');
              option.value = cue + '—' + video.start + '—' + video.id;
          optgroup.appendChild(option);
        });
      }

      var prevVideo = document.querySelector('#prevVideo');
      var nextVideo = document.querySelector('#nextVideo');
      var prevCue = document.querySelector('#prevCue');
      var nextCue = document.querySelector('#nextCue');

      prevVideo.addEventListener('click', function() {
        var items = videoSelect.options.length;
        var index = (videoSelect.selectedIndex + items - 1) % items;
        videoSelect.value = videoSelect.options[index].value;
        videoSelectChange();
      });
      nextVideo.addEventListener('click', function() {
        var items = videoSelect.options.length;
        var index = (videoSelect.selectedIndex + 1) % items;
        videoSelect.value = videoSelect.options[index].value;
        videoSelectChange();
      });
      prevCue.addEventListener('click', function() {
        var items = cueSelect.options.length;
        var index = (cueSelect.selectedIndex + items - 1) % items;
        cueSelect.value = cueSelect.options[index].value;
        cueSelectChange();
      });
      nextCue.addEventListener('click', function() {
        var items = cueSelect.options.length;
        var index = (cueSelect.selectedIndex + 1) % items;
        cueSelect.value = cueSelect.options[index].value;
        cueSelectChange();
      });

      var index = 0;
      if (document.location.hash) {
        var videoId = document.location.hash.substr(1).split('/')[0];
        var cueId = document.location.hash.substr(1).split('/')[1] || '';
        index = videoLookUp[videoId].index;
      }
      if (cueId) {
        console.log('Starting with video ' + videoId + ' at cue ' + cueId);
        var video;
        for (var i = 0, lenI = cueLookUp[cueId].length; i < lenI; i++) {
          video = cueLookUp[cueId][i];
          if (video.id === videoId) {
            break;
          }
        }
        cueSelect.value = cueId + '—' + video.start + '—' + video.id;
            return cueSelectChange();
      } else {
        console.log('Starting with video ' + videoId);
        videoSelect.value = index;
        cueSelect.selectedIndex = 0;
        return videoSelectChange();
      }
    }
  );
})();