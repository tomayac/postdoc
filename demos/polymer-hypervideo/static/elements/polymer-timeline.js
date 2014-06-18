'use strict';

Polymer('polymer-timeline', {
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
    var maxLevel = 0;

    zoom.addEventListener('input', function() {
      container.style.fontSize = this.value + 'px';
    });

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

    settings.addEventListener('click', function(e) {
      var current = e.target;
      if (current.nodeName.toLowerCase() === 'label') {
        current = current.previousSibling;
      }
      var annotationType = current.dataset.annotationType;
      var display = current.checked ? 'block' : 'none';
      var markers = container.querySelectorAll('.' + annotationType +
          'Marker');
      for (var i = 0, lenI = markers.length; i < lenI; i++) {
        var marker = markers[i];
        marker.style.display = display;
      }
    });

    var currentTimeMarkerPosition = {
      x: timeMarker.style.marginLeft,
      y: timeMarker.style.marginTop
    };
    container.addEventListener('mouseenter', function() {
      currentTimeMarkerPosition = {
        x: timeMarker.style.marginLeft,
        y: timeMarker.style.marginTop
      };
    });

    container.addEventListener('mouseleave', function() {
      timeMarker.style.marginLeft = currentTimeMarkerPosition.x;
      timeMarker.style.marginTop = currentTimeMarkerPosition.y;
    });

    container.addEventListener('mousemove', function(e) {
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
        return that.fire(
          'currenttimeupdate',
          {
            currentTime: currentTime
          }
        );
      } else {
        while ((!current.classList.contains('actorMarker')) &&
               (!current.classList.contains('overlayMarker')) &&
               (!current.classList.contains('chapterMarker'))) {
          current = current.parentNode;
        }
        that.fire(
          'currenttimeupdate',
          {
            currentTime: current.dataset.start
          }
        );
      }
    }, false);

    document.addEventListener('chaptersupdate', function(e) {
      var data = e.detail;
      var occupiedAreas = [];
      that.chapters = data.chapters;
      for (var i = 0, lenI = data.chapters.length; i < lenI; i++) {
        var chapter = data.chapters[i];
        var chapterMarker = document.createElement('div');
        container.appendChild(chapterMarker);
        var start = chapter.startTime;
        var end = chapter.endTime;
        var div = document.createElement('div');
        div.innerHTML += 'Chapter ' + start + '&ndash;' + end;
        chapterMarker.dataset.start = start;
        chapterMarker.dataset.end = end;
        chapterMarker.appendChild(div);
        chapterMarker.classList.add('chapterMarker');
        chapterMarker.classList.add('chapter-' + start + '-' + end);
        var level = maxLevel + 1;
        occupiedAreas.forEach(function(area) {
          if ((start > area.start) &&
              (start < area.end)) {
            level++;
            maxLevel = level;
          }
        });
        if (that.orientation === 'landscape') {
          chapterMarker.style.marginLeft = start + 'em';
          chapterMarker.style.width = (end - start) + 'em';
          chapterMarker.style.height = '1.1em';
          chapterMarker.style.marginTop = (level * 1.2) + 'em';
        } else {
          div.classList.add('rotated');
          chapterMarker.style.marginTop = start + 'em';
          chapterMarker.style.height = (end - start) + 'em';
          chapterMarker.style.width = '1.1em';
          chapterMarker.style.marginLeft = (level * 1.2) + 'em';
        }
        occupiedAreas.push({
          start: start,
          end: end,
          level: level
        });
        occupiedAreas.sort(function(a, b) {
          return b.start - a.start;
        });
      }
      var checkbox = document.createElement('input');
      checkbox.checked = true;
      checkbox.type = 'checkbox';
      checkbox.id = Date.now();
      checkbox.dataset.annotationType = 'chapter';
      var label = document.createElement('label');
      label.classList.add('chapterMarker');
      label.setAttribute('for', checkbox.id);
      label.textContent = 'Chapters';
      var settingsContainer = document.createElement('div');
      settingsContainer.appendChild(checkbox);
      settingsContainer.appendChild(label);
      settings.appendChild(settingsContainer);

    });

    document.addEventListener('hypervideoinnerhtmlupdate', function(e) {
      var data = e.detail;
      var tempDiv = document.createElement('div');
      tempDiv.innerHTML = data.overlays;
      that.overlays = tempDiv.querySelectorAll('polymer-overlay');
      that.timelines = data.timelines;
      that.duration = data.duration;
      that.height = data.height;
      that.width = data.width;

      var fontSize = parseInt(getComputedStyle(container)
          .fontSize.replace('px', ''), 10);
      if (that.orientation === 'landscape') {
        container.style.height = that.height + 'px';
        container.style.width = that.duration + 'em';
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
            that.width * 2 > that.duration * fontSize ?
                that.duration * fontSize : that.width * 2;
        timeline.style.width = timelineWidth + 'px';
        timeline.style.overflowX = 'auto';
        timeline.style.overflowY = 'hidden';

        settings.style.height = timeline.style.height;
        settings.style.width = '200px';
        settings.style.marginLeft = timeline.style.width;
      } else {
        container.style.width = that.width + 'px';
        container.style.height = that.duration + 'em';
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

      var occupiedAreas = [];
      for (var i = 0, lenI = that.overlays.length; i < lenI; i++) {
        var overlay = that.overlays[i];
        var overlayMarker = document.createElement('div');
        container.appendChild(overlayMarker);
        var start = overlay.getAttribute('start');
        var end = overlay.getAttribute('end');
        var div = document.createElement('div');
        div.innerHTML += 'Overlay ' + start + '&ndash;' + end;
        overlayMarker.appendChild(div);
        overlayMarker.dataset.start = start;
        overlayMarker.dataset.end = end;
        overlayMarker.classList.add('overlayMarker');
        overlayMarker.classList.add('overlay-' + start + '-' + end);
        var level = maxLevel;
        occupiedAreas.forEach(function(area) {
          if ((start >= area.start) &&
              (start <= area.end)) {
            level++;
            maxLevel = level;
          }
        });
        if (that.orientation === 'landscape') {
          overlayMarker.style.marginLeft = start + 'em';
          overlayMarker.style.width = (end - start) + 'em';
          overlayMarker.style.height = '1.1em';
          overlayMarker.style.marginTop = (level * 1.2) + 'em';
        } else {
          div.classList.add('rotated');
          overlayMarker.style.marginTop = start + 'em';
          overlayMarker.style.height = (end - start) + 'em';
          overlayMarker.style.width = '1.1em';
          overlayMarker.style.marginLeft = (level * 1.2) + 'em';
        }
        occupiedAreas.push({
          start: start,
          end: end,
          level: level
        });
        occupiedAreas.sort(function(a, b) {
          return b.start - a.start;
        });
      }
      var checkbox = document.createElement('input');
      checkbox.checked = true;
      checkbox.type = 'checkbox';
      checkbox.id = Date.now();
      checkbox.dataset.annotationType = 'overlay';
      var label = document.createElement('label');
      label.classList.add('overlayMarker');
      label.setAttribute('for', checkbox.id);
      label.textContent = 'Overlays';
      var settingsContainer = document.createElement('div');
      settingsContainer.appendChild(checkbox);
      settingsContainer.appendChild(label);
      settings.appendChild(settingsContainer);

      var tempDiv = document.createElement('div');
      tempDiv.innerHTML = data.actors;
      that.actors = tempDiv.querySelectorAll('polymer-actor');
      that.timelines = data.timelines;
      that.duration = data.duration;
      that.height = data.height;
      that.width = data.width;
      var occupiedAreas = [];
      for (var i = 0, lenI = that.actors.length; i < lenI; i++) {
        var actor = that.actors[i];
        var actorMarker = document.createElement('div');
        container.appendChild(actorMarker);
        var start = actor.getAttribute('start');
        var end = actor.getAttribute('end');
        var div = document.createElement('div');
        div.innerHTML += 'Actor ' + start + '&ndash;' + end;
        actorMarker.appendChild(div);
        actorMarker.dataset.start = start;
        actorMarker.dataset.end = end;
        actorMarker.classList.add('actorMarker');
        actorMarker.classList.add('actor-' + start + '-' + end);
        var level = maxLevel;
        occupiedAreas.forEach(function(area) {
          if ((start >= area.start) &&
              (start <= area.end)) {
            level++;
            maxLevel = level;
          }
        });
        if (that.orientation === 'landscape') {
          actorMarker.style.marginLeft = start + 'em';
          actorMarker.style.width = (end - start) + 'em';
          actorMarker.style.height = '1.1em';
          actorMarker.style.marginTop = (level * 1.2) + 'em';
        } else {
          div.classList.add('rotated');
          actorMarker.style.marginTop = start + 'em';
          actorMarker.style.height = (end - start) + 'em';
          actorMarker.style.width = '1.1em';
          actorMarker.style.marginLeft = (level * 1.2) + 'em';
        }
        occupiedAreas.push({
          start: start,
          end: end,
          level: level
        });
        occupiedAreas.sort(function(a, b) {
          return b.start - a.start;
        });
      }
      var checkbox = document.createElement('input');
      checkbox.checked = true;
      checkbox.type = 'checkbox';
      checkbox.id = Date.now();
      checkbox.dataset.annotationType = 'actor';
      var label = document.createElement('label');
      label.classList.add('actorMarker');
      label.setAttribute('for', checkbox.id);
      label.textContent = 'Actors';
      var settingsContainer = document.createElement('div');
      settingsContainer.appendChild(checkbox);
      settingsContainer.appendChild(label);
      settings.appendChild(settingsContainer);

    });

    document.addEventListener('hypervideotimeupdate', function(e) {
      that.currentTime = e.detail.currentTime;

      if (that.orientation === 'landscape') {
        timeMarker.style.marginLeft = that.currentTime + 'em';
      } else {
        timeMarker.style.marginTop = that.currentTime + 'em';
      }

      for (var i = 0, lenI = that.overlays.length; i < lenI; i++) {
        var overlay = that.overlays[i];
        var start = overlay.getAttribute('start');
        var end = overlay.getAttribute('end');
        if ((that.currentTime >= start) && (that.currentTime < end)) {
          var matching =
              container.querySelectorAll('.overlay-' + start + '-' + end);
          for (var j = 0, lenJ = matching.length; j < lenJ; j++) {
            matching[j].classList.add('current');
          }
        } else {
          var nonMatching =
              container.querySelectorAll('.overlay-' + start + '-' + end);
          for (var j = 0, lenJ = nonMatching.length; j < lenJ; j++) {
            nonMatching[j].classList.remove('current');
          }
        }
      }

      for (var i = 0, lenI = that.chapters.length; i < lenI; i++) {
        var chapter = that.chapters[i];
        var start = chapter.startTime;
        var end = chapter.endTime;
        if ((that.currentTime >= start) && (that.currentTime < end)) {
          var matching =
              container.querySelectorAll('.chapter-' + start + '-' + end);
          for (var j = 0, lenJ = matching.length; j < lenJ; j++) {
            matching[j].classList.add('current');
          }
        } else {
          var nonMatching =
              container.querySelectorAll('.chapter-' + start + '-' + end);
          for (var j = 0, lenJ = nonMatching.length; j < lenJ; j++) {
            nonMatching[j].classList.remove('current');
          }
        }
      }

      for (var i = 0, lenI = that.actors.length; i < lenI; i++) {
        var actor = that.actors[i];
        var start = actor.getAttribute('start');
        var end = actor.getAttribute('end');
        if ((that.currentTime >= start) && (that.currentTime < end)) {
          var matching =
              container.querySelectorAll('.actor-' + start + '-' + end);
          for (var j = 0, lenJ = matching.length; j < lenJ; j++) {
            matching[j].classList.add('current');
          }
        } else {
          var nonMatching =
              container.querySelectorAll('.actor-' + start + '-' + end);
          for (var j = 0, lenJ = nonMatching.length; j < lenJ; j++) {
            nonMatching[j].classList.remove('current');
          }
        }
      }

    });
  }
});