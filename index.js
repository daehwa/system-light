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
const NAME_ERROR = "ErrorResponse";

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
//const BASE_URL = "http://localhost:9000/gw/v1";
const BASE_URL_PARTION = "/gw/v1";
const DISCOVERY_DEVICE = "/device";
const DISCOVERY_GROUP = "/group";
const DISCOVERY_UNIT_SPACE = "/uspace";

//scenes
const SLEEP_MODE = 32777;

//for light request
var http = require('http');
var gate = require("./gate.json");

//response entries
var context, header, endpoint, payload, endpoints;
var namespace,name,value;

//response handling from gateway
//callback1: makeResponse, make formation of response (AWS Lambda -> Alexa server)
//callback2: returnResponse, return the response (AWS Lambda -> Alexa server)
function handleResponse(response,id,unit,body,callback1,callback2){
  var serverData = '';
  response.on('data',function(chunk){
    serverData += chunk;
  });
  response.on('uncaughtException',function(err){
    console.log("uncaughtException: "+err);
  });
  response.on('end',function(){
    console.log("response (gateway -> AWS Lambda):\r\n"+serverData+"\r\n");
		var d = JSON.parse(serverData);
    callback1(d,id,unit,body,callback2);
  });
}

//request from skill adapter to gateway
var gwRequest= function(p, m, id, unit, body, callback1, callback2){
  var options = {
    host: gate.sl.gw,
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
      handleResponse(response,id,unit,body,callback1,callback2);
    }).end();
  }
  else{
    var bodyString = JSON.stringify(body);
    options["headers"] = {
      'Content-Type': 'application/json',
			'Content-Length': bodyString.length
    };
    http.request(options,function(response){
      handleResponse(response,id,unit,null,callback1,callback2);
    }).write(bodyString);
  }
};

var makeResponse = function(gwResponseData,id,unit,body,callback){
	var response = null;
	var success = gwResponseData.result_code == "200";

	if(success){
    var r = gwResponseData.result_data;
		var scene = isScene(unit,id);
	  if(scene && body == null){ // if scene control
			namespace = NAMESPACE_POWER_CONTROL;
    	name = RESPONSE_POWER;
			value = CONTEXT_VALUE_ON;
			context = createContext(namespace,name,value);
    	payload = {};
			response = createDirective2(context,header,endpoint,payload);
			callback(response);
  	}
    else if(unit == "device" && id ==null){ //if device discovery
      var d = r.device_list;
    	createEndpoints(d,"did","device",callback);
    }
		else if(unit == "group" && id == null){ //if group discovery
      var g = r.group_list;
			createEndpoints(g,"gdid","group",callback);
		}
		else if(unit == "uspace" && id == null){ //if unit space discovery
      var u = r.uspace_list;
			createEndpoints(u,"uspace_id","uspace",callback);
		}
    else if(body !=null){//If Adjust-things
      value = null;
      var min=null,max=null;
      var v;
      switch(unit){
        case "device":
          v = r.light;
          break;
        case "group":
          v = ((r.group_list)[0]);
          body["onlevel"] = 100;
          break;
        case "uspace":
          v = ((r.device_list)[0]).light;
          break;
      }
      switch(name){
        case RESPONSE_BRIGHTNESS:
          //body["onoff"] = v.onoff;
          //body["colortemp"] = v.colortemp;
          value = body.level;
          body["level"] = value + v.level;
          min = 0;
          max = 100;
          value = body.level;
          break;
        case RESPONSE_COLOR_TEMPERATURE:
          //body["onoff"]=v.onoff;
          //body["level"]=v.level;
          value = body.colortemp;
          body["colortemp"] = value + v.colortemp;
          min = 2700; // alexa's range is from 1000 but sl2.0 is from 2700
          max = 6500; // alexa's range is from 10000 but sl2.0 is from 6500
          value = body.colortemp;
          break;
      }
      //In validRange?
      if(value < min || value > max){ //invalid
        header["name"] = NAME_ERROR;
        payload = {
          "type": "VALUE_OUT_OF_RANGE",
          "message":"The " + name + " cannot be set to " + value,
          "validRange":{
            "minumumValue": min,
            "maximumValue": max
          }
        };
        response = createErrorResponse(header,endpoint,payload);
        callback(response);
      }
      else{ //valid
        var path = createControlPath(id,unit,false);
        gwRequest(path,'PUT',null,null,body,makeResponse,callback);
      }
    }
    else{//After inquiring state (조회하고난 후)
      if(value == null){
        payload = {
          "type": "VALUE_OUT_OF_RANGE",
          "message":"The " + name + " cannot be set to " + value,
          "validRange":{
            "minumumValue": min,
            "maximumValue": max
          }
        };
        response = createErrorResponse(header,endpoint,payload);
      }
      else{
        context = createContext(namespace,name,value);
        response = createDirective2(context,header,endpoint,payload); 
      }
      callback(response);
    }
 	}
  else{
    header["name"] = NAME_ERROR;
    payload = {
      "type":"INTERNAL_ERROR",
      "message": "The gateway fails to change light setting (no such device name, time out or ...)"
    };
  	response = createErrorResponse(header,endpoint,payload);
    callback(response);
	}
};

//entry
exports.handler = function(event,context,callback){
    console.log("request (Alexa Service -> AWS Lambda):\r\n"+JSON.stringify(event)+"\r\n");

    var returnResponse = function(response){
      console.log("response (AWS Lambda -> Alexa Service):\r\n"+JSON.stringify(response)+"\r\n");
      callback(null,response);
    };

    //handle scene
    var requestdNamespace = event.directive.header.namespace;
    if(requestdNamespace == NAMESPACE_POWER_CONTROL){
      var id = event.directive.endpoint.endpointId;
      var unit = event.directive.endpoint.cookie.unit;
      if(isScene(unit,id)){
        switch(id){
          case SLEEP_MODE:
            event.directive.header.namespace = NAMESPACE_BRIGHTNESS_CONTROL;
            event.directive.header.name = NAME_SET_BRIGHTNESS;
            event.directive.payload["brightness"] = 5;
            break;
        }
				requestdNamespace = event.directive.header.namespace;
      }
    }
    //handle other things
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
};
//handle Discovery: This discovers the devices, groups, and unit spaces
var handleDiscovery = function(event,callback){
    header = createHeader(NAMESPACE_DISCOVERY,RESPONSE_DISCOVER,event.directive.header.correlationToken);
    payload = null;
  	endpoints = new Array;
    //unit space list view
    gwRequest(DISCOVERY_UNIT_SPACE,'GET',null,"uspace",null,makeResponse,callback);
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
    var body = {};
    var id = event.directive.endpoint.endpointId;
    var unit = event.directive.endpoint.cookie.unit;

    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_TURN_ON:
						body["onoff"] = "on";
            value = CONTEXT_VALUE_ON;
            var path = createControlPath(id,unit,false);
   	        gwRequest(path,'PUT',id,unit,body,makeResponse,callback);
            break;
        case NAME_TURN_OFF:
						body["onoff"] = "off";
            value = CONTEXT_VALUE_OFF;
            var path = createControlPath(id,unit,false);
   	        gwRequest(path,'PUT',id,unit,body,makeResponse,callback);
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
    var body = {};
    var id = event.directive.endpoint.endpointId;
    var unit = event.directive.endpoint.cookie.unit;

    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_SET_BRIGHTNESS:
            value = event.directive.payload.brightness;
            body["level"] = value;
            var path = createControlPath(id,unit,false);
            gwRequest(path,'PUT',id,unit,body,makeResponse,callback);
            break;
        case NAME_ADJUST_BRIGHTNESS:
            value = event.directive.payload.brightnessDelta;
            body["level"] = value;
            var path = createControlPath(id,unit,true);
            gwRequest(path,'GET',id,unit,body,makeResponse,callback);
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
    var body = {};
    var id = event.directive.endpoint.endpointId;
    var unit = event.directive.endpoint.cookie.unit;

    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_SET_COLOR:
            value = event.directive.payload.color;
            body["hue"] = value.hue | 0;
            body["saturation"] = Number(value.saturation) * 100 | 0;
            body["brightness"] = Number(value.brightness) * 100 | 0;
            if(checkHue(body.hue) || checkBrightnessAndSaturation(body.brightness) || checkBrightnessAndSaturation(body.saturation)){
              payload = {
                "type": "VALUE_OUT_OF_RANGE",
                "message":"Invalid color value",
                "validRange":{
                  "minumumValue": "H[0] S[0] B[0]",
                  "maximumValue": "H[360] S[100] B[100]"
                }
              }
              var response = createErrorResponse(header,endpoint,payload);
              callback(response);
            }
            var path = createControlPath(id,unit,false);
            gwRequest(path,'PUT',id,unit,body,makeResponse,callback);
            break;
        default:
            log("Error","Unsupported operation" + requestName);
            response = handleUnsupportedOperation();
            break;
    }
};
var checkHue = function(hue){
  if(hue < 0 || hue > 360)
    return true;
  else
    return false;
}
var checkBrightnessAndSaturation = function(bORs){
  if(bORs < 0 || bORs > 100)
    return true;
  else
    return false;
}
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
    var body = {};
    var id = event.directive.endpoint.endpointId;
    var unit = event.directive.endpoint.cookie.unit;
 
    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_DECREASE_COLOR_TEMPERATURE:
            value = -1000;
            body["colortemp"] = value;
            var path = createControlPath(id,unit,true);
            gwRequest(path,'GET',id,unit,body,makeResponse,callback);
            break;
        case NAME_INCREASE_COLOR_TEMPERATURE:
            value = 1000;
            body["colortemp"] = value;
            var path = createControlPath(id,unit,true);
            gwRequest(path,'GET',id,unit,body,makeResponse,callback);
            break;
        case NAME_SET_COLOR_TEMPERATURE:
            value = event.directive.payload.colorTemperatureInKelvin;
            body["colortemp"] = value;
            var path = createControlPath(id,unit,false);
            gwRequest(path,'PUT',id,unit,body,makeResponse,callback);
            break;
        default:
            log("Error","Unsupported operation" + requestName);
            response = handleUnsupportedOperation();
            break;
    }
};

/*var handleSleepMode = function(event,callback){
  var id = event.directive.endpoint.endpointId;
  var unit = event.directive.endpoint.cookie.unit;
  var path = createControlPath(id,unit,false);
  var body = {};
  body["colortemp"] = 3000;
  gwRequest(path,'PUT',id,unit,body,null,callback);
  body = {};
  body["brightness"] = 10;
  gwRequest(path,'PUT',id,unit,body,null,callback);
};*/

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

//for Discovery endpoints
var createEndpoints = function(r,id,unit,callback){
  var e = require('./responses_template/endpoints.json');

  for(var i=0; i < r.length; i++){
    var endpoint = JSON.parse(JSON.stringify(e));
    endpoint["endpointId"] = r[i][id];
    endpoint.cookie.unit = unit;
		if(unit == "device")
    	endpoint["friendlyName"] = "System Light " + r[i][id]; //device does not have its name, so I made it
		else{
      var name = unit + "_name";
			endpoint["friendlyName"] = r[i][name];
    }
    endpoints.push(endpoint);
  }

  if(unit =="uspace"){
    gwRequest(DISCOVERY_GROUP,'GET',null,"group",null,makeResponse,callback);
  }
  else if(unit == "group"){
    gwRequest(DISCOVERY_DEVICE,'GET',null,"device",null,makeResponse,callback);
  }
  else{
     payload = {
      "endpoints": endpoints
    };
    response = createDirective(header,payload);
    callback(response);
  }
}

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
var createErrorResponse = function(header,endpoint,payload){
  return{
    "event":{
      "header": header,
      "endpoint": endpoint,
      "payload": payload
    }
  };
};

var createControlPath = function(id,unit,isAdjust){
  var path = "/"+unit+"/"+id;
  if(!isAdjust){
    if(unit == "device")
      path = path + "/light";
    else
      path = path + "/status";
  }
  else{
    if(unit != "device")
      path = path + "/dstatus";
  }
  return path;
}

var isScene = function(unit,id){
  return (unit == "group") && (id == SLEEP_MODE);
};

var log = function(title,msg){
    console.log('****' + title + ': ' + JSON.stringify(msg));
};
