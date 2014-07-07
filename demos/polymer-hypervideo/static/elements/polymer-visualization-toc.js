'use strict';

Polymer('polymer-visualization-toc', {
  created: function() {
  },
  ready: function() {
    var that = this;
    var container = that.$.container;
    // listen for events
    document.addEventListener('webcomponentstoc', function(e) {
      var fragment = document.createDocumentFragment();
      var ol = document.createElement('ol');
      fragment.appendChild(ol);
      e.detail.webComponentsToC.forEach(function(elem) {
        var li = document.createElement('li');
        li.textContent = elem.nodeName.toLowerCase();
        if (elem.getAttribute('start')) {
          var span = document.createElement('span');
          span.dataset.start = elem.getAttribute('start');
          span.dataset.end = elem.getAttribute('end');
          span.innerHTML = ' (' + elem.getAttribute('start') + '&ndash;' +
                elem.getAttribute('end') + ')';
          li.appendChild(span);
        }
        ol.appendChild(li);
      });
      container.appendChild(fragment);
      that.fire(
        'webcomponentsparsed',
        {
          webComponents: fragment
        }
      );
    });

    container.addEventListener('click', function(e) {
      var current = e.target;
      if (current === container) {
        return;
      }
console.log(current.nodeName)
      while (current.nodeName !== 'SPAN') {
        current = current.parentNode;
        if (current === container) {
          return;
        }

console.log(current.nodeName)
      }
      that.fire(
        'currenttimeupdate',
        {
          currentTime: current.dataset.start
        }
      );
    }, false);


    // notify listeners about your existance
    that.fire('webcomponentstocready');
  }
});