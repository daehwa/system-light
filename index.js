//namespaces
const NAMESPACE_CONTROL = "Alexa.ConnectedHome.Control";
const NAMESPACE_DISCOVERY = "Alexa.Discovery";

//discovery
const REQUEST_DISCOVER = "Discover";
const RESPONSE_DISCOVER = "Discover.Response";

//control
const REQUEST_TURN_ON = "TurnOnRequest";
const RESPONSE_TURN_ON = "TurnOnConfirmation"
const REQUEST_TURN_OFF = "TurnOffRequest";
const RESPONSE_TURN_OFF = "TurnOffConfirmation";

//errors
const ERROR_UNSUPPORTED_OPTERATION = "UnsupportedOperationError";
const ERROR_UNEXPECTED_INFO = "UnexpectedInformationReceivedError"

//path for light
const DISCOVERY_LIGHT_PATH = "/gateway/0/discovery";

//for light request
var http = require('http');
var gate = require("./gate.json");

//response handling from gateway
function handleResponse(response){
  var serverData = '';
  response.on('data',function(chunk){
    serverData += chunk;
  });
  response.on('end',function(){
    console.log("response (gateway -> AWS Lambda):\r\n"+serverData+"\r\n");
  });
}

//reguest from skill adapter to gateway
var gwGETRequest= function(p){
  var options = {
    hostname: gate.sl.gateway,
    port: gate.sl.portnum,
    path: p
  }
  console.log("request (AWS Lambda -> gateway):\r\n"+JSON.stringify(options)+"\r\n");
  http.request(options,function(response){
    handleResponse(response);
  }).end();
}


//entry
exports.handler = function(event,context,callback){
    console.log("request (Alexa Service -> AWS Lambda):\r\n"+JSON.stringify(event)+"\r\n");
    var requestdNamespace = event.directive.header.namespace;
    var response = null;
    try{
        switch(requestdNamespace){
            case NAMESPACE_DISCOVERY:
                response = handleDiscovery(event);
                break;
            case NAMESPACE_CONTROL:
                response = handleControl(event);
                break;
            default:
                response = handleUnexpectedInfo(requestdNamespace);
                break;
        }
    } catch(error){
        console.log(JSON.stringify(error));
    }
    console.log("response (AWS Lambda -> Alexa Service):\r\n"+JSON.stringify(response)+"\r\n");
    callback(null,response);
}
//handle Discovery 
var handleDiscovery = function(event){
    var header = createHeader(NAMESPACE_DISCOVERY,RESPONSE_DISCOVER);
    var payload = require('./discovery_payload.json');
    //console.log("daehwakim: "+event);
    //gwGETRequest(DISCOVERY_LIGHT_PATH);
    return createDirective(header,payload);
}
//handle Control
var handleControl = function(event){
    var response = null;
    var requestName = event.header.name;
    switch(requestName){
        case REQUEST_TURN_ON:
            response = handleControlTurnOn(event);
            break;
        case REQUEST_TURN_OFF:
            response = handleControlTurnOff(event);
            break;
        default:
            log("Error","Unsupported operation" + requestName);
            response = handleUnsupportedOperation();
            break;
    }
}
var handleControlTurnOn = function(event){
    var header = createHeader(NAMESPACE_CONTROL,RESPONSE_TURN_ON);
    var payload = {};
    return createDirective(header,payload);
}
var handleControlTurnOff = function(event){
    var header = createHeader(NAMESPACE_CONTROL,REQUEST_TURN_OFF);
    var payload = {};
    return createDirective(header,payload);
}
var handleUnsupportedOperation = function(){
    var header = createHeader(NAMESPACE_CONTROL,ERROR_UNSUPPORTED_OPTERATION);
    var payload = {};
    return createDirective(header,payload);
}
//handle unexpected request
var handleUnexpectedInfo = function(fault){
    var header = createHeader (NAMESPACE_CONTROL,ERROR_UNEXPECTED_INFO);
    var payload = {
        "faultingParameter": fault
    };
    return createDirective(header,payload);
}

//make directive language with his form
var createMessageId = function(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

var createHeader = function(namespace,name){
    return{
        "namespace": namespace,
        "name": name,
        "payloadVersion": "3",
        "messageId": createMessageId()
    };
    
}

var createDirective = function(header,payload){
    return {
        "event": {
            "header": header,
            "payload": payload
        }
    };
    //return require("./sth.json");
}

var log = function(title,msg){
    console.log('****' + title + ': ' + JSON.stringify(msg));
}
