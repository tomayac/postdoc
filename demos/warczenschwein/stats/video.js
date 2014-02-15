var lazy = require('lazy');
var fs = require('fs');
var cheerio = require('cheerio');

/*
kind — The type of text track
src — Address of the resource
srclang — Language of the text track
label — User-visible label

*/

var kinds = {};
var srclangs = {};
var labels = {};
var defaults = {};
var vtts = {};
var types = {};

var numTracksPerVideo = {};
var numSourcesPerVideo = {};
var videoSrcs = {};

var fileName = '../results.txt';
new lazy(fs.createReadStream(fileName)).lines.forEach(
  function(line) {
    if (line === undefined) {
      return;
    }
    line = line.toString();
    var $ = cheerio.load(line);

    var type = $('source[type]').attr('type');
    if (type !== undefined) {
      if (types[type]) {
        types[type] += 1;
      } else {
        types[type] = 1;
      }
    }

    var numSources = $('source').length;
    if (numSources !== undefined) {
      if (numSourcesPerVideo[numSources]) {
        numSourcesPerVideo[numSources] += 1;
      } else {
        numSourcesPerVideo[numSources] = 1;
      }
    }

    var videoSrc = $('video[src]').length;
    if (videoSrcs[videoSrc]) {
      videoSrcs[videoSrc] += 1;
    } else {
      videoSrcs[videoSrc] = 1;
    }

  }
).on('pipe', function() {
  console.log('kinds');
  console.log(kinds);
  console.log('srclangs');
  console.log(srclangs);
  console.log('labels');
  console.log(labels);
  console.log('defaults');
  console.log(defaults);
  console.log('vtts');
  console.log(vtts);
  console.log('numTracksPerVideo');
  console.log(numTracksPerVideo);
  console.log('numSourcesPerVideo');
  console.log(numSourcesPerVideo);
  console.log('types');
  console.log(types);
  console.log('videoSrcs');
  console.log(videoSrcs);
});