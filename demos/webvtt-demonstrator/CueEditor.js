(function (root) {
  var $  = document.querySelector.bind(document);
  var $$ = document.querySelectorAll.bind(document);
  var forEach = Function.prototype.call.bind([].forEach);

  function CueEditor(video) {
    this._video = video;
  }

  CueEditor.prototype = {
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
    },

    _displayCues: function (cues) {
      this._cueList.innerHTML = '';
      if (cues.length) {
        forEach(cues, function (cue) {
          var cueElement = addChild(this._cueList, 'li'),
              cueLink = addChild(cueElement, 'a', cue.id);
          cueLink.href = 'javascript:';
          cueLink.addEventListener('click', this.editCue.bind(this, cue));
        }, this);
      }
      else {
        addChild(addChild(this._cueList, 'li'), 'em', '(none)');
      }
    },

    editCue: function (cue) {
      var metadataCue = new MetadataCue(this._video, cue);
      this._editForm.setAttribute('style', 'display: inherit');
      this._editedCue = metadataCue;
      this._name.value = metadataCue.id;
      this._name.disabled = true;
      this._start.value = metadataCue.startTime;
      this._end.value = metadataCue.endTime;
      forEach(this._properties, function (property) { property.value = metadataCue[property.id] || ''; });
    },
  };

  function addChild(parent, tagName, text) {
    var element = document.createElement(tagName);
    parent.appendChild(element);
    if (text)
      element.innerText = text;
    return element;
  }

  root.CueEditor = CueEditor;
})(window);
