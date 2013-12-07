(function (root) {
  var map = Function.prototype.call.bind([].map);
  var ma = 'http://www.w3.org/ns/ma-ont#';

  function WebVttDocument(video, cues) {
    this._video = video;
    this._cues = cues;
  }

  WebVttDocument.prototype = {
    toJSON: function () {
      return {
        '@context': {
          annotation: 'http://example.org/annotation',
          hasFragment: ma + 'hasFragment',
          MediaResource: ma + 'MediaResource',
          MediaFragment: ma + 'MediaFragment'
        },
        '@id': this._videoUrl,
        '@type': 'MediaResource',
        hasFragment: map(this._cues, function (cue) {
          return {
            '@id': this._video.currentSrc + '#t=' + cue.startTime + ',' + cue.endTime,
            '@type': 'MediaFragment',
            annotations: JSON.parse(cue.text),
          };
        }, this),
      };
    },
  };

  root.WebVttDocument = WebVttDocument;
})(window);
