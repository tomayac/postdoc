var VIDEO_DATA = (function() {
  var urls = [
    './videos/segment01.mp4',
    './videos/segment02.mp4',
    './videos/segment03.mp4',
    './videos/segment04.mp4',
    './videos/segment05.mp4',
    './videos/segment06.mp4',
    './videos/segment07.mp4',
    './videos/segment08.mp4',
    './videos/segment09.mp4',
    './videos/segment10.mp4'
  ];

  var urlObjects = [];
  urls.forEach(function(urlString) {
    var id = urlString.split('/')[2];
    urlObjects.push({
      video: urlString,
      id: id
    });
  });
  return urlObjects;

})();