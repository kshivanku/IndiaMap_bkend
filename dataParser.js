var fs = require('fs');
var XLSX = require('xlsx');
var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyAnYxQOANnzBczwOLS5oOuBeGfpockm8KE'
});
var max_api_calls = 300;

//LOADING ALL THE DATA IN PLACEDATA VARIABLE
var latlong_data = JSON.parse(fs.readFileSync("output.json"));
var session_data = []; //THIS IS MOSTLY TO TRACK THE NUMBER OF API CALLS, MANY CALLS COMEBACK WITH NO DATA THATS WHY THIS IS REQUIRED
var max_row;
var max_filename;

//READ ALL THE FILES AVAILABLE IN DATA FOLDER AND STORE THEIR NAMES IN AN ARRAY
var file_name = [];
const dataFolder = './raw/';
fs.readdir(dataFolder, (err, files) => {
  files.forEach(file => {
    file_name.push(file);
  });
  calibrate();
})

//CLIBERATE FUNCTION BASICALLY SETS WHICH FILE HAS TO BE READ FROM WHICH ROW
function calibrate(){
  var calibration_data = JSON.parse(fs.readFileSync("calibrate.json"));
  var last_row = calibration_data.last_row;
  var places_names = calibration_data.places;
  var last_file = calibration_data.last_file;
  var index;
  if(last_file != "NULL"){
    index = file_name.indexOf(last_file);
  }
  else{
    index = 0;
  }
  if(last_row == "NULL"){
    last_row = 2;
  }
  parseData(index, last_row, places_names);
}

function parseData(index, last_row, places_names){
  var api_call_num = 0;
  //READ EVERY FILE
  for (i = index ; i < file_name.length ; i++){
    max_filename = file_name[i];
    var workbook = XLSX.readFile('raw/' + file_name[i]);
    var first_sheet = workbook.Sheets[workbook.SheetNames[0]];
    var total_rows = Number(first_sheet['!ref'].split(':')[1].replace(/^\D+/g, ''));
    //READ EVERY COLUMN OF FILE i
    for (row = last_row ; row <= total_rows; row++){
      max_row = row;
      var level_cell = 'G' + row;
      var name_cell = 'H' + row;
      var level = first_sheet[level_cell].v;
      var name = first_sheet[name_cell].v + ', ' + file_name[i].split(".")[0];
      if (places_names.indexOf(name) == -1){
        places_names.push(name);
        if(places_names.length > 10){
          places_names.splice(0,1);
        }
        api_call_num += 1;
        findgeolocation(name, level, places_names);
      }
      if(api_call_num >= max_api_calls){
        return 1; //STOP MAKING API CALLS IF MAX NUMBER IS REACHED
      }
    }
    last_row = 2; //RESETING THE ROW NUMBERS WHEN NEXT FILE HAS TO BE READ
  }
}

function findgeolocation(name, level, places_names){
  var data = {
    name: name,
    level: level
  }
  googleMapsClient.geocode({
    address: name
  }, function(err, response) {
    if (!err) {
      if(response.json.results[0]){
        if(response.json.results[0].geometry.bounds){
          data.ne_lat = response.json.results[0].geometry.bounds.northeast.lat;
          data.ne_lng = response.json.results[0].geometry.bounds.northeast.lng;
          data.sw_lat = response.json.results[0].geometry.bounds.southwest.lat;
          data.sw_lng = response.json.results[0].geometry.bounds.southwest.lng;
        }
        data.lat = response.json.results[0].geometry.location.lat;
        data.lng = response.json.results[0].geometry.location.lng;
        latlong_data.push(data);
        session_data.push(data);
      }
      else {
        session_data.push("BLANK"); //JUST TO KEEP THE COUNT RIGHT WHEN NO DATA IS RECEIVED FOR A PARTICULAR CALL
      }
      if(session_data.length >= max_api_calls){
        console.log("saving changes");
        saveChanges(places_names);
      }
    }
    else {
      console.log(err);
    }
  });
}

function saveChanges(places_names_covered){
  var dataToCalibrate = {
    'last_file': max_filename,
    'last_row': max_row,
    'places': places_names_covered
  }
  var dataToCalibrate_str = JSON.stringify(dataToCalibrate, null, 2);
  fs.writeFileSync("calibrate.json", dataToCalibrate_str);
  var latlong_data_srt = JSON.stringify(latlong_data, null, 2);
  fs.writeFileSync("output.json", latlong_data_srt);
}
