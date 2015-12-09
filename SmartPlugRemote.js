var tab = {"01":"On","00":"Off", "cmds": ["GetInfo I", "GetInfo W", "GetInfo V"]};

var action = exports.action = function(data, next){
    info('Plugin SmartPlugRemote is called ...', data);
    var cmdArray = Array.prototype.slice.call(tab.cmds, 0);

    if (cfgOk != true) return next({ 'tts':'Erreur de configuration' });
    if (data.cmd) cmdArray.unshift(data.cmd);

    query(cmdArray, function(callback){
        last = json;
        if(data.tts) data.tts = data.tts.replace('%', last[data.ask]).replace('.',',').replace('On','allumée').replace('Off','eteinte');
        next({ 'tts': data.tts });
    });
}

var last = '?';
exports.last = function() { return last; };

var cfgOk = Config.modules.SmartPlugRemote;
exports.init = function() {
    info('Plugin SmartPlugRemote is initializing ...');

    /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/.test(cfgOk.IP)==false || !cfgOk.Password || !cfgOk.User ?
        console.log ('\033[91m[ ERROR ]\033[0m SmartPlugRemote: Config error !') : cfgOk = true;

    action({}, function() {});
}

exports.dispose = function() { info( 'Plugin SmartPlugRemote is disposed ...' ); }

exports.ajax = function(req, res, next) { action({}, next); }

//  QUERY
var request = require('request');
var query = function(data, callback) {
    var url = 'http://' + Config.modules.SmartPlugRemote.User + ':' + Config.modules.SmartPlugRemote.Password + '@'
        + Config.modules.SmartPlugRemote.IP + '/goform/SystemCommand?command=' + data.shift();
    
    request({ 'uri' : url }, function ( err, response, body ){
        if (err || response.statusCode != 200) return callback({ 'tts': "L'action a échoué" });
        scrap(body);
        data.length ? query(data, callback) :callback('end');
    });
}

//  SCRAP
var json = { 'state':'x' };
var scrap = function(body) {
    if (body.match(/[^[\]]+(?=])/g)) json.state = tab[body.match(/[^[\]]+(?=])/g)];
    if (body.match(/01I00 (.*)/)) json.amp = +body.match(/01I00 (.*)/)[1];
    if (body.match(/01W00 (.*)/)) json.watt = +body.match(/01W00 (.*)/)[1]/100;
    if (body.match(/01V00 (.*)/)) json.volt = +body.match(/01V00 (.*)/)[1]/1000;
    if (body.match(/01E00 (.*)/)) json.volt = +body.match(/01E00 (.*)/)[1];
    json.watt > 0.07 || json.amp > 50 ? json.state = "On" : json.state = "Off";
}
