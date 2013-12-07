(function (root) {
  var forEach = Function.prototype.call.bind([].forEach);
  var filter  = Function.prototype.call.bind([].filter);

  function Video(element) {
    // add prototype functions
    for (var name in Video.prototype)
      element[name] = Video.prototype[name];

    // find or create main metadata track
    var metadataTracks = filter(element.textTracks, function (t) { return t.kind === 'metadata' }),
        metadataTrack = metadataTracks[0] || element.addTextTrack('metadata');
    metadataTrack.mode = 'hidden';
    metadataTrack.addEventListener('cuechange', function () { element.applyCues(this.activeCues); });

    // set properties
    element.metadataTrack = metadataTrack;
    element._plugins = new WebVttPlugins(element);
    return element;
  }

  Video.prototype = {
    applyCue: function (cue) {
      var cueData = JSON.parse(cue.text);
      for (var pluginName in cueData)
        if (this._plugins[pluginName])
          this._plugins[pluginName](cue, cueData[pluginName]);
    },

    applyCues: function (cues) {
      forEach(cues, this.applyCue.bind(this));
    },

    getWebVttDocument: function () {
      return new WebVttDocument(this, this.metadataTrack.cues);
    },
  };

  root.Video = Video;
})(window);
