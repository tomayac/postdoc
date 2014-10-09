/**
 * @author tomac@google.com (Thomas Steiner)
 * @license Apache 2.0
 * @description Wikipedia/Wikidata-based Disaster Monitor
 */

'use strict';

var express = require('express');
var app = express();
var async = require('async');
var request = require('request');
var ExpontentialSmoothingStream = require('exponential-smoothing-stream');
var numbers = require('numbers');
var env = require('node-env-file');
if (require('fs').existsSync(__dirname + '/.env')) {
  env(__dirname + '/.env');
}

var queryExpander = require('./query-expander.js');
var util = require ('./util.js');

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

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  var format = req.params.format || false;
  if (format === 'tsv') {
    res.header('Content-Type', 'text/tab-separated-values');
  } else if (format === 'txt') {
    res.header('Content-Type', 'text/plain');
  } else if (format === 'json') {
    res.header('Content-Type', 'application/json');
  }
  next();
};

app.use(allowCrossDomain);
app.use(express.static(__dirname + '/static'));

// Good results with "Natural_disasters" and "Anthropogenic_hazard"
app.get('/disasters/:format/:language/:init?', function(req, res) {
  var format = req.params.format;
  var language = req.params.language;
  var init = req.params.init || 'Natural_disaster';
  var maxDepth = req.query.maxDepth ? req.query.maxDepth : Number.MAX_VALUE;
  var keepAlive = setInterval(function() {
    res.write(' ');
  }, 10000);
  queryExpander.expandQueries(language, init, maxDepth, function(err, results) {
    if (err) {
      return res.end('{}');
    }
    clearInterval(keepAlive);
    if (format === 'tsv') {
      return res.end(util.toTsv(results));
    } else if (format === 'txt') {
      return res.end(util.toTxt(results));
    } else {
      return res.end(JSON.stringify(results));
    }
  });
});

app.get('/monitor/monitoring-list/:init?', function(req, res) {
  var keepAlive = setInterval(function() {
    res.write(' ');
  }, 10000);
  var urls = {};
  var insertArticle = function(article, role, type) {
    if (!urls[article]) {
      urls[article] = {};
    }
    if (!urls[article][role]) {
      urls[article][role] = [type];
    } else {
      if (urls[article][role].indexOf(type) === -1) {
        urls[article][role].push(type);
      }
    }
  };

  var init = req.params.init || 'Natural_disaster';
  var language = 'en';
  var maxDepth = Number.MAX_VALUE;
  queryExpander.expandQueries(language, init, maxDepth, function(err, results) {
    if (err) {
      return res.end('{}');
    }
    for (var disasterLabel in results) {
      var disasterType = results[disasterLabel];
      for (var language in disasterType.langLinks) {
        var disasterObject = disasterType.langLinks[language];
        // disaster articles
        var article = language + ':' + disasterObject.title;
        insertArticle(article, 'disaster link', disasterLabel);
        // redirects
        disasterObject.alternativeTitles.forEach(function(title) {
          var article = language + ':' + title;
          insertArticle(article, 'disaster link', disasterLabel);
        });
        // inbound links
        if (disasterObject.inboundLinks) {
          disasterObject.inboundLinks.forEach(function(title) {
            var article = language + ':' + title;
            insertArticle(article, 'inbound link', disasterLabel);
          });
        }
        // outbound links
        if (disasterObject.outboundLinks) {
          disasterObject.outboundLinks.forEach(function(title) {
            var article = language + ':' + title;
            insertArticle(article, 'outbound link', disasterLabel);
          });
        }
        // mutual links
        if (disasterObject.mutualLinks) {
          disasterObject.mutualLinks.forEach(function(title) {
            var article = language + ':' + title;
            insertArticle(article, 'mutual link', disasterLabel);
          });
        }
      }
    }
    console.log('The monitoring list contains ' + Object.keys(urls).length +
    ' items');
    var data = {
      urls: urls,
      disasterTypes: Object.keys(results)
    };
    return res.end(JSON.stringify(data));
  });
});

app.get('/monitor/geolocation/:language/:article', function(req, res) {
  var language = req.params.language;
  var article = req.params.article;
  console.log('Geo-referencing ' + language + ':' + article + '.');
  var url = 'http://' + language + LANGUAGE_LINKS_URL +
      encodeURIComponent(article);
  var options = {
    url: url,
    headers: HEADERS
  };
  request.get(options, function(err, response, body) {
    if (err || response.statusCode !== 200) {
      return res.send(500, err);
    }
    var data = JSON.parse(body);
    if (!data.query || !data.query.pages) {
      return res.send(500, err);
    }
    var pageId = Object.keys(data.query.pages)[0];
    if (!data.query.pages[pageId].langlinks) {
      return res.send(404);
    }
    var functions = {};
    data.query.pages[pageId].langlinks.push({
      lang: language,
      '*': article
    });
    data.query.pages[pageId].langlinks.forEach(function(langLink) {
      var title = langLink.lang + ':' + decodeURIComponent(langLink['*']);
      functions[title] = function(callback) {
        var innerOptions = {
          url: 'http://' + langLink.lang + GEO_COORDINATES_URL + langLink['*'],
          headers: HEADERS
        };
        request.get(innerOptions, function(err, response, body) {
          if (err || response.statusCode !== 200) {
            return callback(err || 'Error ' + response.statusCode);
          }
          var innerData = JSON.parse(body);
          if (!innerData.query || !innerData.query.pages) {
            return callback(null, []);
          }
          var pageId = Object.keys(innerData.query.pages)[0];
          if (!innerData.query.pages[pageId].coordinates) {
            return callback(null, []);
          }
          var coordinates = {};
          innerData.query.pages[pageId].coordinates.forEach(function(geo) {
            // O(1) coordinates deduplication
            coordinates[geo.lat + '|' + geo.lon] = true;
          });
          return callback(null, Object.keys(coordinates).map(function(geo) {
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
          return res.send(500, err);
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
          averageCoordinates = coordinates.reduce(function(prev, curr, i, arr) {
            return i < arr.length - 1 ? {
              lat: prev.lat + curr.lat,
              lon: prev.lon + curr.lon
            } : {
              lat: (prev.lat + curr.lat) / arr.length,
              lon: (prev.lon + curr.lon) / arr.length,
            };
          });
          averageCoordinates.map = util.createGoogleMapsUrl(
              averageCoordinates.lat, averageCoordinates.lon);
        }
        coordinates = {
          individualCoordinates: coordinates,
          averageCoordinates: averageCoordinates,
        };
        res.send(JSON.stringify(coordinates));
      }
    );
  });
});

app.get('/monitor/revisions/:language/:article', function(req, res) {
  var language = req.params.language;
  var article = req.params.article;
  console.log('Getting revisions of ' + language + ':' + article + '.');
  var url = 'http://' + language + LANGUAGE_LINKS_URL +
      encodeURIComponent(article);
  var options = {
    url: url,
    headers: HEADERS
  };
  request.get(options, function(err, response, body) {
    if (err || response.statusCode !== 200) {
      return res.send(500, err);
    }
    var data = JSON.parse(body);
    if (!data.query || !data.query.pages) {
      return res.send(500, err);
    }
    var pageId = Object.keys(data.query.pages)[0];
    if (!data.query.pages[pageId].langlinks) {
      return res.send(404);
    }
    data.query.pages[pageId].langlinks.push({
      lang: language,
      '*': article
    });
    var functions = {};
    var yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
    data.query.pages[pageId].langlinks.forEach(function(langLink) {
      var title = langLink.lang + ':' + decodeURIComponent(langLink['*']);
      functions[title] = function(callback) {
        var innerOptions = {
          url: 'http://' + langLink.lang + REVISIONS_URL
              .replace(/\{\{rvstart\}\}/, yesterday) +
              encodeURIComponent(langLink['*']),
          headers: HEADERS
        };
        request.get(innerOptions, function(err, response, body) {
          if (err || response.statusCode !== 200) {
            return callback(err || 'Error ' + response.statusCode);
          }
          var innerData = JSON.parse(body);
          if (!innerData.query || !innerData.query.pages) {
            return callback(null, []);
          }
          var pageId = Object.keys(innerData.query.pages)[0];
          if (!innerData.query.pages[pageId].revisions) {
            return callback(null, []);
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
          return callback(null, revisions);
        });
      };
    });
    async.parallelLimit(
      functions,
      PARALLEL_LIMIT,
      function(err, results) {
        if (err) {
          return res.send(500, err);
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
          res.send(JSON.stringify({
            revisions: revisions,
            intervals: intervals,
            spiking: spiking
          }));
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
});

// start static serving
// and set default route to index.html
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

var port = Number(process.env.PORT || 3000);
app.listen(port, function() {
  console.log('Disaster Monitor listening on port ' + port);
});
