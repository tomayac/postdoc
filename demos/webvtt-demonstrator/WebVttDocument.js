(function (root) {
  var map = Function.prototype.call.bind([].map);
  var ma = 'http://www.w3.org/ns/ma-ont#';

  function WebVttDocument(video, track) {
    this._video = video;
    this.cues = track.cues;
    this._documentId = video.currentSrc + '|' + track.label;
  }

  WebVttDocument.prototype = {
    toJSON: function () {
      return JSON.stringify({
        '@context': {
          annotation: 'http://example.org/annotation',
          hasFragment: ma + 'hasFragment',
          MediaResource: ma + 'MediaResource',
          MediaFragment: ma + 'MediaFragment'
        },
        '@id': this._videoUrl,
        '@type': 'MediaResource',
        hasFragment: map(this.cues, function (cue) {
          return {
            '@id': this._video.currentSrc + '#t=' + cue.startTime + ',' + cue.endTime,
            '@type': 'MediaFragment',
            label: cue.id,
            annotations: JSON.parse(cue.text),
          };
        }, this),
      }, null, 2);
    },

    writeToStorage: function () {
      localStorage[this._documentId] = this.toJSON();
    },
  };

  WebVttDocument.loadFromStorage = function (video, trackLabel) {
    var documentId = video.currentSrc + '|' + trackLabel;
    if (!(documentId in localStorage)) return;

    var documentObject = JSON.parse(localStorage[documentId]),
        cues = documentObject.hasFragment.map(function (fragment) {
          var times = fragment['@id'].match(/#t=([.0-9]+),([.0-9]+)/),
              cue = new TextTrackCue(times[1], times[2], JSON.stringify(fragment.annotations));
          cue.id = fragment.label;
          return cue;
        });
    return new WebVttDocument(video, { cues: cues, label: trackLabel });
  };

  WebVttDocument.removeFromStorage = function (video, trackLabel) {
    var documentId = video.currentSrc + '|' + trackLabel;
    delete localStorage[documentId];
  };

  root.WebVttDocument = WebVttDocument;
})(window);
