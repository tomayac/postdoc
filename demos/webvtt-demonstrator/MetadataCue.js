/* A MetadataCue allows to activate specific metadata properties of a TextTrackCue. */

(function (root) {
  var filter = Function.prototype.call.bind([].filter);

  // Creates a new MetadataCue associated with the specified TextTrackCue
  function MetadataCue(video, baseCue) {
    // only instantiate one MetadataCue per TextTrackCue
    if (baseCue._metadataCue)
      return baseCue._metadataCue;

    // set properties
    this._video = video;
    this._baseCue = baseCue;
    baseCue._metadataCue = this;

    // parse JSON data from the original TextTrackCue
    var cueData = baseCue.text ? JSON.parse(baseCue.text) : {},
        cueSettings = this._cueSettings = {};
    for (var key in this._activators)
      cueSettings[key] = cueData[key];

    // find or create a track to which textual cues will be added
    var visibleTracks = filter(video.textTracks,
                               function (t) { return t.mode === 'showing' || t.default; });
    this._textTrack = visibleTracks[0] || video.addTextTrack('captions');
  }

  var prototype = MetadataCue.prototype = {
    // Functions that activate specific metadata properties
    _activators: {},

    // Functions that deactivate specific metadata properties
    _deactivators: {},

    // Gets and sets the ID of the cue
    get id() { return this._baseCue.id; },
    set id(value)   { this._baseCue.id = value; },

    // Gets and sets the start time of the cue
    get startTime() { return this._baseCue.startTime; },
    set startTime(value)   { this._baseCue.startTime = value; },

    // Gets and sets the end time of the cue
    get endTime() { return this._baseCue.endTime; },
    set endTime(value)   { this._baseCue.endTime = value; },

    // Activates all properties of this cue
    activate: function () {
      if (!this._activated) {
        this._activated = true;
        for (var key in this._activators) {
          var settings = this._cueSettings[key];
          if (settings)
            this._activators[key].call(this, settings);
        }
      }
    },

    // Deactivates all properties of this cue
    deactivate: function () {
      if (this._activated) {
        this._activated = false;
        for (var key in this._deactivators) {
          var deactivator = this._deactivators[key];
          deactivator && deactivator.call(this);
        }
      }
    },

    // If activated, reactivates the properties of this cue to reflect changes
    refresh: function () {
      if (this._activated) {
        this.deactivate();
        this.activate();
      }
    },

    // Returns a JSON representation of this cue
    toJSON: function () {
      var settings = { '@context': 'http://example.org/json-ld/contexts/context.jsonld' };
      for (var key in this._cueSettings)
        if (this._cueSettings[key])
          settings[key] = this._cueSettings[key];
      return JSON.stringify(settings, null, 2);
    },
  };

  // Defines a metadata property supported by MetadataCue
  function defineMetadataCueProperty(name, parse, activator, deactivator) {
    Object.defineProperty(prototype, name, {
      get: function () {
        return this._cueSettings[name];
      },
      set: function (value) {
        this._cueSettings[name] = parse ? parse(value) : value;
        this._baseCue.text = this.toJSON();
        this.refresh();
      },
    });
    prototype._activators[name] = activator;
    prototype._deactivators[name] = deactivator;
  }

  // The `tags` property displays tags for a certain scene
  defineMetadataCueProperty('tags',
    function parse(value) { return value.split(/\s*,\s*/); },
    function activate(tags) {
      var text = '<v.meta-tags>Scene Tags: ' + tags.join(', '),
          cue = this._tagsCue = new TextTrackCue(this.startTime, this.endTime, text);
      this._textTrack.addCue(cue);
    },
    function deactivate() {
      this._tagsCue && this._textTrack.removeCue(this._tagsCue);
      delete this._tagsCue;
    });

  // The `actors` property displays actor names
  defineMetadataCueProperty('actors',
    function parse(value) { return value.split(/\s*,\s*/); },
    function activate(actors) {
      var text = '<v.meta-scene-actors>Scene Actors: ' + actors.join(', '),
          cue = this._actorsCue = new TextTrackCue(this.startTime, this.endTime, text);
      this._textTrack.addCue(cue);
    },
    function deactivate() {
      this._actorsCue && this._textTrack.removeCue(this._actorsCue);
      delete this._actorsCue;
    });

  // The `volume` property sets the volume
  defineMetadataCueProperty('volume',
    function parse(value) { return parseFloat(value); },
    function activate(volume) { this._video.volume = volume; });

  // The `playbackRate` property sets the playback rate
  defineMetadataCueProperty('playbackRate',
    function parse(value) { return parseFloat(value); },
    function activate(playbackRate) { this._video.playbackRate = playbackRate; });

  // The `style` property applies a CSS style to the video
  defineMetadataCueProperty('style', null,
    function activate(style) {
      var styleElement = this._styleElement = document.createElement('style');
      styleElement.setAttribute('type', 'text/css');
      styleElement.textContent = 'video {' + style + '}';
      document.head.appendChild(styleElement);
    },
    function deactivate() {
      this._styleElement && document.head.removeChild(this._styleElement);
      delete this._styleElement;
    });

  // The `spatialFragment` property highlights a spatial fragment
  defineMetadataCueProperty('spatialFragment', null,
    function activate(coordinates) {
      var xywh = coordinates.match(/^xywh=(\d+),(\d+),(\d+),(\d+)/);
      if (xywh) {
        var rectangle = this._rectangle = document.createElement('div');
        rectangle.classList.add('highlight');
        rectangle.style.left   = (this._video.offsetLeft + parseInt(xywh[1], 10)) + 'px';
        rectangle.style.top    = (this._video.offsetTop  + parseInt(xywh[2], 10)) + 'px';
        rectangle.style.width  = xywh[3] + 'px';
        rectangle.style.height = xywh[4] + 'px';
        document.body.appendChild(rectangle);
      }
    },
    function deactivate() {
      this._rectangle && document.body.removeChild(this._rectangle);
      delete this._rectangle;
    });

  root.MetadataCue = MetadataCue;
})(window);

