var fs = require('fs');
var http = require('http');
var url = require('url');
var ROOT_DIR = "./";
var portnum = require('./gate.json').sl.portnum;
http.createServer(function (req, res) {
  var urlObj = url.parse(req.url, true, false);
  fs.readFile(ROOT_DIR + urlObj.pathname + "/file.json", function (err,data) {
    if (err) {
      console.log("error:"+err);
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
}).listen(portnum);
