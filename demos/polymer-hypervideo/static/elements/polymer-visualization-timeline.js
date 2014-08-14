'use strict';

Polymer('polymer-visualization-timeline', {
  overlays: '',
  actors: '',
  chapters: '',
  height: 0,
  width: 0,
  duration: 0,
  currentTime: 0,
  created: function() {
  },
  ready: function() {
    var container = this.$.container;
    var settings = this.$.settings;
    var zoom = this.$.zoom;
    var timeline = this.$.timeline;
    var that = this;
    var maxLevel = -1;
    var lastInserted = { start: -1, end: -1 };
    var kinds = {};
    var legend = {};
    var eventsReceived = {};
    var annotationsElements = [];

    zoom.addEventListener('input', function() {
      console.log('Received event (zoom): input');
      container.style.fontSize = this.value + 'px';
    });

    var addTimeMarker = function() {
      var timeMarker = document.createElement('div');
      timeMarker.classList.add('timeMarker');
      if (that.orientation === 'landscape') {
        timeMarker.style.width = '1px';
        timeMarker.style.height = '100%';
      } else {
        timeMarker.style.width = '100%';
        timeMarker.style.height = '1px';
      }
      container.appendChild(timeMarker);
      var currentTimeMarkerPosition = {
        x: timeMarker.style.marginLeft,
        y: timeMarker.style.marginTop
      };
      container.addEventListener('mouseenter', function() {
        console.log('Received event (container): mouseenter');
        currentTimeMarkerPosition = {
          x: timeMarker.style.marginLeft,
          y: timeMarker.style.marginTop
        };
      });

      document.addEventListener('hypervideotimeupdate', function(e) {
        // console.log('Received event (document): hypervideotimeupdate');
        var currentTime = e.detail.currentTime;

        if (that.orientation === 'landscape') {
          timeMarker.style.marginLeft = currentTime + 'em';
        } else {
          timeMarker.style.marginTop = currentTime + 'em';
        }
        for (var i = 0, lenI = annotationsElements.length; i < lenI; i++) {
          if ((annotationsElements[i].dataset.start <= currentTime) &&
              (currentTime < annotationsElements[i].dataset.end)) {
            annotationsElements[i].classList.add('current');
          } else {
            annotationsElements[i].classList.remove('current');
          }
        }
      });

      container.addEventListener('mouseleave', function() {
        console.log('Received event (container): mouseleave');
        timeMarker.style.marginLeft = currentTimeMarkerPosition.x;
        timeMarker.style.marginTop = currentTimeMarkerPosition.y;
      });

      container.addEventListener('mousemove', function(e) {
        console.log('Received event (container): mousemove');
        var current = e.target;
        while (current !== container) {
          current = current.parentNode;
        }
        var offsetLeft = 0;
        var offsetTop = 0;
        if (current.offsetParent) {
          do {
            offsetLeft += current.offsetLeft;
            offsetTop += current.offsetTop;
          } while (current = current.offsetParent);
        }
        var fontSize = parseInt(getComputedStyle(container)
            .fontSize.replace('px', ''), 10);
        if (that.orientation === 'landscape') {
          var xEm = (e.clientX - offsetLeft) / fontSize;
          timeMarker.style.marginLeft = xEm + 'em';
        } else {
          var yEm = (e.clientY - offsetTop) / fontSize;
          timeMarker.style.marginTop = yEm + 'em';
        }
      });

      container.addEventListener('click', function(e) {
        console.log('Received event (container): click');
        var current = e.target;
        if (current === container) {
          var fontSize = parseInt(getComputedStyle(container)
              .fontSize.replace('px', ''), 10);
          var currentTime;
          if (that.orientation === 'landscape') {
            currentTime = (e.offsetX - timeline.scrollLeft) / fontSize;
          } else {
            currentTime = (e.offsetY - timeline.scrollTop) / fontSize;
          }
          // console.log('Fired event: currenttimeupdate');          
          return that.fire(
            'currenttimeupdate',
            {
              currentTime: currentTime
            }
          );
        } else {
          while ((!current.classList.contains('annotations')) &&
                 (!current.classList.contains('actors')) &&
                 (!current.classList.contains('overlays')) &&
                 (!current.classList.contains('chapters'))) {
            current = current.parentNode;
          }
          // console.log('Fired event: currenttimeupdate');          
          that.fire(
            'currenttimeupdate',
            {
              currentTime: current.dataset.start
            }
          );
        }
      }, false);
    };

    settings.addEventListener('click', function(e) {
      console.log('Received event (settings): click');
      var current = e.target;
      if (current.nodeName.toLowerCase() === 'label') {
        current = current.previousSibling;
      }
      var annotationType = current.dataset.annotationType;
      var display = current.checked ? 'block' : 'none';
      var markers = container.querySelectorAll('.' + annotationType);
      for (var i = 0, lenI = markers.length; i < lenI; i++) {
        var marker = markers[i];
        marker.style.display = display;
      }
    });

    document.addEventListener('hypervideoloadedmetadata', function(e) {
      console.log('Received event (document): hypervideoloadedmetadata');
      var data = e.detail;
      that.duration = data.duration;
      that.height = data.height;
      that.width = data.width;

      var fontSize = parseInt(getComputedStyle(container)
          .fontSize.replace('px', ''), 10);
      var scalingFactor = 50 / that.duration;
      if (that.orientation === 'landscape') {
        container.style.height = that.height + 'px';
        container.style.width = (that.duration * scalingFactor) + 'em';
        container.style.backgroundImage = 'linear-gradient(' +
            '90deg,' +
            'transparent ' + (fontSize - 1) + 'px,' +
            '#eee ' + (fontSize - 1) + 'px,' +
            '#eee ' + fontSize + 'px,' +
            'transparent ' + fontSize + 'px)';
        container.style.backgroundSize = '1em 100%';

        timeline.style.float = 'left';
        timeline.style.height = container.style.height;
        // the timeline width should be at max double the video width
        var timelineWidth =
            that.width * 2 > that.duration * scalingFactor * fontSize ?
                that.duration * scalingFactor * fontSize : that.width * 2;
        timeline.style.width = timelineWidth + 'px';
        timeline.style.overflowX = 'auto';
        timeline.style.overflowY = 'hidden';

        settings.style.height = timeline.style.height;
        settings.style.width = '200px';
        settings.style.marginLeft = timeline.style.width;
      } else {
        container.style.width = that.width + 'px';
        container.style.height = (that.duration * scalingFactor) + 'em';
        container.style.backgroundImage = 'linear-gradient(' +
            '0deg,' +
            'transparent ' + (fontSize - 1) + 'px,' +
            '#eee ' + (fontSize - 1) + 'px,' +
            '#eee ' + fontSize + 'px,' +
            'transparent ' + fontSize + 'px)';
        container.style.backgroundSize = '100% 1em';

        timeline.style.width = container.style.width;
        timeline.style.height = (that.height * 2) + 'px';
        timeline.style.overflowY = 'auto';
        timeline.style.overflowX = 'hidden';

        settings.style.width = timeline.style.width;
      }
    });

    document.addEventListener('cuesread', function(e) {
      console.log('Received event (document): cuesread');
      var data = e.detail;
      if (data.kind === 'chapters') {
        addAnnotations(data.cueData);
      }
    }, false);

    document.addEventListener('dataannotations', function(e) {
      console.log('Received event (document): dataannotations');
      if (eventsReceived.dataannotations) {
        return;
      }
      eventsReceived.dataannotations = true;
      var annotations = e.detail.dataAnnotations;
      addAnnotations(annotations);
    }, false);

    var addAnnotations = function(annotations) {
      var lastType = '';
      annotations.sort(function(a, b) {
        return b.type - a.type;
      });
      var level = ++maxLevel;
      annotations.forEach(function(annotation) {
        var annotationMarker = document.createElement('div');
        annotationsElements.push(annotationMarker);
        container.appendChild(annotationMarker);
        var start = annotation.start;
        var end = annotation.end;
        var div = document.createElement('div');
        kinds[annotation.type] = true;
        div.innerHTML += annotation.type + ' ' + start + '&ndash;' + end;
        annotationMarker.dataset.start = start;
        annotationMarker.dataset.end = end;
        annotationMarker.appendChild(div);
        annotationMarker.classList.add('marker');
        annotationMarker.classList.add(annotation.type);
        annotationMarker.classList.add(annotation.type + '-' + start + '-' +
            end);
        if (lastType && annotation.type !== lastType) {
          level++;
          maxLevel = level;
        }
        lastType = annotation.type;
        if ((start >= lastInserted.start) &&
            (start < lastInserted.end)) {
          level++;
          maxLevel = level;
        }
        if (that.orientation === 'landscape') {
          annotationMarker.style.marginLeft = start + 'em';
          annotationMarker.style.width = (end - start) + 'em';
          annotationMarker.style.height = '1.1em';
          annotationMarker.style.marginTop = (level * 1.2) + 'em';
        } else {
          div.classList.add('rotated');
          annotationMarker.style.marginTop = start + 'em';
          annotationMarker.style.height = (end - start) + 'em';
          annotationMarker.style.width = '1.1em';
          annotationMarker.style.marginLeft = (level * 1.2) + 'em';
        }
        lastInserted = {
          start: start,
          end: end
        };
      });
      Object.keys(kinds).forEach(function(kind) {
        if (!legend[kind]) {
          legend[kind] = true;
          var checkbox = document.createElement('input');
          checkbox.checked = true;
          checkbox.type = 'checkbox';
          checkbox.id = 'checkbox-' + Math.random();
          checkbox.dataset.annotationType = kind;
          var label = document.createElement('label');
          label.classList.add(kind);
          label.setAttribute('for', checkbox.id);
          label.textContent = kind;
          var settingsContainer = document.createElement('div');
          settingsContainer.appendChild(checkbox);
          settingsContainer.appendChild(label);
          settings.appendChild(settingsContainer);
        }
      });
    };

    console.log('Fired event: timelineready');
    that.fire('timelineready');
    addTimeMarker();
  }
});