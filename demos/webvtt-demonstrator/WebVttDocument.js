/* A WebVttDocument represents a metadata track's cues and allows to store them. */

(function (root) {
  var map = Function.prototype.call.bind([].map);
  var ma = 'http://www.w3.org/ns/ma-ont#';

  // Creates a new WebVttDocument
  function WebVttDocument(video, track) {
    this._video = video;
    this.cues = track.cues;
    this._documentId = video.currentSrc + '|' + track.label;
  }

  WebVttDocument.prototype = {
    // Returns a JSON representation of this WebVTT document
    toJSON: function () {
      return JSON.stringify({
        '@context': {
          annotation: 'http://example.org/annotation',
          hasFragment: ma + 'hasFragment',
          MediaResource: ma + 'MediaResource',
          MediaFragment: ma + 'MediaFragment'
        },
        '@id': this._video.currentSrc,
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

    // Writes the WebVTT document to local storage
    writeToStorage: function () {
      localStorage[this._documentId] = this.toJSON();
    },
  };

  // Loads a WebVTT document from local storage (if it exists)
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

  // Removes a WebVTT document from local storage
  WebVttDocument.removeFromStorage = function (video, trackLabel) {
    var documentId = video.currentSrc + '|' + trackLabel;
    delete localStorage[documentId];
  };

  root.WebVttDocument = WebVttDocument;
})(window);
