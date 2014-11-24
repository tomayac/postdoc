'use strict';

var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var request = require('request');
var url = require('url');

app.use(express.static(__dirname + '/spectacle-en-lignes'));
app.get('/spectacle-en-lignes', function(req, res) {
  res.sendfile(__dirname + '/spectacle-en-lignes/index.html');
});

// start the server
var port = process.env.PORT || 5000;
console.log('Polymer-Hypervideo running on ' + port);
server.listen(port);