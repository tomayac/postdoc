(function() {
  var seedArticle = 'Natural_disaster';
  var wikipediaEdits = 'http://wikipedia-edits.herokuapp.com/sse';

  var disasterTypes = {};
  var monitoringList = {};

  var heatmapsData = {
    heatmaps: {},
    colors: {}
  };
  var heatmapsPoints = {};

  var activity = document.querySelector('#activity > span');
  var status = document.querySelector('#status > span');
  var candidate = document.querySelector('#candidate');

  var getMonitoringList = function(article, callback) {
    console.log('Retrieving new monitoring list.');
    status.textContent = ('Retrieving new monitoring list.');
    // check if the cached copy is still good
    var now = Date.now();
    var cachedMonitoringList = localStorage.getItem('monitoringList');
    if (cachedMonitoringList) {
      cachedMonitoringList = JSON.parse(cachedMonitoringList);
      if (now - cachedMonitoringList.timestamp <= 1000 * 60 * 60) {
        cachedMonitoringList =
            JSON.parse(LZString.decompress(cachedMonitoringList.data));
        console.log('Cached monitoring list still good.');
        return callback(null, cachedMonitoringList);
      }
    }
    console.log('Cached monitoring list too old or non-existant.');
    var url = document.location.origin + '/monitor/monitoring-list/' +
        article;
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      console.log('New monitoring list received.');
      status.textContent = ('New monitoring list received.');
      monitoringList = JSON.parse(this.responseText);
      console.log('Caching monitoring list.');
      try {
        localStorage.setItem('monitoringList', JSON.stringify({
          timestamp: now,
          data: LZString.compress(this.responseText)
        }));
      } catch(e) {
        console.log('Could not cache monitoring list ' + e + '.');
      }
      return callback(null, monitoringList);
    };
    xhr.onerror = function() {
      return callback('Could not retrieve monitoring list for ' + article +
          '.');
    };
    xhr.open('get', url, true);
    xhr.send();
  };

  var parseWikipediaEdit = function(data) {
    var article = data.language + ':' + data.article;
    activity.textContent = article;
    var disasterObj = monitoringList[article];
    if (disasterObj) {
      for (var role in disasterObj) {
        var length = disasterObj[role].length;
        disasterObj[role].forEach(function(disasterType) {
          if (!disasterTypes[disasterType]) {
            disasterTypes[disasterType] = {
              score: 0
            };
          }
          if (!disasterTypes[disasterType][role]) {
            disasterTypes[disasterType][role] = {
              articles: [article]
            };
          }
          var boostFactor = 1;
          if (role === 'disaster link') {
            boostFactor = 10;
          } else if (role === 'outbound link') {
            boostFactor = 5;
          } else if (role === 'inbound link') {
            boostFactor = 2;
          } else if (role === 'mutual link') {
            boostFactor = 15;
          }
          disasterTypes[disasterType].score += boostFactor * (1 / length);
        });
      }
      showCandidateArticle(data.article, data.language, disasterObj);
    }
  };

  var getGeoData = function(article, language, callback) {
    console.log('Geo-referencing ' + language + ':' + article);
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      try {
        var geoData = JSON.parse(this.responseText);
        return callback(null, geoData);
      } catch(e) {
        return callback('Not found');
      }
    };
    xhr.onerror = function() {
      return callback('Not found');
    };
    var url = document.location.origin + '/monitor/geolocation/' + language +
        '/' + encodeURIComponent(article);
    xhr.open('get', url, true);
    xhr.send();
  };

  var getRevisionsData = function(article, language, callback) {
    console.log('Getting revions data for ' + language + ':' + article);
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      try {
        var revisionsData = JSON.parse(this.responseText);
        return callback(null, revisionsData);
      } catch(e) {
        return callback('Not found');
      }
    };
    xhr.onerror = function() {
      return callback('Not found');
    };
    var url = document.location.origin + '/monitor/revisions/' + language +
        '/' + encodeURIComponent(article);
    xhr.open('get', url, true);
    xhr.send();
  };

  var getRedirects = function(article, language, callback) {
    console.log('Getting redirects for ' + language + ':' + article);
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      var redirects = JSON.parse(this.responseText);
      return callback(null, redirects);
    };
    xhr.onerror = function() {
      return callback('Not found');
    };
    var url = document.location.origin + '/redirects/' + language + '/' +
        encodeURIComponent(article);
    xhr.open('get', url, true);
    xhr.send();
  };

  var getMediaGallery = function(searchTerms, callback) {
    console.log('Getting media gallery for ' + searchTerms);
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      return callback(null, this.responseText);
    };
    xhr.onerror = function() {
      return callback('Not found');
    };
    var url = document.location.origin + '/mediagallery/' +
        encodeURIComponent(searchTerms.map(function(t) {
          return t.trim();
        }).join(','));
    xhr.open('get', url, true);
    xhr.send();
  };

  var showCandidateArticle = function(article, language, roles) {
    getGeoData(article, language, function(err, geoData) {
      if (err) {
        return console.log('Geo coordinates error for ' + language +
            ':' + article);
      }
      getRevisionsData(article, language, function(err, revisionsData) {
        while(candidate.childNodes.length >= 6) {
          candidate.firstChild.remove();
        }
        var fragment = document.createDocumentFragment();
        var ul = document.createElement('ul');
        fragment.appendChild(ul);
        var li = document.createElement('li');
        ul.appendChild(li);
        var a = document.createElement('a');
        a.textContent = language + ':' + article;
        a.href = 'http://' + language + '.wikipedia.org/wiki/' +
            encodeURIComponent(article);
        li.appendChild(a);
        if (revisionsData.spiking) {
          li.appendChild(document.createTextNode(' (spiking)'));
        } else {
          li.appendChild(document.createTextNode(' (not spiking)'));
        }
        // Static map
        if (geoData.averageCoordinates.lat) {
          li.appendChild(document.createElement('br'));
          var img = document.createElement('img');
          img.classList.add('static-map');
          img.src = geoData.averageCoordinates.map;
          img.alt = geoData.averageCoordinates.lat + ', ' +
              geoData.averageCoordinates.lon;
          li.appendChild(img);
          // Heatmap
          for (var role in roles) {
            roles[role].forEach(function(disasterType) {
              var point = new google.maps.LatLng(
                  geoData.averageCoordinates.lat,
                  geoData.averageCoordinates.lon);
              heatmapsPoints[disasterType].push(point);
            });
          }
        }
        var nestedUl = document.createElement('ul');
        li.appendChild(nestedUl);
        for (var role in roles) {
          var nestedLi = document.createElement('li');
          nestedUl.appendChild(nestedLi);
          var strong = document.createElement('strong');
          strong.textContent = role + ': ';
          nestedLi.appendChild(strong);
          var length = roles[role].length;
          var span = document.createElement('span');
          var content = '';
          roles[role].forEach(function(disasterType, i) {
            content += (i > 0 ? ', ' : '') + '1/' + length + ' ' + disasterType;
          });
          span.textContent = content;
          nestedLi.appendChild(span);
        }
        getRedirects(article, language, function(err, searchTerms) {
          if (err) {
            return candidate.appendChild(fragment);
          } else {
            getMediaGallery(searchTerms, function(err, mediaGalleryHtml) {
              if (err || mediaGalleryHtml === '') {
                console.log('Empty media gallery for ' + language + ':' +
                    article);
                return candidate.appendChild(fragment);
              }
              var mediaGallery = document.createElement('div');
              mediaGallery.innerHTML = mediaGalleryHtml;
              li.appendChild(mediaGallery);
              return candidate.appendChild(fragment);
            });
          }
        });
      });
    });
  };

  var init = function() {
    console.log('Initializing application');
    var mapOptions = {
      mapTypeId: google.maps.MapTypeId.TERRAIN,
      zoom: 1,
      center: new google.maps.LatLng(48.524146, 10.535615)
    };
    var map = new google.maps.Map(document.querySelector('#map-canvas'),
        mapOptions);
    var coldStart = true;

    var randomColors = function(types) {
      var total = types.length;
      var i = 360 / (total - 1);
      for (var x = 0; x < total; x++) {
        var color = tinycolor('hsl(' + Math.floor(i * x) + ', 100%, 50%)');
        heatmapsData.colors[types[x]] = color.toRgbString();
      }
    };

    var retrieveMonitoringList = function(err, data) {
      if (err) {
        status.textContent = 'Error retrieving monitoring list.';
        return console.log('Error retrieving monitoring list.');
      }
      // Initialize colors
      randomColors(data.disasterTypes);
      // Initialize empty heatmaps
      data.disasterTypes.forEach(function(disaster) {
        if (!heatmapsData.heatmaps[disaster]) {
          heatmapsPoints[disaster] = new google.maps.MVCArray([]);
          heatmapsData.heatmaps[disaster] =
              new google.maps.visualization.HeatmapLayer({
            data: heatmapsPoints[disaster],
            radius: 20,
            gradient: ['rgba(255, 255, 255, 0)', heatmapsData.colors[disaster]]
          });
          heatmapsData.heatmaps[disaster].setMap(map);
        }
      });
      // Create color legend
      var legend = document.querySelector('#legend');
      var html = '';
      for (var color in heatmapsData.colors) {
        html += '<span style="background-color:' + heatmapsData.colors[color] +
            ';">' + color + '</span><br/>';
      }
      legend.innerHTML = html;

      monitoringList = data.urls;
      console.log('Monitoring ' + Object.keys(monitoringList).length +
          ' candidate Wikipedia articles.');
      status.textContent = 'Monitoring ' + Object.keys(monitoringList).length +
          ' candidate Wikipedia articles.';
      // Only when executed the first time
      if (coldStart) {
        // Start the monitoring process
        var wikiSource = new EventSource(wikipediaEdits);
        wikiSource.addEventListener('message', function(e) {
          return parseWikipediaEdit(JSON.parse(e.data));
        });
        // Refresh monitoring list regularly
        setInterval(function() {
          console.log('Refreshing stale monitoring list');
          getMonitoringList(seedArticle, retrieveMonitoringList);
        }, 1000 * 60 * 60);
        coldStart = false;
      }
    };

    getMonitoringList(seedArticle, retrieveMonitoringList);
  };
  google.maps.event.addDomListener(window, 'load', init);

  /*
  var twitterSource = new EventSource('http://twtr-sample.herokuapp.com/');
  twitterSource.addEventListener('message', function(e) {
    var data = JSON.parse(e.data);
    var tweet = data.text;
    for (var article in disasters) {
      lang = article.split(':')[0];
      disaster = article.split(':')[1];
      try {
        var regEx = new RegExp('\\b' + disaster + '\\b', 'gi');
        regEx.lastIndex = 0;
        if (data.lang === lang && regEx.test(tweet)) {
          console.log('Twitter: ' + disaster + ' => ' + tweet);
        }
      } catch(e) {
        // no-op
      }
      if (data.entities.urls) {
        var wikipediaUrl = 'http://' + lang + '.wikipedia.org/wiki/' +
            disaster.replace(/\s/g, '_');
        data.entities.urls.forEach(function(urlObj) {
          if (urlObj.expanded_url === wikipediaUrl) {
            console.log('Twitter with Wikipedia link: ' + disaster + ' => ' +
                tweet + ' => ' + wikipediaUrl);
          }
        });
      }
    }
  });
  */
})();