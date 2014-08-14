'use strict';

/* global queryRegExSelector, queryRegExSelectorAll, getYouTubeHtml5VideoUrl */
Polymer('polymer-hypervideo', {
  publish: {
    currentTime: 0,
    duration: 0,
    height: 0,
    width: 0,
    actorsOffset: {}
  },
  created: function() {
  },
  ready: function() {
    var that = this;
    var spinner;
    var video = that.$.hypervideo;
    var CORS_PROXY = document.location.href + 'cors/';

    document.addEventListener('webcomponentstocready', function() {
      console.log('Received event (document): webcomponentstocready');
      // get all child <polymer-*> child nodes
      var webComponents = queryRegExSelectorAll(that, /^polymer-/gi);
      console.log('Fired event: webcomponentstoc');
      that.fire(
        'webcomponentstoc',
        {
          webComponentsToC: webComponents
        }
      );
    }, false);

    document.addEventListener('timelineready', function() {
      console.log('Received event (document): timelineready');
      // get all child <polymer-data-*> child nodes
      var dataAnnotations = queryRegExSelectorAll(that, /^polymer-data-/gi);
      var annotations = [];
      dataAnnotations.forEach(function(annotation) {
        var type;
        if (/actor/gi.test(annotation.nodeName)) {
          type = 'actors';
        } else if (/overlay/gi.test(annotation.nodeName)) {
          type = 'overlays';
        } else {
          type = 'annotations';
        }
        annotations.push({
          start: parseInt(annotation.getAttribute('start'), 10),
          end: parseInt(annotation.getAttribute('end'), 10),
          type: type
        });
      });
      console.log('Fired event: dataannotations');
      that.fire(
        'dataannotations',
        {
          dataAnnotations: annotations
        }
      );
    }, false);

    // listen for events coming from the timeline component
    document.addEventListener('currenttimeupdate', function(e) {
      // console.log('Received event (document): currenttimeupdate');
      var data = e.detail;
      video.currentTime = data.currentTime;
      video.play();
    }, false);

    document.addEventListener('requeststillframes', function(e) {
      console.log('Received event (document): requeststillframes');
      var cues = e.detail.cues;
      var functions = [];
      cues.forEach(function(cue) {
        var start = cue.start;
        if (start > video.duration) {
          return;
        }
        functions.push({
          cue: cue,
          func: function() {
            video.currentTime = start;
          }
        });
      });
      var getNextStillFrame = function() {
        that.ctx.drawImage(video, 0, 0, video.clientWidth,
            video.clientHeight);
        var img = document.createElement('img');
        img.setAttribute('class', 'hypervideo');
        var url = that.canvas.toDataURL();
        img.src = url;
        var cue = functions[processedStillFrames].cue;
        console.log('Fired event: receivestillframe');
        that.fire(
          'receivestillframe',
          {
            img: img,
            text: cue.text,
            start: cue.start,
            end: cue.end
          }
        );
        processedStillFrames++;
        if (functions[processedStillFrames]) {
          functions[processedStillFrames].func();
        } else {
          video.removeEventListener('seeked', getNextStillFrame);
          spinner.remove();
        }
      };
      var processedStillFrames = 0;
      video.addEventListener('seeked', getNextStillFrame);
      console.log('Received event (video): seeked');
      functions[processedStillFrames].func();
    });

    document.addEventListener('trackready', function(e) {
      console.log('Received event (document): trackready');
      var data = e.detail;
      var track = document.createElement('track');
      track.addEventListener('load', function(e) {
        console.log('Received event (track): load');
        return readCues(e.target.track.cues, data.kind);
      }, false);
      track.default = true;
      track.src = data.src;
      track.kind = data.kind;
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        track.srclang = 'en';
      } else if (track.kind === 'chapters') {
        var canvas = document.createElement('canvas');
        canvas.width = video.width;
        canvas.height = video.height;
        var ctx = canvas.getContext('2d');
        that.ctx = ctx;
        that.canvas = canvas;
      }
      video.appendChild(track);
    }, false);

    var initializeVideo = function() {
      // either add sources for regular video
      if (that.src) {
        that.src.split(/\s/g).forEach(function(src) {
          var source = document.createElement('source');
          source.src = src;
          video.appendChild(source);
        });
      // or add sources for YouTube video
      } else if (that.youtubevideoid) {
        getYouTubeHtml5VideoUrl(that.youtubevideoid,
            function(err, videoSources) {
          if (err) {
            return;
          }
          for (var videoSource in videoSources) {
            videoSource = videoSources[videoSource];
            var source = document.createElement('source');
            source.src = CORS_PROXY +
                encodeURIComponent(videoSource.original_url);
            source.type = videoSource.type.replace(/\+/g, ' ')
                .replace(/"/g, '\"');
            video.appendChild(source);
          }
        });
      }
      // determine video dimensions
      video.height = that.height || video.offsetHeight;
      video.width = that.width || video.offsetWidth;
      // add poster
      if (that.poster) {
        video.poster = that.poster;
      }
      // mute video
      if (that.muted !== null) {
        video.muted = true;
      }
    };

    var showSpinner = function() {
      // show spinner while the hypervideo gets prepared
      var splashDiv = document.createElement('div');
      splashDiv.classList.add('spinner');
      var splashSpinner = document.createElement('div');
      splashSpinner.classList.add('progress');
      splashDiv.appendChild(splashSpinner);
      splashDiv.style.width = video.width + 'px';
      splashDiv.style.height = video.height + 'px';
      splashDiv.style.position = 'absolute';
      splashDiv.style.top = video.offsetTop + 'px';
      splashDiv.style.left = video.offsetLeft + 'px';
      splashSpinner.style.position = 'relative';
      splashSpinner.style.top = (video.offsetHeight / 2 - 60 / 2) + 'px';
      splashSpinner.style.left = (video.offsetWidth / 2 - 60 / 2) + 'px';
      var loadingDiv = document.createElement('div');
      loadingDiv.textContent = '*';
      splashSpinner.appendChild(loadingDiv);
      var container = that.$.container;
      container.appendChild(splashDiv);
      return splashDiv;
    };

    var positionDataAnnotations = function() {
      // positions data annotations on top of the video
      var polymerData = queryRegExSelectorAll(that, /^polymer-data-/gi);
      polymerData.forEach(function(node) {
        node.style.position = 'absolute';
        node.style.top = (video.offsetTop + 0.66 * video.offsetHeight) +
            'px';
        node.style.left = (video.offsetLeft + (0.05 * that.width)) + 'px';
        node.style.width = (0.9 * that.width) + 'px';
        node.style.display = 'none';
      });
    };

    var readCues = function(cues, kind) {
      var cueData = [];
      for (var i = 0, lenI = cues.length; i < lenI; i++) {
        var cue = cues.item(i);
        cueData.push({
          start: parseInt(cue.startTime, 10),
          end: parseInt(cue.endTime, 10),
          text: cue.text,
          id: cue.id,
          type: kind
        });
      }
      console.log('Fired event: cuesread');
      that.fire(
        'cuesread',
        {
          cueData: cueData,
          kind: kind
        }
      );
    };

    video.addEventListener('loadedmetadata', function() {
      console.log('Received event (video): loadedmetadata');
      that.duration = video.duration;
      // adjust the timeline dimensions according to the video duration
      var polymerTimelines = that.querySelectorAll('polymer-timeline');
      for (var i = 0, lenI = polymerTimelines.length; i < lenI; i++) {
        polymerTimelines[i].style.left = (video.offsetLeft +
            (0.05 * that.width)) + 'px';
      }
      var polymerData = queryRegExSelector(that, /^polymer-data-/gi);
      console.log('Fired event: hypervideoloadedmetadata');
      that.fire(
        'hypervideoloadedmetadata',
        {
          duration: that.duration,
          height: that.height,
          width: that.width,
          actorsOffset: {
            left: polymerData.style.left.replace('px', ''),
            top: polymerData.style.top.replace('px', '')
          }
        }
      );
    }, false);

    // publish timeupdate events
    video.addEventListener('timeupdate', function() {
      // console.log('Received event (video): timeupdate');
      that.currentTime = video.currentTime;
      // console.log('Fired event: hypervideotimeupdate');
      that.fire(
        'hypervideotimeupdate',
        {
          currentTime: that.currentTime
        }
      );
    }, false);

    (function() {
      initializeVideo();
      spinner = showSpinner();
      positionDataAnnotations();
    })();

  }
});