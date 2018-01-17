var http = require('http');
var gate = require("./gate.json");

var options = {
    host: gate.sl.gw,
    port: gate.sl.portnum,
    path: '/gw/v1/device/0/light',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
  }
};

var body = {
      "onoff":"default",
      "level":"default",
      "colortemp":"default",
      "hue":"default",
      "saturation":"default",
      "brightness":"default",
      "x":"default",
      "y":"default",
      "r":"default",
      "g":"default",
      "r":"default",
      "tt":"default"
};

//PUT
var bodyString = JSON.stringify(body);
console.log("0");
http.request(options,function(response){
  console.log("1");
  var serverData = '';
  response.on('data',function(chunk){
    serverData += chunk;
  });
  response.on('end',function(){
    console.log("response (gateway -> AWS Lambda):\r\n"+serverData+"\r\n");
    var d = JSON.parse(serverData);
  }); 
}).write(bodyString);


//GET
/*http.request(options,function(response){
	var serverData = '';
  response.on('data',function(chunk){
    serverData += chunk;
  });
  response.on('end',function(){
    console.log("response (gateway -> AWS Lambda):\r\n"+serverData+"\r\n");
    var d = JSON.parse(serverData);
  });
}).end();*/
