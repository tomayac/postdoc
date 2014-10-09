var DEBUG = true;

var cheerio = require('cheerio');
var request = require('request');

var freebase = {
  getFreebaseUrl: function(url) {

    var repeatString = function repeatString(strInput, intCount) {
      var arrTmp = new Array(intCount + 1);
      return arrTmp.join(strInput);
    };

    var utf8Decode = function(utfText) {
      var string = '';
      var i = 0;
      var c = 0;
      var c1 = 0;
      var c2 = 0;
      while (i < utfText.length) {
        c = utfText.charCodeAt(i);
        if (c < 128) {
          string += String.fromCharCode(c);
          i++;
        } else if((c > 191) && (c < 224)) {
          c2 = utfText.charCodeAt(i + 1);
          string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
          i += 2;
        } else {
          c2 = utfText.charCodeAt(i + 1);
          c3 = utfText.charCodeAt(i + 2);
          string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) |
              (c3 & 63));
          i += 3;
        }
      }
      return string;
    };

    url = url.replace(/^https/, 'http');
    var i = url.indexOf('.org/');
    var j = url.indexOf('#');
    if (j === -1) {
      j = url.length;
    }
    var key = utf8Decode(unescape(url.substring(i + 10, j)));
    var newKey = key.replace(/[^-A-Za-z0-9_]/g, function(x) {
      var s = '' + x.charCodeAt(0);
      s = parseInt(s, 10).toString(16).toUpperCase();
      return '$' + repeatString('0', 4 - s.length) + s;
    });
    var freebaseUrl = 'http://www.freebase.com/view/wikipedia/en/' + newKey;
    DEBUG && console.log('Freebase URL: ' + freebaseUrl);
    return freebaseUrl;
  },
  getFreebaseMid: function(url, callback) {
    url = this.getFreebaseUrl(url);
    request.get(url, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        return callback(err || 'Could not extract mid. Error: ' +
            response.statusCode);
      }
      try {
        var $ = cheerio.load(body);
        var canonical = $('link[rel="canonical"]').attr('href');
        if (canonical) {
          return callback(null, canonical.replace('http://www.freebase.com', ''));
        };
        return callback('Could not extract mid.');
      } catch(e) {
        return callback('Could not extract mid.');
      }
    });
   }
};
/*
freebase.getFreebaseMid('http://en.wikipedia.org/wiki/Parque_de_Espa%C3%B1a', function(err, res) {
  console.log(res)
})
*/
module.exports = freebase;