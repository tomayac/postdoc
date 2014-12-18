'use strict';

var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);

app.use('/webcomponentsjs', express.static(__dirname + '/webcomponentsjs'));
app.use('/webvtt-parser', express.static(__dirname + '/webvtt-parser'));
app.use('/polymer-ldf-client', express.static(__dirname + '/polymer-ldf-client'));
app.use('/polymer-hypervideo', express.static(__dirname + '/polymer-hypervideo'));
app.use('/core-component-page', express.static(__dirname + '/core-component-page'));
app.use('/media-fragments-uri', express.static(__dirname + '/media-fragments-uri'));
app.use('/polymer', express.static(__dirname + '/polymer'));
app.use('/spectacle-en-lignes', express.static(__dirname + '/spectacle-en-lignes'));
app.use('/', express.static(__dirname + '/spectacle-en-lignes'));

// start the server
var port = process.env.PORT || 5000;
console.log('Polymer-Hypervideo running on ' + port);
server.listen(port);
