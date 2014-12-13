'use strict';
var MediaFragments = (function(window) {

  if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(fun /*, thisp */) {
      if (this === void 0 || this === null) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun !== 'function') {
        throw new TypeError();
      }
      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in t) {
          fun.call(thisp, t[i], i, t);
        }
      }
    };
  }

  // '&' is the only primary separator for key-value pairs
  var SEPARATOR = '&';

  // report errors?
  var VERBOSE = true;

  var logWarning = function(message) {
    if (VERBOSE) {
      console.log('Media Fragments URI Parsing Warning: ' + message);
    }
  };

  // the currently supported media fragments dimensions are: t, xywh, track, id
  // allows for O(1) checks for existence of valid keys
  var dimensions = {
    t: function(value) {
      var components = value.split(',');
      if (components.length > 2) {
        return false;
      }
      var start = components[0]? components[0] : '';
      var end = components[1]? components[1] : '';
      if ((start === '' && end === '') ||
          (start && !end && value.indexOf(',') !== -1)) {
        return false;
      }
      // hours:minutes:seconds.milliseconds
      var npt =
          /^((npt\:)?((\d+\:(\d\d)\:(\d\d))|((\d\d)\:(\d\d))|(\d+))(\.\d*)?)?$/;
      if ((npt.test(start)) &&
          (npt.test(end))) {
        start = start.replace(/^npt\:/, '');
        // replace a sole trailing dot, which is legal:
        // npt-sec = 1*DIGIT [ "." *DIGIT ]
        start = start.replace(/\.$/, '');
        end = end.replace(/\.$/, '');
        var convertToSeconds = function(time) {
          if (time === '') {
            return false;
          }
          // possible cases:
          // 12:34:56.789
          //    34:56.789
          //       56.789
          //       56
          var hours;
          var minutes;
          var seconds;
          time = time.split(':');
          var length = time.length;
          if (length === 3) {
            hours = parseInt(time[0], 10);
            minutes = parseInt(time[1], 10);
            seconds = parseFloat(time[2]);
          } else if (length === 2) {
            hours = 0;
            minutes = parseInt(time[0], 10);
            seconds = parseFloat(time[1]);
          } else if (length === 1) {
            hours = 0;
            minutes = 0;
            seconds = parseFloat(time[0]);
          } else {
            return false;
          }
          if (hours > 23) {
            logWarning('Please ensure that hours <= 23.');
            return false;
          }
          if (minutes > 59) {
            logWarning('Please ensure that minutes <= 59.');
            return false;
          }
          if (length > 1 && seconds >= 60) {
            // this constraint must not be applied if you specify only seconds
            logWarning('Please ensure that seconds < 60.');
            return false;
          }
          return hours * 3600 + minutes * 60 + seconds;
        };
        var startNormalized = convertToSeconds(start);
        var endNormalized = convertToSeconds(end);
        if (start && end) {
          if (startNormalized < endNormalized) {
            return {
              value: value,
              unit: 'npt',
              start: start,
              end: end,
              startNormalized: startNormalized,
              endNormalized: endNormalized
            };
          } else {
            logWarning('Please ensure that start < end.');
            return false;
          }
        } else {
          if ((convertToSeconds(start) !== false) ||
              (convertToSeconds(end) !== false)) {
            return {
              value: value,
              unit: 'npt',
              start: start,
              end: end,
              startNormalized: startNormalized === false ? '' : startNormalized,
              endNormalized: endNormalized === false ? '' : endNormalized
            };
          } else {
            logWarning('Please ensure that start or end are legal.');
            return false;
          }
        }
      }
      // hours:minutes:seconds:frames.further-subdivison-of-frames
      var smpte = /^(\d+\:\d\d\:\d\d(\:\d\d(\.\d\d)?)?)?$/;
      var prefix = start.replace(/^(smpte(-25|-30|-30-drop)?).*/, '$1');
      start = start.replace(/^smpte(-25|-30|-30-drop)?\:/, '');
      if ((smpte.test(start)) && (smpte.test(end))) {
        // we interpret frames as milliseconds, and further-subdivison-of-frames
        // as microseconds. this allows for relatively easy comparison.
        var convertToSecondsWithFrames = function(time) {
          if (time === '') {
            return false;
          }
          // possible cases:
          // 12:34:56
          // 12:34:56:78
          // 12:34:56:78.90
          var hours;
          var minutes;
          var seconds;
          var frames;
          var subframes;
          time = time.split(':');
          var length = time.length;
          if (length === 3) {
            hours = parseInt(time[0], 10);
            minutes = parseInt(time[1], 10);
            seconds = parseInt(time[2], 10);
            frames = 0;
            subframes = 0;
          } else if (length === 4) {
            hours = parseInt(time[0], 10);
            minutes = parseInt(time[1], 10);
            seconds = parseInt(time[2], 10);
            if (time[3].indexOf('.') === -1) {
              frames = parseInt(time[3], 10);
              subframes = 0;
            } else {
              var frameSubFrame = time[3].split('.');
              frames = parseInt(frameSubFrame[0], 10);
              subframes = parseInt(frameSubFrame[1], 10);
            }
          } else {
            return false;
          }
          if (hours > 23) {
            logWarning('Please ensure that hours <= 23.');
            return false;
          }
          if (minutes > 59) {
            logWarning('Please ensure that minutes <= 59.');
            return false;
          }
          if (seconds > 59) {
            logWarning('Please ensure that seconds <= 59.');
            return false;
          }
          return hours * 3600 + minutes * 60 + seconds +
              frames * 0.001 + subframes * 0.000001;
        };
        if (start && end) {
          if (convertToSecondsWithFrames(start) <
              convertToSecondsWithFrames(end)) {
            return {
              value: value,
              unit: prefix,
              start: start,
              end: end
            };
          } else {
            logWarning('Please ensure that start < end.');
            return false;
          }
        } else {
          if ((convertToSecondsWithFrames(start) !== false) ||
              (convertToSecondsWithFrames(end) !== false)) {
            return {
              value: value,
              unit: prefix,
              start: start,
              end: end
            };
          } else {
            logWarning('Please ensure that start or end are legal.');
            return false;
          }
        }
      }
      // regexp adapted from http://delete.me.uk/2005/03/iso8601.html
      var wallClock = /^((\d{4})(-(\d{2})(-(\d{2})(T(\d{2})\:(\d{2})(\:(\d{2})(\.(\d+))?)?(Z|(([-\+])(\d{2})\:(\d{2})))?)?)?)?)?$/;
      start = start.replace('clock:', '');
      if ((wallClock.test(start)) && (wallClock.test(end))) {
        // the last condition is to ensure ISO 8601 date conformance.
        // not all browsers parse ISO 8601, so we can only use date parsing
        // when it's there.
        if (start && end && !isNaN(Date.parse('2009-07-26T11:19:01Z'))) {
          // if both start and end are given, then the start must be before
          // the end
          if (Date.parse(start) <= Date.parse(end)) {
            return {
              value: value,
              unit: 'clock',
              start: start,
              end: end
            };
          } else {
            logWarning('Please ensure that start < end.');
            return false;
          }
        } else {
          return {
            value: value,
            unit: 'clock',
            start: start,
            end: end
          };
        }
      }
      logWarning('Invalid time dimension.');
      return false;
    },
    xywh: function(value) {
      // "pixel:" is optional
      var pixelCoordinates = /^(pixel\:)?\d+,\d+,\d+,\d+$/;
      // "percent:" is obligatory
      var percentSelection = /^percent\:\d+,\d+,\d+,\d+$/;
      var values = value.replace(/(pixel|percent)\:/, '').split(',');
      var x = parseInt(values[0], 10);
      var y = parseInt(values[1], 10);
      var w = parseInt(values[2], 10);
      var h = parseInt(values[3], 10);
      if (pixelCoordinates.test(value)) {
        if (w > 0 && h > 0) {
          return {
            value: value,
            unit: 'pixel',
            x: x,
            y: y,
            w: w,
            h: h
          };
        } else {
          logWarning('Please ensure that w > 0 and h > 0');
          return false;
        }
      } else if (percentSelection.test(value)) {
        /**
         * checks for valid percent selections
         */
        var checkPercentSelection = (function checkPercentSelection(
            x, y, w, h) {
          if (!((0 <= x) && (x <= 100))) {
            logWarning('Please ensure that 0 <= x <= 100.');
            return false;
          }
          if (!((0 <= y) && (y <= 100))) {
            logWarning('Please ensure that 0 <= y <= 100.');
            return false;
          }
          if (!((0 <= w) && (w <= 100))) {
            logWarning('Please ensure that 0 <= w <= 100.');
            return false;
          }
          if (!((0 <= h) && (h <= 100))) {
            logWarning('Please ensure that 0 <= h <= 100.');
            return false;
          }
          if (x + w > 100) {
            logWarning('Please ensure that x + w <= 100.');
            return false;
          }
          if (y + h > 100) {
            logWarning('Please ensure that y + h <= 100.');
            return false;
          }
          return true;
        });
        if (checkPercentSelection(x, y, w, h)) {
          return {
            value: value,
            unit: 'percent',
            x: x,
            y: y,
            w: w,
            h: h
          };
        }
        logWarning('Invalid percent selection.');
        return false;
      } else {
        logWarning('Invalid spatial dimension.');
        return false;
      }
    },
    track: function(value) {
      return {
        value: value,
        name: value
      };
    },
    id: function(value) {
      return {
        value: value,
        name: value
      };
    },
    chapter: function(value) {
      return {
        value: value,
        chapter: value
      };
    }
  };

  /**
   * splits an octet string into allowed key-value pairs
   */
  var splitKeyValuePairs = function(octetString) {
    var keyValues = {};
    var keyValuePairs = octetString.split(SEPARATOR);
    keyValuePairs.forEach(function(keyValuePair) {
      // the key part is up to the first(!) occurrence of '=', further '='-s
      // form part of the value
      var position = keyValuePair.indexOf('=');
      if (position < 1) {
        return;
      }
      var components = [
          keyValuePair.substring(0, position),
          keyValuePair.substring(position + 1)];
      // we require a value for each key
      if (!components[1]) {
        return;
      }
      // the key name needs to be decoded
      var key = decodeURIComponent(components[0]);
      // only allow keys that are currently supported media fragments dimensions
      var dimensionChecker = dimensions[key];
      // the value needs to be decoded
      var value = decodeURIComponent(components[1]);
      if (dimensionChecker) {
        value = dimensionChecker(value);
      } else {
        // we had a key that is not part of media fragments
        return;
      }
      if (!value) {
        return;
      }
      // keys may appear more than once, thus store all values in an array,
      // the exception being &t
      if (!keyValues[key]) {
        keyValues[key] = [];
      }
      if (key !== 't') {
        keyValues[key].push(value);
      } else {
        keyValues[key][0] = value;
      }
    });
    return keyValues;
  };

  return {
    parse: function(opt_uri) {
      return MediaFragments.parseMediaFragmentsUri(opt_uri);
    },
    parseMediaFragmentsUri: function(opt_uri) {
      var uri = opt_uri? opt_uri : window.location.href;
      // retrieve the query part of the URI
      var indexOfHash = uri.indexOf('#');
      var indexOfQuestionMark = uri.indexOf('?');
      var end = (indexOfHash !== -1? indexOfHash : uri.length);
      var query = indexOfQuestionMark !== -1?
          uri.substring(indexOfQuestionMark + 1, end) : '';
      // retrieve the hash part of the URI
      var hash = indexOfHash !== -1? uri.substring(indexOfHash + 1) : '';
      var queryValues = splitKeyValuePairs(query);
      var hashValues = splitKeyValuePairs(hash);
      return {
        query: queryValues,
        hash: hashValues,
        toString: function() {
          var buildString = function(name, thing) {
            var s = '\n[' + name + ']:\n';
            if (!Object.keys) Object.keys = function(o) {
              if (o !== Object(o)) {
                throw new TypeError('Object.keys called on non-object');
              }
              var ret = [], p;
              for (p in o) {
                if (Object.prototype.hasOwnProperty.call(o,p)) ret.push(p);
              }
              return ret;
            };
            Object.keys(thing).forEach(function(key) {
              s += '  * ' + key + ':\n';
              thing[key].forEach(function(value) {
                s += '    [\n';
                Object.keys(value).forEach(function(valueKey) {
                  s += '      - ' + valueKey + ': ' + value[valueKey] + '\n';
                });
                s += '   ]\n';
              });
            });
            return s;
          };
          var string =
              buildString('Query', queryValues) +
              buildString('Hash', hashValues);
          return string;
        }
      };
    }
  };
})(window);
