(function (root) {
  var getElement = document.getElementById.bind(document);

  function CueEditor(video) {
    var start = getElement('start'),
        end = getElement('end');

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

  root.CueEditor = CueEditor;
})(window);
