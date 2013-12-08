/* A Video extends the HTML5 `video` element to display metadata cues. */

(function (root) {
  var forEach = Function.prototype.call.bind([].forEach);
  var filter  = Function.prototype.call.bind([].filter);

  // Extends the `video` element with metadata cue functionality
  function Video(element) {
    // add prototype functions
    for (var name in Video.prototype)
      element[name] = Video.prototype[name];

    // find or create main metadata track
    var metadataTracks = filter(element.textTracks, function (t) { return t.kind === 'metadata'; }),
        metadataTrack = metadataTracks[0] || element.addTextTrack('metadata'),
        storedTrack = WebVttDocument.loadFromStorage(element, metadataTrack.label);
    // try to load an edited version of the track from storage
    storedTrack && element.addEventListener('loadedmetadata', function () {
      while (metadataTrack.cues.length !== 0)
        metadataTrack.removeCue(metadataTrack.cues[0]);
      storedTrack.cues.forEach(function (cue) { metadataTrack.addCue(cue); });
    });
    // listen to cue changes
    metadataTrack.mode = 'hidden';
    metadataTrack.addEventListener('cuechange', function () { element.activateCues(this.activeCues); });
    element.metadataTrack = metadataTrack;

    return element;
  }

  Video.prototype = {
    // Makes the cue active until it is no longer in the active cues list
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

    // Activate the cues until they are no longer in the active cues list
    activateCues: function (cues) {
      forEach(cues, this.activateCue, this);
    },

    // Get the WebVTT document associated with this video's metadata track
    getWebVttDocument: function () {
      return new WebVttDocument(this, this.metadataTrack);
    },
  };

  root.Video = Video;
})(window);
