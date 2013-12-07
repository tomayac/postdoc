(function (root) {
  var $ = document.querySelector.bind(document);
  var forEach = Function.prototype.call.bind([].forEach);

  function CueEditor(video) {
    var start = $('#start'),
        end = $('#end'),
        cueList = $('#activeCues ul');

    video.addEventListener('loadedmetadata', function () {
      start.value = start.min = end.min = 0;
      end.value   = start.max = end.max = Math.floor(video.duration);
    });

    video.metadataTrack.addEventListener('cuechange', function () {
      cueList.innerHTML = '';
      forEach(this.activeCues, function (cue) {
        var li = document.createElement('li');
        li.innerText = cue.id;
        cueList.appendChild(li);
      });
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

  root.CueEditor = CueEditor;
})(window);
