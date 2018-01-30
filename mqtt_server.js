var mqtt = require('mqtt');
var url = "wss://b-8b6a530d-9792-461c-9b07-7103bebe99ec-1.mq.us-east-1.amazonaws.com:61619";
var option = {
    username : "mac",
    password : "9372153rlaA@"
};
var client  = mqtt.connect(url, option);
const t = "systemlight/request/daehwa";
const tt = "systemlight/response/daehwa"

var m = require('./index.js');
var callback = function(err,r){
  client.publish(tt,JSON.stringify(r));
}

client.on('connect',function(){
  client.subscribe(t);
})

client.on('message',function(topic,message){
  return handleRequest(message);
})

var handleRequest = function(message){
	m.handler(JSON.parse(message),"",callback);
}

