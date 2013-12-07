(function (root) {
  var $ = document.querySelector.bind(document);
  var forEach = Function.prototype.call.bind([].forEach);

  function CueEditor(video) {
    var self = this,
        start = $('#start'),
        end = $('#end'),
        cueList = this._cueList = $('#activeCues ul');

    // cue list
    video.metadataTrack.addEventListener('cuechange', function () {
      self._displayCues(this.activeCues);
    });

    // start and end controls
    video.addEventListener('loadedmetadata', function () {
      start.value = start.min = end.min = 0;
      end.value   = start.max = end.max = Math.floor(video.duration);
    });
    start.addEventListener('change', function () {
      if (parseFloat(end.value) < parseFloat(start.value))
        end.value = start.value;
      video.currentTime = start.value;
    });
    end.addEventListener('change', function () {
      if (parseFloat(start.value) > parseFloat(end.value))
        start.value = end.value;
      video.currentTime = end.value;
    });
  }

  CueEditor.prototype = {
    _displayCues: function (cues) {
      var cueList = this._cueList;
      cueList.innerHTML = '';
      forEach(cues, function (cue) {
        var cueElement = addChild(cueList, 'li'),
            cueLink = addChild(cueElement, 'a', cue.id);
        cueLink.href = 'javascript:';
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
