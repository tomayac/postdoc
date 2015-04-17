var createHypervideo = function(video, id, transcript) {
  'use strict';

  var LDF_START_FRAGMENT =
      'http://spectacleenlignes.fr/ldf/spectacle_en_lignes';

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

    hypervideo.setAttribute('src', video);
    if (video === './videos/segment10.mp4') {
      hypervideo.setAttribute('alternativeviews', JSON.stringify({
        video: {
          1: {
            title: 'Brick_(full_screen)',
            src: './videos/cameras/demo_brick_fs.mp4'
          },
          2: {
            title: 'Brick_and_Margaret',
            src: './videos/cameras/demo_brick_maggie.mp4'
          },
          3: {
            title: 'Brick_(medium_screen)',
            src: './videos/cameras/demo_brick_ms.mp4'
          },
          4: {
            title: 'Margaret_(full_screen)',
            src: './videos/cameras/demo_maggie_fs.mp4'
          },
          5: {
            title: 'Margaret_(medium_screen)',
            src: './videos/cameras/demo_maggie_ms.mp4'
          }
        }
      }));
    }
    hypervideo.setAttribute('width', 398);
    hypervideo.setAttribute('height', 224);
    hypervideo.setAttribute('muted', false);
    fragment.appendChild(hypervideo);
/*
    var ldfClient = document.createElement('polymer-ldf-client');
    ldfClient.setAttribute('startFragment', LDF_START_FRAGMENT);
    ldfClient.setAttribute('auto', false);
    var query = ID_LOOKUP_LDF_QUERY.replace(/\{\{id\}\}/g, id);
    ldfClient.setAttribute('query', query);
    ldfClient.setAttribute('responseFormat', 'streaming');
    container.appendChild(ldfClient);
    ldfClient.addEventListener('ldf-query-streaming-response-partial',
        function(e) {
      console.log('Received event (ldf-client): ldf-query-streaming-response-' +
          'partial');
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
            return;
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
    ldfClient.addEventListener('ldf-query-streaming-response-end', function() {
      console.log('Received event (ldf-client): ldf-query-streaming-response-' +
          'end');
    });
    ldfClient.executeQuery();
*/
    var timeline = document.createElement('polymer-visualization-timeline');
    timeline.setAttribute('orientation', 'landscape');
    timeline.style.position = 'absolute';
    timeline.style.top = '270px';
    timeline.setAttribute('width', 810);
    timeline.setAttribute('height', 150);
    hypervideo.appendChild(timeline);

    hypervideo.appendChild(document.createElement('br'));

    var iframe = document.createElement('iframe');
    iframe.style.width = '398px';
    iframe.style.height = '272px';
    iframe.style.position = 'absolute';
    iframe.style.left = '408px';
    iframe.style.top = '-16px';
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
          // textLine.style.backgroundColor = 'yellow';
        }
      }
      // Highlight the currently active line
      document.addEventListener('hypervideocuechange', function(e) {
        console.log('Received event (document): hypervideocuechange');
        var cues = e.detail.activeCues;
        var cueSelect = document.querySelector('#cueSelect');
        var sceneSelect = document.querySelector('#sceneSelect');
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
              textLine.style.opacity = 1;
              // textLine.style.backgroundColor = 'yellow';
            }
            var value = cue.text + '—' + cue.startTime + '—' + id;
            cueSelect.value = value;
            sceneSelect.value = value;
          }
        }

        for (var i = 0, lenI = cues.length; i < lenI; i++) {
          var activeCue = cues[i];
          var speaker = activeCue.text.replace(/^<v (.+?)>.*?$/, '$1');
          if (!/\d+-\d+/.test(speaker)) {
            console.log('Now speaking: ' + speaker);
            var currentSpeakerVideo = hypervideo.shadowRoot
                .querySelector('video[title^="' + speaker +
                '_(medium_screen)"]');
            if (!currentSpeakerVideo) {
              currentSpeakerVideo = hypervideo.shadowRoot
                .querySelector('video[title^="Brick_and_Margaret"]');
            }
            currentSpeakerVideo.click();
          }
        }


      });
    });


    hypervideo.appendChild(iframe);

    var subtitles = document.createElement('polymer-track-subtitles');
    var textTrackFile = createTextTrack(transcriptHtml, lines);
    subtitles.setAttribute('src', textTrackFile);
    subtitles.setAttribute('displaysubtitlesgroup', false);
    subtitles.style.display = 'none';
    hypervideo.appendChild(subtitles);

    var chapters = document.createElement('polymer-track-chapters');
    chapters.setAttribute('src', '../' + video
        .replace('videos', 'digital-heritage/vtt')
        .replace('.mp4', '.vtt'));
    chapters.setAttribute('width', 398);
    chapters.setAttribute('displaychaptersthumbnails', false);
    chapters.style.position = 'absolute';
    chapters.style.top = '355px';
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

  (function() {
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
      tmpTrack.src = video.replace('/videos/', '/srt/').replace('.mp4', '.srt');
      tmpTrack.track.mode = 'showing';
      tmpTrack.addEventListener('load', function() {
        var lines = {};
        for (var i = 0, lenI = tmpTrack.track.cues.length; i < lenI; i++) {
          var cue = tmpTrack.track.cues[i];
          lines[cue.text.replace(/^(\d+-\d+).*?$/, '$1')] = {
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
      source1.src = video;
      container.appendChild(tmpVideo);
    });
  })();
};


(function() {
  'use strict';
  var videoSelect = document.querySelector('#videoSelect');
  var cueSelect = document.querySelector('#cueSelect');
  var sceneSelect = document.querySelector('#sceneSelect');

  var index = 0;
  var video = false;
  var videoId = false;
  var cueId = false;

  var videoSelectChange = function() {
    if (videoSelect.selectedIndex < 0) {
      videoSelect.selectedIndex = 0;
    }
    var cueId = document.location.hash.substr(1).split('/')[1] || '';
    if (!cueId) {
      cueSelect.selectedIndex = 0;
    }
    index = videoSelect.options[videoSelect.selectedIndex].value || 0;
    video = VIDEO_DATA[index].video;
    videoId = VIDEO_DATA[index].id;
    var transcript = 'http://spectacleenlignes.fr/plateforme/ctb';
    var title = videoId.replace(/-/g, ' ').replace(/_(.*?)$/, ' ($1)');
    history.pushState({}, 'Spectacle en Ligne(s)—' + title, '#' + videoId);
    return createHypervideo(video, videoId, transcript);
  };
  videoSelect.addEventListener('change', videoSelectChange);

  var cueSelectChange = function() {
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
    document.addEventListener('ldf-query-streaming-response-end', function() {
      var event = new CustomEvent('currenttimeupdate', { detail: {
        currentTime: start
      }});
      document.dispatchEvent(event);
    });
  };
  cueSelect.addEventListener('change', cueSelectChange);

  var sceneSelectChange = function() {
    if (sceneSelect.selectedIndex < 0) {
      sceneSelect.selectedIndex = 0;
    }
    var value = sceneSelect.options[sceneSelect.selectedIndex].value;
    var cue = value.split('—')[0];
    var start = value.split('—')[1];
    var video = value.split('—')[2];
    var title = video.replace(/-/g, ' ').replace(/_(.*?)$/, ' ($1)');
    if (videoId !== video) {
      // we navigate to a new video
      videoSelect.value = videoLookUp[video].index;
      videoSelectChange();
      history.pushState({}, 'Spectacle en Ligne(s)—' + title, '#' + video + '/' +
          cue);
      document.addEventListener('ldf-query-streaming-response-end', function() {
        var event = new CustomEvent('currenttimeupdate', { detail: {
          currentTime: start
        }});
        document.dispatchEvent(event);
      });
    } else {
      // we stay on the same video
      history.pushState({}, 'Spectacle en Ligne(s)—' + title, '#' + video +
          '/' + cue);
      var event = new CustomEvent('currenttimeupdate', { detail: {
        currentTime: start
      }});
      document.dispatchEvent(event);
    }
  };
  sceneSelect.addEventListener('change', sceneSelectChange);

  var functions = {};
  var videoLookUp = {};
  var cueLookUp = {};
  var webVttParser = new WebVTTParser();
  VIDEO_DATA.forEach(function(video, i) {
    // check if the .vtt-s exist
    var url =  video.video.replace('.mp4', '.srt')
        .replace('./videos/', './srt/');
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
      xhr.open('get', url, true);
      xhr.send();
    };
  });
  async.parallel(
    functions,
    function() {
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

      for (var vid in videoLookUp) {
        var optgroup = document.createElement('optgroup');
        optgroup.label = vid.replace(/-/g, ' ').replace(/_(.*?)$/, ' ($1)');
        sceneSelect.appendChild(optgroup);
        videoLookUp[vid].cues.forEach(function(cue) {
          var option = document.createElement('option');
          option.textContent = cue.cue;
          option.value = cue.cue + '—' + cue.start + '—' + vid;
          optgroup.appendChild(option);
        });
      }

      var prevIteration = document.querySelector('#prevIteration');
      var nextIteration = document.querySelector('#nextIteration');
      var prevCue = document.querySelector('#prevCue');
      var nextCue = document.querySelector('#nextCue');

      prevIteration.addEventListener('click', function() {
        if (cueSelect.selectedIndex > 0) {
          cueSelect.selectedIndex--;
          cueSelectChange();
        }
      });
      nextIteration.addEventListener('click', function() {
        if (cueSelect.selectedIndex < cueSelect.length) {
          cueSelect.selectedIndex++;
          cueSelectChange();
        }
      });
      prevCue.addEventListener('click', function() {
        if (sceneSelect.selectedIndex > 0) {
          sceneSelect.selectedIndex--;
          sceneSelectChange();
        }
      });
      nextCue.addEventListener('click', function() {
        if (sceneSelect.selectedIndex < sceneSelect.length) {
          sceneSelect.selectedIndex++;
          sceneSelectChange();
        }
      });

      if (document.location.hash) {
        videoId = document.location.hash.substr(1).split('/')[0];
        cueId = document.location.hash.substr(1).split('/')[1] || '';
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