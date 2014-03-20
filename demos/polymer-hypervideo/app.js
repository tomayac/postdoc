'use strict';

var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var corsProxy = require('corsproxy');
var httpProxy = require('http-proxy');

// start static serving
// and set default route to index.html
app.use(express.static(__dirname + '/static'));
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

// start the CORS proxy
var corsProxyPort = 5001;
httpProxy.createServer(corsProxy).listen(corsProxyPort, 'localhost');
console.log('CORS proxy running on ' + corsProxyPort);

// start the server
var port = process.env.PORT || 5000;
console.log('Polymer-Hypervideo running on ' + port);
server.listen(port);