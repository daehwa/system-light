//namespaces
const NAMESPACE_DISCOVERY = "Alexa.Discovery";
const NAMESPACE_POWER_CONTROL = "Alexa.PowerController";
const NAMESPACE_POWER_LEVEL_CONTROL = "Alexa.PowerLevelController";
const NAMESPACE_BRIGHTNESS_CONTROL = "Alexa.BrightnessController";
const NAMESPACE_COLOR_CONTROL = "Alexa.ColorController";
const NAMESPACE_COLOR_TEMPERATURE_CONTROL = "Alexa.ColorTemperatureController";

//Response event
const RESPONSE = "Alexa";
const NAME_RESPONSE = "Response";

//Discovery
const REQUEST_DISCOVER = "Discover";
const RESPONSE_DISCOVER = "Discover.Response";

//PowerControl
const NAME_TURN_ON = "TurnOn";
const NAME_TURN_OFF = "TurnOff";

const RESPONSE_POWER = "powerState";

const CONTEXT_VALUE_ON = "ON";
const CONTEXT_VALUE_OFF = "OFF";

//PowerLevelControl
const NAME_SET_POWER_LEVEL = "SetPowerLevel";
const NAME_ADJUST_POWER_LEVEL = "AdjustPowerLevel";

const RESPONSE_POWER_LEVEL = "powerLevel";

//Brightness
const NAME_ADJUST_BRIGHTNESS = "AdjustBrightness";
const NAME_SET_BRIGHTNESS = "SetBrightness";

const RESPONSE_BRIGHTNESS = "brightness";

//Color
const NAME_SET_COLOR = "SetColor";

const RESPONSE_COLOR = "color";

//Color Temperature
const NAME_DECREASE_COLOR_TEMPERATURE = "DecreaseColorTemperature";
const NAME_INCREASE_COLOR_TEMPERATURE = "IncreaseColorTemperature";
const NAME_SET_COLOR_TEMPERATURE = "SetColorTemperature";

const RESPONSE_COLOR_TEMPERATURE = "colorTemperatureInKelvin";

//version
const PAYLOAD_VERSION = "3";

//errors
const ERROR_UNSUPPORTED_OPTERATION = "UnsupportedOperationError";
const ERROR_UNEXPECTED_INFO = "UnexpectedInformationReceivedError";

//path for light
const BASE_URL = "http://localhost:9000/gw/v1";
const BASE_URL_PARTION = "/gw/v1";
const DISCOVERY_LIGHT_PATH = "/gateway/0/discovery";
const BODY_FORM_LOCATION = "./gw_response_template/change_light_state_body.json";

//for light request
var http = require('http');
var gate = require("./gate.json");

//response entries
var context, header, endpoint, payload;
var namespace,name,value;

//response handling from gateway
//callback1: makeResponse, make formation of response (AWS Lambda -> Alexa server)
//callback2: returnResponse, return the response (AWS Lambda -> Alexa server)
function handleResponse(response,callback1,callback2){
  var serverData = '';
  response.on('data',function(chunk){
    serverData += chunk;
  });
  response.on('end',function(){
    console.log("response (gateway -> AWS Lambda):\r\n"+serverData+"\r\n");
		var d = JSON.parse(serverData);
    callback1(d,callback2);
  });
};

//request from skill adapter to gateway
var gwRequest= function(p, m, body, callback1, callback2){
  var options = {
    host: gate.sl.gateway,
    port: gate.sl.portnum,
    path: BASE_URL_PARTION + p,
    method: m,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  console.log("request (AWS Lambda -> gateway):\r\n"+JSON.stringify(options)+"\r\n");
  if(m == 'GET'){
    http.request(options,function(response){
      handleResponse(response,callback1,callback2);
    }).end();
  }
  else{
    var bodyString = JSON.stringify(body);
    http.request(options,function(response){
      handleResponse(response,callback1,callback2);
    }).write(bodyString);
  }
};

var makeResponse = function(gwResponseData,callback){
	var success = gwResponseData.result_msg == "Success";

	if(success){
  	context = createContext(namespace,name,value);
    response = createDirective2(context,header,endpoint,payload);
 	}
  else{
  	response = null;
    //note! error handling code needed
    //response = some function for error handling;
	}
  callback(response);
};

//entry
exports.handler = function(event,context,callback){
    console.log("request (Alexa Service -> AWS Lambda):\r\n"+JSON.stringify(event)+"\r\n");
    var requestdNamespace = event.directive.header.namespace;
    var response = null;

    var returnResponse = function(response){
      console.log("response (AWS Lambda -> Alexa Service):\r\n"+JSON.stringify(response)+"\r\n");
      callback(null,response);
    }

    try{
        switch(requestdNamespace){
            case NAMESPACE_DISCOVERY:
                handleDiscovery(event,returnResponse);
                break;
            case NAMESPACE_POWER_CONTROL:
                handlePowerControl(event,returnResponse);
                break;
            case NAMESPACE_POWER_LEVEL_CONTROL:
                handlePowerLevelControl(event,returnResponse);
                break;
            case NAMESPACE_BRIGHTNESS_CONTROL:
                handleBrightnessControl(event,returnResponse);
                break;
            case NAMESPACE_COLOR_CONTROL:
                handleColorControl(event,returnResponse);
                break;
            case NAMESPACE_COLOR_TEMPERATURE_CONTROL:
                handleColorTemperatureControl(event,returnResponse);
                break;
            default:
                handleUnexpectedInfo(requestdNamespace);
                break;
        }
    } catch(error){
        console.log("error: "+JSON.stringify(error));
    }
    //console.log("response (AWS Lambda -> Alexa Service):\r\n"+JSON.stringify(response)+"\r\n");
    //callback(null,response);
};
//handle Discovery 
var handleDiscovery = function(event){
    var header = createHeader(NAMESPACE_DISCOVERY,RESPONSE_DISCOVER,event.directive.header.correlationToken);
    var payload = require('./discovery_payload.json');
    //gwRequest(DISCOVERY_LIGHT_PATH,'GET',null,null,null);
    //http.get(BASE_URL+DISCOVERY_LIGHT_PATH);
    return createDirective(header,payload);
};

//handle Control
var handlePowerControl = function(event,callback){
    //init response entries
    context = null;
    header = createHeader(RESPONSE,NAME_RESPONSE,event.directive.header.correlationToken);
    endpoint = createEndpoint(event);
    payload = {};
    //init response entries
		namespace = NAMESPACE_POWER_CONTROL;
    name = RESPONSE_POWER;
    value = null;
		//request to gw
		//note! should put current state
		var body = require(BODY_FORM_LOCATION);
		var did = event.directive.endpoint.endpointId;

    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_TURN_ON:
						body["onoff"] = "on";
            value = CONTEXT_VALUE_ON;
   	        gwRequest("/device/"+did+"/light",'PUT',body,makeResponse,callback);
            break;
        case NAME_TURN_OFF:
						body["onoff"] = "off";
            value = CONTEXT_VALUE_OFF;
   	        gwRequest("/device/"+did+"/light",'PUT',body,makeResponse,callback);
            break;
        default:
            log("Error","Unsupported operation" + requestName);
            response = handleUnsupportedOperation();
            break;
    }
};

//handle PowerLevelControl
var handlePowerLevelControl = function(event,callback){
    //init response entries
    context = null;
    header = createHeader(RESPONSE,NAME_RESPONSE,event.directive.header.correlationToken);
    endpoint = createEndpoint(event);
    payload = {};
    //init response entries
    namespace = NAMESPACE_POWER_LEVEL_CONTROL;
    name = RESPONSE_POWER_LEVEL;
    value = null;
    
    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_SET_POWER_LEVEL :
            value = event.directive.payload.powerLevel;
            context = createContext(NAMESPACE_POWER_LEVEL_CONTROL,RESPONSE_POWER_LEVEL,value);
            response = createDirective2(context,header,endpoint,payload);
            break;
        case NAME_ADJUST_POWER_LEVEL:
            value = event.directive.payload.powerLevelDelta;
            context = createContext(NAMESPACE_POWER_LEVEL_CONTROL,RESPONSE_POWER_LEVEL,value);
            // note! may need to modify value: not the delta value, absolute value
            response = createDirective2(context,header,endpoint,payload);
            break;
        default:
            log("Error","Unsupported operation" + requestName);
            response = handleUnsupportedOperation();
            break;
    }
    return response;
};

//Brightness
var handleBrightnessControl = function(event,callback){
    //init response entries
    context = null;
    header = createHeader(RESPONSE,NAME_RESPONSE,event.directive.header.correlationToken);
    endpoint = createEndpoint(event);
    payload = {};
    //init response entries
    namespace = NAMESPACE_BRIGHTNESS_CONTROL;
    name = RESPONSE_BRIGHTNESS;
    value = null;

    //request to gw
    //note! should put current state
    var body = require(BODY_FORM_LOCATION);
    var did = event.directive.endpoint.endpointId;

    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_SET_BRIGHTNESS:
            value = event.directive.payload.brightness;
            body["level"] = value;
            gwRequest("/device/"+did+"/light",'PUT',body,makeResponse,callback);
            break;
        case NAME_ADJUST_BRIGHTNESS:
            value = event.directive.payload.brightnessDelta;
            body["level"] = value;
            gwRequest("/device/"+did+"/light",'PUT',body,makeResponse,callback);
            // note! may need to modify value: not the delta value, absolute value
            break;
        default:
            log("Error","Unsupported operation" + requestName);
            response = handleUnsupportedOperation();
            break;
    }
    if(value <0 || value >100){
        log("Error","Invalid value" + requestName);
        response = handleUnsupportedOperation();
    }
};

//color
var handleColorControl = function(event,callback){
    //init response entries
    context = null;
    header = createHeader(RESPONSE,NAME_RESPONSE,event.directive.header.correlationToken);
    endpoint = createEndpoint(event);
    payload = {};
    //init response entries
    namespace = NAMESPACE_COLOR_CONTROL;
    name = RESPONSE_COLOR;
    value = null;

    //request to gw
    //note! should put current state
    var body = require(BODY_FORM_LOCATION);
    var did = event.directive.endpoint.endpointId;

    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_SET_COLOR:
            value = event.directive.payload.color;
            body["hue"] = value.hue;
            body["saturation"] = value.saturation;
            body["brightness"] = value.brightness;
            gwRequest("/device/"+did+"/light",'PUT',body,makeResponse,callback);
            break;
        default:
            log("Error","Unsupported operation" + requestName);
            response = handleUnsupportedOperation();
            break;
    }
};

//Color Temperature
var handleColorTemperatureControl = function(event,callback){
    //init response entries
    context = null;
    header = createHeader(RESPONSE,NAME_RESPONSE,event.directive.header.correlationToken);
    endpoint = createEndpoint(event);
    payload = {};
    //init response entries
    namespace = NAMESPACE_COLOR_TEMPERATURE_CONTROL;
    name = RESPONSE_COLOR_TEMPERATURE;
    value = null;

    //request to gw
    //note! should put current state
    var body = require(BODY_FORM_LOCATION);
    var did = event.directive.endpoint.endpointId;
 
    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_DECREASE_COLOR_TEMPERATURE:
            value = 1000;
            body["colortemp"] = value;
            gwRequest("/device/"+did+"/light",'PUT',body,makeResponse,callback);
						// note! may need to modify value: not the delta value, absolute value
            break;
        case NAME_INCREASE_COLOR_TEMPERATURE:
            value = 1000;
            body["colortemp"] = value;
            gwRequest("/device/"+did+"/light",'PUT',body,makeResponse,callback);
            // note! may need to modify value: not the delta value, absolute value
            break;
        case NAME_SET_COLOR_TEMPERATURE:
            value = event.directive.payload.colorTemperatureInKelvin;
            body["colortemp"] = value;
            gwRequest("/device/"+did+"/light",'PUT',body,makeResponse,callback);
            break;
        default:
            log("Error","Unsupported operation" + requestName);
            response = handleUnsupportedOperation();
            break;
    }
}
var handleUnsupportedOperation = function(){
    var header = createHeader(NAMESPACE_POWER_CONTROL,ERROR_UNSUPPORTED_OPTERATION,event.directive.header.correlationToken);
    var payload = {};
    return createDirective(header,payload);
};
//handle unexpected request
var handleUnexpectedInfo = function(fault){
    var header = createHeader (fault,ERROR_UNEXPECTED_INFO,event.directive.header.correlationToken);
    var payload = {
        "faultingParameter": fault
    };
    return createDirective(header,payload);
};

//make directive language with his form
var createMessageId = function(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};

var createTimeOfSample = function(){
    var newDate = new Date();
    return newDate;
};

var createContext = function(namespace,name,value){
    return{
        "properties": [{
            "namespace": namespace,
            "name": name,
            "value": value,
            "timeOfSample":createTimeOfSample(),
            "uncertaintyInMilliseconds": 500
        }]
    };
};

var createHeader = function(namespace,name,correlationToken){
    if(namespace == NAMESPACE_DISCOVERY){
        return{
            "namespace": namespace,
            "name": name,
            "payloadVersion": PAYLOAD_VERSION,
            "messageId": createMessageId()
        };
    }
    else{
        return{
            "namespace": namespace,
            "name": name,
            "payloadVersion": PAYLOAD_VERSION,
            "messageId": createMessageId(),
            "correlationToken": correlationToken
        };
    }
    
};

var createEndpoint = function(event){
    return {
            "scope": {
                "type": event.directive.endpoint.scope.type,
                "token": event.directive.endpoint.scope.token
            },
            "endpointId": event.directive.endpoint.endpointId
    };
};

var createDirective = function(header,payload){
    return {
        "event": {
            "header": header,
            "payload": payload
        }
    };
};
var createDirective2 = function(context,header,endpoint,payload){
    return {
        "context": context,
        "event":{
            "header": header,
            "endpoint": endpoint
        },
        "payload": payload
    };
};

var log = function(title,msg){
    console.log('****' + title + ': ' + JSON.stringify(msg));
};
