//namespaces
const NAMESPACE_DISCOVERY = "Alexa.Discovery";
const NAMESPACE_POWER_CONTROL = "Alexa.PowerController";
const NAMESPACE_POWER_LEVEL_CONTROL = "Alexa.PowerLevelController";
const NAMESPACE_BRIGHTNESS_CONTROL = "Alexa.BrightnessController";
const NAMESPACE_COLOR_CONTROL = "Alexa.ColorController";
const NAMESPACE_COLOR_TEMPERATURE_CONTROL = "Alexa.ColorTemperatureController";

//event
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
  };
  console.log("request (AWS Lambda -> gateway):\r\n"+JSON.stringify(options)+"\r\n");
  http.request(options,function(response){
    handleResponse(response);
  }).end();
};


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
            case NAMESPACE_POWER_CONTROL:
                response = handlePowerControl(event);
                break;
            case NAMESPACE_POWER_LEVEL_CONTROL:
                response = handlePowerLevelControl(event);
                break;
            case NAMESPACE_BRIGHTNESS_CONTROL:
                response = handleBrightnessControl(event);
                break;
            case NAMESPACE_COLOR_CONTROL:
                response = handleColorControl(event);
                break;
            case NAMESPACE_COLOR_TEMPERATURE_CONTROL:
                response = handleColorTemperatureControl(event);
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
};
//handle Discovery 
var handleDiscovery = function(event){
    var header = createHeader(NAMESPACE_DISCOVERY,RESPONSE_DISCOVER,event.directive.header.correlationToken);
    var payload = require('./discovery_payload.json');
    //gwGETRequest(DISCOVERY_LIGHT_PATH);
    return createDirective(header,payload);
};

//handle Control
var handlePowerControl = function(event){
    var response = null;
    
    var context = null;
    var header = createHeader(RESPONSE,NAME_RESPONSE,event.directive.header.correlationToken);
    var endpoint = createEndpoint(event);
    var payload = {};
    
    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_TURN_ON:
            context = createContext(NAMESPACE_POWER_CONTROL,RESPONSE_POWER,CONTEXT_VALUE_ON);
            response = createDirective2(context,header,endpoint,payload);
            break;
        case NAME_TURN_OFF:
            context = createContext(NAMESPACE_POWER_CONTROL,RESPONSE_POWER,CONTEXT_VALUE_OFF);
            response = createDirective2(context,header,endpoint,payload);
            break;
        default:
            log("Error","Unsupported operation" + requestName);
            response = handleUnsupportedOperation();
            break;
    }
    return response;
};

//handle PowerLevelControl
var handlePowerLevelControl = function(event){
    var response = null;
    
    var value =null, context = null;
    var header = createHeader(RESPONSE,NAME_RESPONSE,event.directive.header.correlationToken);
    var endpoint = createEndpoint(event);
    var payload = {};
    
    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_SET_POWER_LEVEL :
            value = event.directive.payload.powerLevel;
            context = createContext(NAMESPACE_POWER_LEVEL_CONTROL,RESPONSE_POWER_LEVEL,value);
            response = createDirective2(context,header,endpoint,payload);
            break;
        case NAME_ADJUST_POWER_LEVEL:
            value = event.directive.payload.powerLevelDelta;
            context = createContext(NAMESPACE_POWER_LEVEL_CONTROL,RESPONSE_POWER_LEVEL,value); // note! may need to modify value: not the delta value, absolute value
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
var handleBrightnessControl = function(event){
    var response = null;
    
    var value =null, context = null;
    var header = createHeader(RESPONSE,NAME_RESPONSE,event.directive.header.correlationToken);
    var endpoint = createEndpoint(event);
    var payload = {};
    
    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_SET_BRIGHTNESS:
            value = event.directive.payload.brightness;
            context = createContext(NAMESPACE_BRIGHTNESS_CONTROL,RESPONSE_BRIGHTNESS,value);
            response = createDirective2(context,header,endpoint,payload);
            break;
        case NAME_ADJUST_BRIGHTNESS:
            value = event.directive.payload.brightnessDelta;
            context = createContext(NAMESPACE_BRIGHTNESS_CONTROL,RESPONSE_BRIGHTNESS,value); // note! may need to modify value: not the delta value, absolute value
            response = createDirective2(context,header,endpoint,payload);
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
    return response;
};

//color
var handleColorControl = function(event){
    var response = null;
    
    var value =null, context = null;
    var header = createHeader(RESPONSE,NAME_RESPONSE,event.directive.header.correlationToken);
    var endpoint = createEndpoint(event);
    var payload = {};
    
    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_SET_COLOR:
            value = event.directive.payload.color;
            context = createContext(NAMESPACE_COLOR_CONTROL,RESPONSE_COLOR,value);
            response = createDirective2(context,header,endpoint,payload);
            break;
        default:
            log("Error","Unsupported operation" + requestName);
            response = handleUnsupportedOperation();
            break;
    }
    return response;
};

//Color Temperature
var handleColorTemperatureControl = function(event){
    var response = null;
    
    var value =null, context = null;
    var header = createHeader(RESPONSE,NAME_RESPONSE,event.directive.header.correlationToken);
    var endpoint = createEndpoint(event);
    var payload = {};
    
    var requestName = event.directive.header.name;
    switch(requestName){
        case NAME_DECREASE_COLOR_TEMPERATURE:
            value = 1000;
            context = createContext(NAMESPACE_COLOR_TEMPERATURE_CONTROL,RESPONSE_COLOR_TEMPERATURE,value); // note! may need to modify value: not the delta value, absolute value
            response = createDirective2(context,header,endpoint,payload);
            break;
        case NAME_INCREASE_COLOR_TEMPERATURE:
            value = 1000;
            context = createContext(NAMESPACE_COLOR_TEMPERATURE_CONTROL,RESPONSE_COLOR_TEMPERATURE,value); // note! may need to modify value: not the delta value, absolute value
            response = createDirective2(context,header,endpoint,payload);
            break;
        case NAME_SET_COLOR_TEMPERATURE:
            value = event.directive.payload.colorTemperatureInKelvin;
            context = createContext(NAMESPACE_COLOR_TEMPERATURE_CONTROL,RESPONSE_COLOR_TEMPERATURE,value);
            response = createDirective2(context,header,endpoint,payload);
            break;
        default:
            log("Error","Unsupported operation" + requestName);
            response = handleUnsupportedOperation();
            break;
    }
    return response;
}
/*var handlePowerControlTurnOn = function(event){
    var context = createContext(NAMESPACE_POWER_CONTROL,RESPONSE_POWER,CONTEXT_VALUE_ON);
    var header = createHeader(RESPONSE,NAME_RESPONSE);
    var endpoint = createEndpoint(event);
    var payload = {};
    return createPowerDirective(context,header,endpoint,payload);
};
var handlePowerControlTurnOff = function(event){
    var context = createContext(NAMESPACE_POWER_CONTROL,RESPONSE_POWER,CONTEXT_VALUE_OFF);
    var header = createHeader(RESPONSE,NAME_RESPONSE);
    var endpoint = createEndpoint(event);
    var payload = {};
    return createPowerDirective(context,header,endpoint,payload);
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
