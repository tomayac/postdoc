(function (root) {
  var map = Array.prototype.map;
  var ma = 'http://www.w3.org/ns/ma-ont#';

  function WebVttDocument(cues, videoUrl) {
    this._cues = cues;
    this._videoUrl = videoUrl;
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
        hasFragment: map.call(this._cues, function (cue) {
          return {
            '@id': this._videoUrl + '#t=' + cue.startTime + ',' + cue.endTime,
            '@type': 'MediaFragment',
            annotations: JSON.parse(cue.text),
          };
        }),
      };
    },
  };

  root.WebVttDocument = WebVttDocument;
})(window);
