'use strict';

Polymer('polymer-chapters', {
  created: function() {
  },
  ready: function() {
    var that = this;
    this.fire('chaptersfound', {
      src: that.src,
      displayChaptersThumbnails: that.displaychaptersthumbnails
    });
  }
});