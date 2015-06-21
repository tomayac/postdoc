var GOOGLE_STATIC_MAPS_API_KEY = process.env.GOOGLE_STATIC_MAPS_API_KEY;

var geocoder = require('local-reverse-geocoder');

var util = {
  createGoogleMapsUrl: function(lat, lon) {
    return 'https://maps.googleapis.com/maps/api/staticmap' +
        '?key=' + GOOGLE_STATIC_MAPS_API_KEY +
        '&markers=size:mid|color:orange|' + lat + ',' + lon +
        '&size=300x200' +
        '&maptype=terrain' +
        '&zoom=6';
  },

  toTsv: function(results) {
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
    return tsv;
  },

  toTxt: function(results) {
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
    return keywords.join('\n\n');
  },

  toAdWords: function(results, callback) {
    var tsv = '';
    var languages = {};
    var extraColumns = [
      'Concept',
      'Freebase',
      'Latitude',
      'Longitude',
      'Country',
      'City',
      'Admin 1',
      'Admin 2'
    ];
    var geoCoordinates = [];

    // What languages are in the result set
    // Prepare geocoding array
    var i = 0;
    for (var key in results) {
      var langLinks = results[key].langLinks;
      for (var language in langLinks) {
        if (language === 'wikidata') {
          continue;
        }
        languages[language] = true;
      }
      if (results[key].geocoordinates) {
        geoCoordinates[i] = {
          latitude: results[key].geocoordinates.lat,
          longitude: results[key].geocoordinates.lon
        };
        i++;
      }
    }
    var languagesIndex = Object.keys(languages).sort();
    var languagesIndexLen = languagesIndex.length;
    // Header
    tsv += extraColumns.join('\t') + '\t' + languagesIndex.join('\t') + '\n';

    // Reverse geocode all coordinates
    geocoder.lookUp(geoCoordinates, 1, function(err, addresses) {
      // Start main .tsv creation
      var i = 0;
      for (var key in results) {
        // Determine the height of the current concept's block
        var langLinks = results[key].langLinks;
        var freebaseMid = results[key].freebaseMid;
        var address = '';
        var coordinates = {};
        if (results[key].geocoordinates) {
          address = addresses[i];
          coordinates = results[key].geocoordinates;
          i++;
        }

        var columns = new Array(languagesIndexLen + extraColumns.length);
        var max = 0;
        for (var language in langLinks) {
          if (language === 'wikidata') {
            continue;
          }
          var length = 1 + langLinks[language].alternativeLabels.length;
          if (length > max) {
            max = length;
          }
        }

        // Add the main concept column
        columns[0] = Array.apply(null, Array(max)).map(function() {
          return key;
        });

        // Add the Freebase column
        columns[1] = Array.apply(null, Array(max)).map(function() {
          return freebaseMid;
        });

        // Add the latitude column
        columns[2] = Array.apply(null, Array(max)).map(function() {
          return coordinates.lat || '';
        });

        // Add the longitude column
        columns[3] = Array.apply(null, Array(max)).map(function() {
          return coordinates.lon || '';
        });

        // Add the country column
        columns[4] = Array.apply(null, Array(max)).map(function() {
          return (address[0] && address[0][0] && address[0][0].countryCode ?
              address[0][0].countryCode : '');
        });

        // Add the city column
        columns[5] = Array.apply(null, Array(max)).map(function() {
          return (address[0] && address[0][0] && address[0][0].name ?
              address[0][0].name : '');
        });

        // Add the admin 1 column
        columns[6] = Array.apply(null, Array(max)).map(function() {
          return (address[0] && address[0][0] && address[0][0].admin1Code &&
              address[0][0].admin1Code.name ?
              address[0][0].admin1Code.name : '');
        });

        // Add the admin 2 column
        columns[7] = Array.apply(null, Array(max)).map(function() {
          return (address[0] && address[0][0] && address[0][0].admin2Code &&
              address[0][0].admin2Code.name ?
              address[0][0].admin2Code.name : '');
        });

        // Add the language columns
        for (var language in langLinks) {
          if (language === 'wikidata') {
            continue;
          }
          // http://www.2ality.com/2013/11/initializing-arrays.html
          var lines = Array.apply(null, Array(max)).map(function(_ignore, j) {
            return (j === 0 ?
                language + ':' + langLinks[language].label :
                (langLinks[language].alternativeLabels[j - 1] ?
                  language + ':' + langLinks[language].alternativeLabels[j - 1] :
                  ''));
          });
          columns[languagesIndex.indexOf(language) + extraColumns.length] = lines;
        }
        // Generate the .tsv
        for (var k = 0; k < max; k++) {
          for (var l = 0; l < languagesIndexLen; l++) {
            if (columns[l] && columns[l][k]) {
              var cell = columns[l][k];
              tsv += (l < extraColumns.length ? cell : cell.split(':')[1]) + '\t';
            } else {
              tsv += '\t';
            }
          }
          tsv += '\n';
        }
      }
      return callback(null, tsv);
    });
  }
};

module.exports = util;