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
httpProxy.createServer(corsProxy).listen(5001);

// start the server
var port = process.env.PORT || 5000;
console.log('Polymer-Hypervideo running on ' + port);
server.listen(port);