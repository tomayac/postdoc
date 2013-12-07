(function (root) {
  var forEach = Function.prototype.call.bind([].forEach);
  var filter  = Function.prototype.call.bind([].filter);

  function Video(element) {
    // add prototype functions
    for (var name in Video.prototype)
      element[name] = Video.prototype[name];

    // find or create main metadata track
    var metadataTracks = filter(element.textTracks, function (t) { return t.kind === 'metadata'; }),
        metadataTrack = metadataTracks[0] || element.addTextTrack('metadata');
    metadataTrack.mode = 'hidden';
    metadataTrack.addEventListener('cuechange', function () { element.activateCues(this.activeCues); });
    element.metadataTrack = metadataTrack;

    return element;
  }

  Video.prototype = {
    activateCue: function (cue) {
      var metadataCue = new MetadataCue(this, cue);
      metadataCue.activate();

      // remove the cue when it's no longer among the active cues
      this.metadataTrack.addEventListener('cuechange',
        function deactivate() {
          var isActive = filter(this.activeCues, function (c) { return c === cue; }).length !== 0;
          if (!isActive) {
            metadataCue.deactivate();
            this.removeEventListener('cuechange', deactivate);
          }
        });
    },

    activateCues: function (cues) {
      forEach(cues, this.activateCue, this);
    },

    getWebVttDocument: function () {
      return new WebVttDocument(this, this.metadataTrack.cues);
    },
  };

  root.Video = Video;
})(window);
