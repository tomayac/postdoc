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

var numTracksPerVideo = {};

var fileName = './tracks.txt';
new lazy(fs.createReadStream(fileName)).lines.forEach(
  function(line) {
    line = line.toString();
    var $ = cheerio.load(line);

    var kind = $('video track[kind]').attr('kind');
    if (kinds[kind]) {
      kinds[kind] += 1;
    } else {
      kinds[kind] = 1;
    }

    var srclang = $('video track[srclang]').attr('srclang');
    if (srclangs[srclang]) {
      srclangs[srclang] += 1;
    } else {
      srclangs[srclang] = 1;
    }

    var label = $('video track[label]').attr('label');
    if (labels[label]) {
      labels[label] += 1;
    } else {
      labels[label] = 1;
    }

    var myDefault = $('video track[default]').attr('default');
    if (defaults[myDefault]) {
      defaults[myDefault] += 1;
    } else {
      defaults[myDefault] = 1;
    }

    var numTracks = $('track').length;
    if (numTracksPerVideo[numTracks]) {
      numTracksPerVideo[numTracks] += 1;
    } else {
      numTracksPerVideo[numTracks] = 1;
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
    console.log('numTracksPerVideo');
  console.log(numTracksPerVideo);
});