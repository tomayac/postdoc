(function (root) {
  var forEach = Function.prototype.call.bind([].forEach);

  function Video(element) {
    // add prototype functions
    for (var name in Video.prototype)
      element[name] = Video.prototype[name];

    // set properties
    element._plugins = new WebVttPlugins(element);
    element.metadataTracks = [];
    forEach(element.textTracks, function (track) {
      if (track.kind === 'metadata') {
        element.metadataTracks.push(track);
        track.mode = 'hidden';
        track.addEventListener('cuechange', function () { element.applyCues(track.activeCues); });
      }
    });
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
  };

  root.Video = Video;
})(window);
