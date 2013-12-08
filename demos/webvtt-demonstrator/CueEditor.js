/* A CueEditor allows to edit metadata cues, binding the HTML editor elements to functionality. */

(function (root) {
  var $  = document.querySelector.bind(document);
  var $$ = document.querySelectorAll.bind(document);
  var forEach = Function.prototype.call.bind([].forEach);

  // Creates a new CueEditor
  function CueEditor(video) {
    this._video = video;
  }

  CueEditor.prototype = {
    // Initializes the editor by binding HTML elements to this editor's video
    init: function () {
      var self = this, video = this._video,
          editForm = this._editForm = $('#editor form'),
          name = this._name = $('#name'),
          start = this._start = $('#start'),
          end = this._end = $('#end'),
          properties = this._properties = $$('#editor .property input'),
          cueList = this._cueList = $('#activeCues ul');

      // cue list
      video.metadataTrack.addEventListener('cuechange', function () {
        self._displayCues(video.metadataTrack.activeCues);
      });

      // style control
      name.addEventListener('change', function () {
        self._editedCue.id = name.value;
        self._displayCues(video.metadataTrack.activeCues);
      });

      // property controls
      function onPropertyChange(event) {
        self._editedCue[event.target.id] = event.target.value;
      }
      forEach(properties, function (property) {
        forEach(['change', 'keyup'], function (eventName) {
          property.addEventListener(eventName, onPropertyChange);
        });
      });

      // start and end controls
      video.addEventListener('loadedmetadata', function () {
        start.value = start.min = end.min = 0;
        end.value   = start.max = end.max = Math.floor(video.duration);
      });
      start.addEventListener('change', function () {
        if (parseFloat(end.value) < parseFloat(start.value))
          end.value = start.value;
        self._editedCue.startTime = video.currentTime = start.value;
      });
      end.addEventListener('change', function () {
        if (parseFloat(start.value) > parseFloat(end.value))
          start.value = end.value;
        self._editedCue.endTime = video.currentTime = end.value;
      });

      // close button
      $('#close').addEventListener('click', function () { editForm.classList.add('hidden'); });

      // save button
      $('#save').addEventListener('click', function () {
        new WebVttDocument(video, video.metadataTrack).writeToStorage();
      });

      // reset button
      $('#reset').addEventListener('click', function () {
        WebVttDocument.removeFromStorage(video, video.metadataTrack.label);
        window.location.reload();
      });
    },

    // Displays the specified cues as links that afford editing
    _displayCues: function (cues) {
      this._cueList.innerHTML = '';
      if (cues.length) {
        forEach(cues, function (cue) {
          var cueElement = createChild(this._cueList, 'li'),
              cueLink = createChild(cueElement, 'a', cue.id);
          cueLink.href = 'javascript:';
          cueLink.addEventListener('click', this.editCue.bind(this, cue));
        }, this);
      }
      else {
        createChild(createChild(this._cueList, 'li'), 'em', '(none)');
      }
    },

    // Opens the specified cue in the editor panel
    editCue: function (cue) {
      var metadataCue = new MetadataCue(this._video, cue);
      this._editForm.classList.remove('hidden');
      this._editedCue = metadataCue;
      this._name.value = metadataCue.id;
      this._name.disabled = true;
      this._start.value = metadataCue.startTime;
      this._end.value = metadataCue.endTime;
      forEach(this._properties, function (property) { property.value = metadataCue[property.id] || ''; });
    },
  };

  // Creates a child element for the parent
  function createChild(parent, tagName, text) {
    var element = document.createElement(tagName);
    parent.appendChild(element);
    if (text)
      element.innerText = text;
    return element;
  }

  root.CueEditor = CueEditor;
})(window);
