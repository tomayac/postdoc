process.env.PWD = process.cwd();
'use strict';

var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);

app.use('/webcomponentsjs', express.static(process.env.PWD + '/webcomponentsjs'));
app.use('/webvtt-parser', express.static(process.env.PWD + '/webvtt-parser'));
app.use('/polymer-ldf-client', express.static(process.env.PWD + '/polymer-ldf-client'));
app.use('/polymer-hypervideo', express.static(process.env.PWD + '/polymer-hypervideo'));
app.use('/core-component-page', express.static(process.env.PWD + '/core-component-page'));
app.use('/media-fragments-uri', express.static(process.env.PWD + '/media-fragments-uri'));
app.use('/polymer', express.static(process.env.PWD + '/polymer'));
app.use('/spectacle-en-lignes', express.static(process.env.PWD + '/spectacle-en-lignes'));
app.use('/', express.static(process.env.PWD + '/spectacle-en-lignes'));

// start the server
var port = process.env.PORT || 3000;
console.log(process.env.PWD);
console.log(__dirname);
console.log('Polymer-Hypervideo running on ' + port);
server.listen(port);
