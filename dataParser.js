var fs = require('fs');
var XLSX = require('xlsx');
var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyDMyPpU0f9sxH9NXwc9-vpIlzJiDdWRi2I'
});
var csvWriter = require('csv-write-stream');

var file_name = [];
var places_names = [];

//READ ALL THE FILES AVAILABLE IN DATA FOLDER AND STORE THEIR NAMES IN AN ARRAY
const dataFolder = './raw/';
fs.readdir(dataFolder, (err, files) => {
  files.forEach(file => {
    file_name.push(file);
  });
  parseData();
})

function parseData(){
  //READ EVERY FILE
  for (i = 0 ; i < file_name.length ; i++){
    var workbook = XLSX.readFile('raw/' + file_name[i]);
    var first_sheet = workbook.Sheets[workbook.SheetNames[0]];
    var total_rows = Number(first_sheet['!ref'].split(':')[1].replace(/^\D+/g, ''));
    //READ EVERY COLUMN OF FILE i
    for (row = 2 ; row <= total_rows ; row++){
      var level_cell = 'G' + row;
      var name_cell = 'H' + row;
      var level = first_sheet[level_cell].v;
      var name = first_sheet[name_cell].v + ', ' + file_name[i].split(".")[0];
      if (places_names.indexOf(name) == -1){
        places_names.push(name);
        findgeolocation(name, level);
      }
    }
  }
}

function findgeolocation(name, level){
  googleMapsClient.geocode({
    address: name
  }, function(err, response) {
    if (!err) {
      // var latlong = JSON.stringify(response.json.results, null, 2);
      // fs.writeFileSync("latlong.json", latlong);
      var ne_lat = response.json.results[0].geometry.bounds.northeast.lat;
      var ne_lng = response.json.results[0].geometry.bounds.northeast.lng;
      var sw_lat = response.json.results[0].geometry.bounds.southwest.lat;
      var sw_lng = response.json.results[0].geometry.bounds.southwest.lng;
      var lat = response.json.results[0].geometry.location.lat;
      var lng = response.json.results[0].geometry.location.lng;
      writeToOutput(name, level, ne_lat, ne_lng, sw_lat, sw_lng, lat, lng);
    }
    else {
      console.log(err);
    }
  });
}

var file_empty = true;
function writeToOutput(name, level, ne_lat, ne_lng, sw_lat, sw_lng, lat, lng){
  if(file_empty){
    var writer = csvWriter();
    file_empty = false;
  }
  else{
    var writer = csvWriter({sendHeaders: false});
  }
  writer.pipe(fs.createWriteStream('output.csv', {'flags': 'a'}));
  writer.write({Name: name, Level:level, NE_LAT:ne_lat, NE_LNG:ne_lng, SW_LAT:sw_lat, SW_LNG:sw_lng, LAT:lat, LNG:lng});
  writer.end();
}
