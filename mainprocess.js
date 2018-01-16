var m = require('./index.js');
var request_name = process.argv[2];
var o_from_alexa = require('./requests_template/'+request_name+'.json');
var callback = function(err,r){
  //console.log("response (AWS Lambda -> Alexa Service):\r\n"+JSON.stringify(r)+"\r\n");
}
m.handler(o_from_alexa,"",callback);
