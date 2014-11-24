'use strict';

var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);

app.use(express.static(__dirname + '/'));

app.get('/spectacle-en-lignes', function(req, res) {
  res.sendfile(__dirname + '/spectacle-en-lignes/index.html');
});

// start the server
var port = process.env.PORT || 5000;
console.log('Polymer-Hypervideo running on ' + port);
server.listen(port);
