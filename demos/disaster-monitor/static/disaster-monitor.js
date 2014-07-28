(function() {
  var seedArticle = 'Natural_disaster';
  var wikipediaEdits = 'http://wikipedia-edits.herokuapp.com/sse';

  var disasterTypes = {};
  var monitoringList = {};

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
    var url = document.location.origin + '/disasters/monitoring-list/' +
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
      var geoData = JSON.parse(this.responseText);
      return callback(null, geoData);
    };
    var url = document.location.origin + '/disasters/geolocation/' + language +
        '/' + encodeURIComponent(article);
    xhr.open('get', url, true);
    xhr.send();
  };

  var getRevisionsData = function(article, language, callback) {
    console.log('Getting revions data for ' + language + ':' + article);
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      var revisionsData = JSON.parse(this.responseText);
      return callback(null, revisionsData);
    };
    var url = document.location.origin + '/disasters/revisions/' + language +
        '/' + encodeURIComponent(article);
    xhr.open('get', url, true);
    xhr.send();
  };

  var showCandidateArticle = function(article, language, roles) {
    getGeoData(article, language, function(err, geoData) {
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
        if (geoData.averageCoordinates.lat) {
          li.appendChild(document.createElement('br'));
          var img = document.createElement('img');
          img.classList.add('map');
          img.src = geoData.averageCoordinates.map;
          img.alt = geoData.averageCoordinates.lat + ', ' +
              geoData.averageCoordinates.lon;
          li.appendChild(img);
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
        candidate.appendChild(fragment);
      });
    });
  };

  var init = function() {
    getMonitoringList(seedArticle, function(err, data) {
      if (err) {
        status.textContent = 'Error initializing the app.';
        return console.log('Error initializing the app.');
      }
      monitoringList = data;
      console.log('Monitoring ' + Object.keys(monitoringList).length +
          ' candidate Wikipedia articles.');
      status.textContent = 'Monitoring ' + Object.keys(monitoringList).length +
          ' candidate Wikipedia articles.';
      var wikiSource = new EventSource(wikipediaEdits);
      wikiSource.addEventListener('message', function(e) {
        return parseWikipediaEdit(JSON.parse(e.data));
      });
      setInterval(function() {
        getMonitoringList(seedArticle, function(err, data) {
          if (err) {
            status.textContent = 'Error refreshing monitoring list.';
            return console.log('Error refreshing monitoring list.');
          }
          monitoringList = data;
          console.log('Monitoring ' + Object.keys(monitoringList).length +
              ' candidate Wikipedia articles.');
          status.textContent = 'Monitoring ' + Object.keys(monitoringList).length +
              ' candidate Wikipedia articles.';
        });
      }, 1000 * 60 * 60);
    });
  };
  init();

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