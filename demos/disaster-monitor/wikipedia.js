'use strict';

var async = require('async');
var request = require('request');
var ExpontentialSmoothingStream = require('exponential-smoothing-stream');
var numbers = require('numbers');
var geolib = require('geolib');

var util = require ('./util.js');

var REDIRECTS_URL = 'http://{{LANGUAGE}}.wikipedia.org/w/api.php?action=query' +
    '&blnamespace=0&list=backlinks&blfilterredir=redirects&bllimit=max&' +
    'format=json&bltitle=';
var LANGUAGE_LINKS_URL = '.wikipedia.org/w/api.php?action=query&' +
    'prop=langlinks&format=json&lllimit=max&titles=';
var GEO_COORDINATES_URL = '.wikipedia.org/w/api.php?action=query&' +
    'prop=coordinates&format=json&colimit=max&coprop&coprimary=primary&titles=';
var REVISIONS_URL = '.wikipedia.org/w/api.php?action=query&format=json' +
    '&rvstart={{rvstart}}&prop=revisions&rvprop=timestamp|user&rvlimit=max' +
    '&rvdir=newer&titles=';

var USER_AGENT =
    'Disaster Monitor * Contact: Thomas Steiner (tomac@google.com)';
var HEADERS = { 'User-Agent': USER_AGENT };
var PARALLEL_LIMIT = 5;

var wikipedia = {
  getRevisions: function(language, article, callback) {
    console.log('Getting revisions of ' + language + ':' + article + '.');
    var url = 'http://' + language + LANGUAGE_LINKS_URL +
        encodeURIComponent(article);
    var options = {
      url: url,
      headers: HEADERS,
      timeout: 5000
    };
    request.get(options, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        return callback(err || 'Internal ServerError');
      }
      var data = JSON.parse(body);
      if (!data.query || !data.query.pages) {
        return callback(err || 'Internal Server Error');
      }
      var pageId = Object.keys(data.query.pages)[0];
      if (!data.query.pages[pageId].langlinks) {
        return callback('File Not Found');
      }
      data.query.pages[pageId].langlinks.push({
        lang: language,
        '*': article
      });
      var functions = {};
      var yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
      data.query.pages[pageId].langlinks.forEach(function(langLink) {
        var title = langLink.lang + ':' + decodeURIComponent(langLink['*']);
        functions[title] = function(innerCallback) {
          var innerOptions = {
            url: 'http://' + langLink.lang + REVISIONS_URL
                .replace(/\{\{rvstart\}\}/, yesterday) +
                encodeURIComponent(langLink['*']),
            headers: HEADERS,
            timeout: 5000
          };
          request.get(innerOptions, function(err, response, body) {
            if (err || response.statusCode !== 200) {
              return innerCallback(err || 'Error ' + response.statusCode);
            }
            var innerData = JSON.parse(body);
            if (!innerData.query || !innerData.query.pages) {
              return innerCallback(null, []);
            }
            var pageId = Object.keys(innerData.query.pages)[0];
            if (!innerData.query.pages[pageId].revisions) {
              return innerCallback(null, []);
            }
            var revisions = [];
            innerData.query.pages[pageId].revisions.forEach(function(revision, i) {
              revisions[i] = {
                user: revision.user,
                timestamp: new Date(revision.timestamp).getTime(),
                date: revision.timestamp,
                article: title
              };
            });
            return innerCallback(null, revisions);
          });
        };
      });
      async.parallelLimit(
        functions,
        PARALLEL_LIMIT,
        function(err, results) {
          if (err) {
            return callback('Internal Server Error');
          }
          var revisions = [];
          for (article in results) {
            var revision = results[article];
            revisions = revisions.concat(revision);
          }
          revisions.sort(function(a, b) {
            return b.timestamp - a.timestamp;
          });
          var intervals = [];
          var ess = new ExpontentialSmoothingStream({ smoothingFactor: 0.5 });
          ess.on('data', function(data) {
            intervals.push(data);
          });
          ess.on('end', function() {
            var standardDeviation = numbers.statistic.standardDev(intervals);
            var spiking = false;
            if ((intervals.length >= 5) &&
                (intervals[intervals.length - 1] < standardDeviation / 2)) {
              spiking = true;
            }
            return callback(null, {
              revisions: revisions,
              intervals: intervals,
              spiking: spiking
            });
          });
          revisions.forEach(function(revision, i) {
            if (i > 0) {
              ess.write(parseInt(revisions[i - 1].timestamp, 10) -
                  parseInt(revision.timestamp, 10));
            }
          });
          ess.end();
        }
      );
    });
  },

  getGeolocation: function(language, article, callback) {
    console.log('Geo-referencing ' + language + ':' + article + '.');
    var url = 'http://' + language + LANGUAGE_LINKS_URL +
        encodeURIComponent(article);
    var options = {
      url: url,
      headers: HEADERS,
      timeout: 5000
    };
    console.log('Geo-referencing ' + language + ':' + article + ': ' + url)
    request.get(options, function(err, response, body) {
      console.log('Received language links ' + url);
      console.log('url '+options.url)
                    console.log('2 err '+err)
      if (response) console.log('status ' +response.statusCode)
                    console.log('body ' +body)
      if (err || response.statusCode !== 200) {
        return callback('Internal Server Error');
      }
      var data = JSON.parse(body);
      if (!data.query || !data.query.pages) {
        return callback('Internal Server Error');
      }
      var pageId = Object.keys(data.query.pages)[0];
      if (!data.query.pages[pageId].langlinks) {
        return callback('File Not Found');
      }
      var functions = {};
      data.query.pages[pageId].langlinks.push({
        lang: language,
        '*': article
      });
      data.query.pages[pageId].langlinks.forEach(function(langLink) {
        var title = langLink.lang + ':' + decodeURIComponent(langLink['*']);
        functions[title] = function(innerCallback) {
          var innerOptions = {
            url: 'http://' + langLink.lang + GEO_COORDINATES_URL + langLink['*'],
            headers: HEADERS,
            timeout: 5000
          };
          console.log('Geo coordinates ' + title + ' => ' + innerOptions.url);
          request.get(innerOptions, function(err, response, body) {
            console.log('Received geo coordinates ' + innerOptions.url);
            console.log(innerOptions.url)
                    console.log('3 err '+err)
            if (response) console.log('status ' +response.statusCode)
                    console.log('body ' +body)
            if (err || response.statusCode !== 200) {
              return innerCallback(err || 'Error ' + response.statusCode);
            }
            var innerData = JSON.parse(body);
            if (!innerData.query || !innerData.query.pages) {
              return innerCallback(null, []);
            }
            var pageId = Object.keys(innerData.query.pages)[0];
            if (!innerData.query.pages[pageId].coordinates) {
              return innerCallback(null, []);
            }
            var coordinates = {};
            innerData.query.pages[pageId].coordinates.forEach(function(geo) {
              // O(1) coordinates deduplication
              coordinates[geo.lat + '|' + geo.lon] = true;
            });
            return innerCallback(null, Object.keys(coordinates).map(function(geo) {
              var coords = geo.split('|');
              return {
                lat: coords[0],
                lon: coords[1]
              };
            }));
          });
        };
      });
      async.parallelLimit(
        functions,
        PARALLEL_LIMIT,
        function(err, results) {
          if (err) {
            return callback('Internal Server Error');
          }
          var coordinates = {};
          for (var article in results) {
            var geoArray = results[article];
            geoArray.forEach(function(geo) {
              // O(1) coordinates deduplication
              coordinates[geo.lat + '|' + geo.lon] = true;
            });
          }
          coordinates = Object.keys(coordinates).map(function(geo) {
            geo = geo.split('|');
            return {
              lat: parseFloat(geo[0]),
              lon: parseFloat(geo[1]),
              map: util.createGoogleMapsUrl(geo[0], geo[1])
            };
          });
          var averageCoordinates = {};
          if (coordinates.length) {
            var geocoordinates = [];
            coordinates.forEach(function(coordinate, i) {
              geocoordinates[i] = {
                latitude: coordinate.lat,
                longitude: coordinate.lon
              };
            });
            var avg = geolib.getCenter(geocoordinates);
            averageCoordinates.lat = avg.latitude;
            averageCoordinates.lon = avg.longitude;
            averageCoordinates.map = util.createGoogleMapsUrl(
                averageCoordinates.lat, averageCoordinates.lon);
          }
          coordinates = {
            individualCoordinates: coordinates,
            averageCoordinates: averageCoordinates,
          };
          return callback(null, coordinates);
        }
      );
    });
  },

  getRedirects: function(language, article, callback) {
    console.log('Getting redirects for ' + language + ':' + article + '.');
    var options = {
      url: REDIRECTS_URL.replace(/\{\{LANGUAGE\}\}/, language) + article
          .replace(/\s/g, '_'),
      headers: HEADERS,
      timeout: 5000
    };
    request.get(options, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        return callback('Internal Server Error');
      }
      var data = JSON.parse(body);
      var results = [article];
      if ((data.query && data.query.backlinks) &&
          (Array.isArray(data.query.backlinks)) &&
          (data.query.backlinks.length)) {
        var backlinks = data.query.backlinks;
        backlinks.forEach(function(backlink, i) {
          results[i + 1] = backlink.title;
        });
      }
      return callback(null, results);
    });
  }
};

module.exports = wikipedia;