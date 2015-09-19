process.env.PWD = process.cwd();
'use strict';

var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);

app.use('/', express.static(process.env.PWD + '/'));

// start the server
var port = process.env.PORT || 3000;
console.log(process.env.PWD);
console.log(__dirname);
console.log('Hypervideo running on ' + port);
server.listen(port);
