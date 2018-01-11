var m = require('./index.js');
var o_from_alexa = require('./requests_template/requests_discovery');
var callback = function(err,r){
  console.log("response (AWS Lambda -> Alexa Service):\r\n"+JSON.stringify(r)+"\r\n");
}
m.handler(o_from_alexa,"",callback);
