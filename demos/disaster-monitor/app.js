/**
 * @author tomac@google.com (Thomas Steiner)
 * @license Apache 2.0
 * @description Wikipedia/Wikidata-based Disaster Monitor
 */

'use strict';

var express = require('express');
var app = express();
var geocoder = require('local-reverse-geocoder');
var env = require('node-env-file');
if (require('fs').existsSync(__dirname + '/.env')) {
  env(__dirname + '/.env');
}

var illustrator = require('./mediagallery.js');
var queryExpander = require('./query-expander.js');
var wikipedia = require('./wikipedia.js');
var util = require ('./util.js');

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  var format = req.params.format || false;
  if (format === 'tsv') {
    res.header('Content-Type', 'text/tab-separated-values; charset=utf-8');
  } else if (format === 'adwords') {
    res.header('Content-Type', 'text/tab-separated-values; charset=utf-8');
  } else if (format === 'txt') {
    res.header('Content-Type', 'text/plain; charset=utf-8');
  } else if (format === 'json') {
    res.header('Content-Type', 'application/json; charset=utf-8');
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
    return res.write(' ');
  }, 10000);
  queryExpander.expandQueries(language, init, maxDepth, function(err, results) {
    clearInterval(keepAlive);
    if (err) {
      return res.end('{}');
    }
    if (format === 'tsv') {
      return res.end(util.toTsv(results));
    } else if (format === 'txt') {
      return res.end(util.toTxt(results));
    } else if (format === 'adwords') {
      util.toAdWords(results, function(err, converted) {
        return res.end(converted);
      });
    } else {
      return res.end(JSON.stringify(results));
    }
  });
});

app.get('/monitor/monitoring-list/:init?', function(req, res) {
  var keepAlive = setInterval(function() {
    return res.write(' ');
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
    clearInterval(keepAlive);
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
  wikipedia.getGeolocation(language, article, function(err, result) {
    if (err) {
      return res.send(500, err);
    }
    return res.send(result);
  });
});

app.get('/monitor/revisions/:language/:article', function(req, res) {
  var language = req.params.language;
  var article = req.params.article;
  wikipedia.getRevisions(language, article, function(err, result) {
    if (err) {
      return res.send(500, err);
    }
    return res.send(result);
  });
});

app.get('/redirects/:language/:article', function(req, res) {
  var language = req.params.language;
  var article = req.params.article;
  wikipedia.getRedirects(language, article, function(err, result) {
    if (err) {
      return res.send(500, err);
    }
    return res.send(result);
  });
});

app.get('/mediagallery/:searchTerms', function(req, res) {
  res.header('Content-Type', 'text/html');
  var keepAlive = setInterval(function() {
    return res.write(' ');
  }, 10000);
  var searchTerms = {};
  req.params.searchTerms.split(',').map(function(term) {
    searchTerms[term] = true;
  });
  console.log('Creating media gallery for ' + Object.keys(searchTerms));
  illustrator(searchTerms, '', function(mediaGalleryHtml) {
    clearInterval(keepAlive);
    if (mediaGalleryHtml.toString() === 'false') {
      return res.end('');
    }
    var css = '<style>' +
        '.favicon {' +
          'position: absolute;' +
          'top: 3px;' +
          'left: 3px;' +
        '}' +
        '.photoBorder {' +
          'border: 1px solid rgba(0, 0, 0, 0.1);' +
          'overflow: hidden;' +
          'position:absolute;' +
        '}' +
        '.mediaItem {' +
          'float: left;' +
        '}' +
        '</style>';
    return res.end(css + mediaGalleryHtml);
  });
});

app.get(/geocode/, function(req, res) {
  var lat = req.query.latitude || false;
  var lon = req.query.longitude || false;
  if (!lat || !lon) {
    return res.send(400, 'Bad Request');
  }
  geocoder.lookUp({latitude: lat, longitude: lon}, 1, function(err, addresses) {
    if (err) {
      return res.send(500, err);
    }
    return res.send(addresses);
  });
});

// start static serving
// and set default route to index.html
app.get('/', function(req, res) {
  return res.sendfile(__dirname + '/index.html');
});

var port = Number(process.env.PORT || 3000);
app.listen(port, function() {
  console.log('Disaster Monitor listening on port ' + port);
});
