'use strict';

Polymer('polymer-web-components-toc', {
  created: function() {
  },
  ready: function() {
    var that = this;
    // listen for events
    document.addEventListener('webcomponentstoc', function(e) {
      console.log(e.detail);
      that.$.container.textContent = Object.keys(e.detail);
    });

    // notify listeners about your existance
    this.fire(
      'webcomponentstocready',
      {}
    );
  }
});