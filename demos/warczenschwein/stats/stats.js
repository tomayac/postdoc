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

    var type = $('source[type]').attr('type');
    if (types[type]) {
      types[type] += 1;
    } else {
      types[type] = 1;
    }

    var vtt = /\.srt$/gi.test($('track[src]').attr('src')) ?
        'srt' :
        (/\.(web)?vtt$/gi.test($('track[src]').attr('src')) ? 'vtt' : 'other');
    if (vtts[vtt]) {
      vtts[vtt] += 1;
    } else {
      vtts[vtt] = 1;
    }

    var numTracks = $('track').length;
    if (numTracksPerVideo[numTracks]) {
      numTracksPerVideo[numTracks] += 1;
    } else {
      numTracksPerVideo[numTracks] = 1;
    }

    var numSources = $('source').length;
    if (numSourcesPerVideo[numSources]) {
      numSourcesPerVideo[numSources] += 1;
    } else {
      numSourcesPerVideo[numSources] = 1;
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