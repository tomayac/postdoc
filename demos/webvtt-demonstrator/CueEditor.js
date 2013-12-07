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
      var self = this;
      this._cueList.innerHTML = '';
      forEach(cues, function (cue) {
        var cueElement = addChild(self._cueList, 'li'),
            cueLink = addChild(cueElement, 'a', cue.id);
        cueLink.href = 'javascript:';
        cueLink.addEventListener('click', function () { self.editCue(cue); });
      });
    },

    editCue: function (cue) {
      this._editForm.setAttribute('style', 'display: inherit');
      this._editedCue = cue;
      this._name.value = cue.id;
      this._name.disabled = true;
      this._start.value = cue.startTime;
      this._end.value = cue.endTime;

      var propertyValues = JSON.parse(cue.text);
      forEach(this._properties, function (propertyInput) {
        propertyInput.value = JSON.stringify(propertyValues[propertyInput.id]);
      });
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
