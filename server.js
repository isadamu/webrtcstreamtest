var express = require('express');
var app = express();
var server = require('http').createServer(app);
var path = require("path");

var port = process.env.PORT || 3000;
server.listen(port);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/A', function(req, res) {
    res.sendFile(__dirname + '/client-A.html');
});

app.get('/B', function(req, res) {
    res.sendFile(__dirname + '/client-B.html');
});
