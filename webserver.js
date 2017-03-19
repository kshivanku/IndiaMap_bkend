// WEB SERVER STUFF
var express = require('express');
var fs = require('fs');
var app = express();
var server = app.listen(8000, function(){
  console.log('listening on port 8000');
})

app.get('/placedata', sendData);

function sendData(req, res){
  var latlng_data = JSON.parse(fs.readFileSync("output.json"));
  var res.send(latlng_data);
}
