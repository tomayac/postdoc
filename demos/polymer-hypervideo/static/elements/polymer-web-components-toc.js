'use strict';

Polymer('polymer-web-components-toc', {
  created: function() {
  },
  ready: function() {
    var that = this;
    // listen for events
    document.addEventListener('webcomponentstoc', function(e) {
      var fragment = document.createDocumentFragment();
      var ol = document.createElement('ol');
      fragment.appendChild(ol);
      e.detail.webComponentsToC.forEach(function(elem) {
        var li = document.createElement('li');
        li.innerHTML = '<span class="polymer-elem">' +
            elem.nodeName.toLowerCase() + '</span>' +
            (elem.getAttribute('start') ?
                (' ' + elem.getAttribute('start') + '&ndash;' +
                    elem.getAttribute('end')) :
                '');
        ol.appendChild(li);
      });
      that.$.container.appendChild(fragment);
      that.fire(
        'webcomponentsparsed',
        {
          webComponents: fragment
        }
      );
    });

    // notify listeners about your existance
    that.fire('webcomponentstocready');
  }
});