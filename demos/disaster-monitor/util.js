var GOOGLE_STATIC_MAPS_API_KEY = process.env.GOOGLE_STATIC_MAPS_API_KEY;

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
  }
};

module.exports = util;