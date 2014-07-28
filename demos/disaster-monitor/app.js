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

var queryExpander = require('./query-expander.js');

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
var GOOGLE_STATIC_MAPS_API_KEY = process.env.GOOGLE_STATIC_MAPS_API_KEY;

// Good results with "Natural_disasters" and "Anthropogenic_hazard"
app.get('/disasters/json/:init?', function(req, res) {
  var init = req.params.init || 'Natural_disaster';
  queryExpander.expandQueries(init, function(err, results) {
    res.header({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    });
    if (err) {
      return res.send(500, err);
    }
    return res.send(results);
  });
});

app.get('/disasters/txt/:init?', function(req, res) {
  var init = req.params.init || 'Natural_disaster';
  queryExpander.expandQueries(init, function(err, results) {
    res.header({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain'
    });
    if (err) {
      return res.send(500, err);
    }
    var keywords = [];
    var i = 0;
    for (var key in results) {
      var langLinks = results[key].langLinks;
      keywords[i] = {};
      for (var language in langLinks) {
        keywords[i][langLinks[language].label] = true;
        langLinks[language].alternativeLabels.forEach(function(label) {
          keywords[i][label] = true;
        });
      }
      keywords[i] = Object.keys(keywords[i]).join(', ');
      i++;
    }
    return res.send(keywords.join('\n\n'));
  });
});

app.get('/disasters/tsv/:init?', function(req, res) {
  var init = req.params.init || 'Natural_disaster';
  queryExpander.expandQueries(init, function(err, results) {
    res.header({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/tab-separated-values'
    });
    if (err) {
      return res.send(500, err);
    }
    var languages = [];
    var languageKeywords = {};
    var lengthsPerLanguage = {};
    for (var key in results) {
      var langLinks = Object.keys(results[key].langLinks);
      langLinks.forEach(function(langLink) {
        if (languages.indexOf(langLink) === -1) {
          languages.push(langLink);
          languageKeywords[langLink] = [];
          lengthsPerLanguage[langLink] = 0;
        }
      });
    }
    var tsv = '';
    languages.sort();
    var maxLength = 0;
    for (var key in results) {
      var langLinks = results[key].langLinks;
      for (var language in langLinks) {
        languageKeywords[language].push(langLinks[language].label);
        lengthsPerLanguage[language] = lengthsPerLanguage[language] + 1;
        languageKeywords[language] = languageKeywords[language].concat(
            langLinks[language].alternativeLabels);
        lengthsPerLanguage[language] = lengthsPerLanguage[language] +
            langLinks[language].alternativeLabels.length;
        if (lengthsPerLanguage[language] > maxLength) {
          maxLength = lengthsPerLanguage[language];
        }
      }
    }
    tsv += languages.join('\t') + '\n';
    for (var i = 0; i < maxLength; i++) {
      languages.forEach(function(language) {
        tsv += languageKeywords[language][i] ?
            languageKeywords[language][i] + '\t' : '\t';
      });
      tsv += '\n';
    }
    return res.send(tsv);
  });
});

app.get('/disasters/monitoring-list/:init?', function(req, res) {
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
  queryExpander.expandQueries(init, function(err, results) {
    res.header({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    });
    if (err) {
      return res.send(500, err);
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
    return res.send(urls);
  });
});

var createGoogleMapsUrl = function(lat, lon) {
  return 'https://maps.googleapis.com/maps/api/staticmap' +
      '?key=' + GOOGLE_STATIC_MAPS_API_KEY +
      '&markers=size:mid|color:orange|' + lat + ',' + lon +
      '&size=300x200' +
      '&maptype=terrain' +
      '&zoom=6';
};

app.get('/disasters/geolocation/:language/:article', function(req, res) {
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
            map: createGoogleMapsUrl(geo[0], geo[1])
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
          averageCoordinates.map = createGoogleMapsUrl(averageCoordinates.lat,
              averageCoordinates.lon);
        }
        coordinates = {
          individualCoordinates: coordinates,
          averageCoordinates: averageCoordinates,
        };
        res.send(coordinates);
      }
    );
  });
});

app.get('/disasters/revisions/:language/:article', function(req, res) {
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
          res.send({
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
});

// start static serving
// and set default route to index.html
app.use(express.static(__dirname + '/static'));
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

var port = Number(process.env.PORT || 4000);
app.listen(port, function() {
  console.log('Disaster Monitor listening on port ' + port);
});
