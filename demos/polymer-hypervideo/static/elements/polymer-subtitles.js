'use strict';

Polymer('polymer-subtitles', {
  created: function() {
  },
  ready: function() {
    var that = this;
    this.fire('subtitlesfound', {
      src: that.src,
      displaySubtitlesGroup: that.displaysubtitlesgroup
    });
  }
});