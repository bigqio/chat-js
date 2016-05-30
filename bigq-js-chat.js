//
// node.js sample app for BigQ
// 
// takes advantage of BigQ's websocket listener to emulate
// a TCP-based message queue
//
//
// dependencies:
//   ws       'npm install ws'       http://websockets.github.io/ws/
//   prompt   'npm install prompt'   
//


//
// future work/not implemented:
// - synchronous messages
// - channels
//


//
//
// global variables and requires
//
//
var WebSocket = require('ws');
var prompt = require('prompt');
var _endpoint;        // will contain the BigQ URL, i.e. ws://127.0.0.1:8001/
var _websocket;       // contains the websocket object itself
var _output;          // data read from the websocket
var _debug;           // specifies whether or not log messages are sent
var _email;           // specifies the email address of the user
var _password;        // specifies the password of the user
var _guid;            // specifies the GUID of the user
var _server_guid = '00000000-0000-0000-0000-000000000000';    // static GUID for the server
var _syncrequests;    // list of synchronous requests and their timestamps
var _connected;       // indicates whether or not the client is connected
var _logged_in;       // indicates whether or not login was successful


//
//
// initialization
//
//
function init(email, password, guid, hostname, port, debug) {
  if (!email) email = random_guid();
  _email = email;

  if (!guid) guid = email;
  _guid = guid;

  if (password) _password = password;

  if (!hostname) {
    log("no hostname supplied");
    return false;
  }

  if (!port) {
    log("init no port supplied");
    return false;
  }

  if (!(port === parseInt(port, 10))) {
    log("init port is not an integer");
    return false;
  }

  if (port <= 0) {
    log("init port must be greater than zero");
    return false;
  }

  if (typeof(debug) !== "boolean") {
    _debug = false;
  }
  else {
    _debug = debug;
  }

  _connected = false;
  _logged_in = false;
  _endpoint = "ws://" + hostname + ":" + port + "/";

  _websocket = new WebSocket(_endpoint);
  _websocket.onopen = function(evt) { on_open(evt) };
  _websocket.onclose = function(evt) { on_close(evt) };
  _websocket.onmessage = function(evt) { on_msg(evt) };
  _websocket.onerror = function(evt) { on_error(evt) };
  log('init configured websocket server: ' + _endpoint);
}

function close() {
  _websocket.close();
  _connected = false;
  _logged_in = false;
}

//
//
// websocket callback functions
//
//
function on_open(evt) {
  log("on_open connected to " + _endpoint);
  _connected = true;
  _logged_in = false;
  login();
}

function on_close(evt) {
  log("on_close websocket closed for " + _endpoint);
  _connected = false;
  _logged_in = false;
}

function on_msg(evt) {
  log("on_msg received message");
  msg_received(evt.data, null);
}

function on_error(evt) {
  log("on_error data: " + evt);
}

function ws_send(message) {
  log("ws_send sending message:");
  log(message);
  _websocket.send(message);
}

//
//
// client APIs
//
//
function login() {
  var login_msg = msg_tostring('Login', false, _server_guid, null, null);
  if (!login_msg) {
    log('login unable to build login message');
    return;
  }
  else {
    ws_send(login_msg);
    log('login message sent');
    return;
  }
}

//
//
// message builders and parsers
//
//
function msg_tostring(command, sync, recipientGuid, channelGuid, data) {
  if (typeof(sync) !== "boolean")
  {
    log("msg_tostring sync must be boolean");
    return;
  }

  if (!recipientGuid && !channelGuid) {
    log("msg_tostring null recipientGuid and channelGuid supplied, one must be supplied");
    return;
  }
  
  var ret = "";
  var newline = "\r\n";
  if (_email) ret += "Email: " + _email + newline;
  if (_password) ret += "Password: " + _password + newline;
  if (_guid) ret += "SenderGuid: " + _guid + newline;
  if (command) ret += "Command: " + command + newline;
  if (recipientGuid) ret += "RecipientGuid: " + recipientGuid + newline;
  if (channelGuid) ret += "ChannelGuid: " + channelGuid + newline;

  ret += "SyncRequest: " + sync + newline;
  ret += "MessageId: " + _email + newline;

  var data_len = 0;
  if (data) data_len = data.length;
  ret += "ContentLength: " + data_len + newline;
  ret += newline;   // end of headers

  ret += data;

  // log('msg_tostring returning message:');
  // log_raw(ret);
  return ret;
}

function stringmsg_toobj(data) {
  if (!data) {
    log('stringmsg_toobj null data');
    return null;
  }
  else {
    data = data.toString();
    var data_found = false;
    var newline = '\r\n';
    var curr_data = data;
    var ret = { };

    while (!data_found) {
      var newline_pos = curr_data.indexOf(newline);
      if (newline_pos == 0) {
        //
        // end of headers
        //
        headers_done = true;
        curr_data = curr_data.substring(2, curr_data.length);
        ret['Data'] = curr_data;
        data_found = true;
      }
      else {
        //
        // read until newline
        //
        var curr_line = curr_data.substring(0, newline_pos);
        curr_data = curr_data.substring(newline_pos + 2, curr_data.length);

        var header = curr_line.split(':');
        if (header.length != 2) continue;   // not a valid header line

        var key = header[0].trim();
        var val = header[1].trim();
        ret[key] = val;
      }
    }

    return ret;
  }
}

//
//
// messaging methods
//
//
function msg_received(data) {
  if (!data) {
    log('msg_received no data received');
  }
  else {
    data = data.toString();
    // log('-------------------------------------------------------------------------------');
    // log_raw(data);
    var msg = stringmsg_toobj(data);
    log('msg_received command ' + msg['Command'] + ' success ' + msg['Success']);

    if (msg['Command'] === 'Login') {
      //
      // login response
      //
      if (msg['Success'] === 'True') {
        log_force('');
        log_force('Login success received');
        _logged_in = true;
      }
      else {
        log_force('');
        log_force('Login failure received');
        _logged_in = false;
      }
    }
    else if (msg['Command'] === 'ListClients') {
      //
      // list clients response
      //
      if (msg['Success'] === 'True') {
        log('msg_received clients list received');
        if (msg['Data']) {
          var client_list = JSON.parse(msg['Data']);
          log('msg_received ' + client_list.length + ' client records received');
          log_force('');
          for (var i = 0; i < client_list.length; i++) {
            log_force(' ' + i + '  email ' + client_list[i]['Email'] + '  guid ' + client_list[i]['ClientGuid']);
          }
        } 
        else {
          log('msg_received no clients connected');
        } 
      }
    }
    else {
      log_force('Message received:');
      log_force('');
      log_force(msg);
      log_force('');
    }
  }
}

function send_privmsg_async(guid, data) {
  if (!guid) {
    log('send_privmsg_async null guid');
    return;
  }

  if (!data) {
    log('send_privmsg_async null data');
    return;
  }

  var msg = msg_tostring(null, false, guid, null, data);
  // log('send_privmsg_async sending message:');
  // log_raw(msg);
  ws_send(msg);
  log('send_privmsg_async sent message to ' + guid + ': ' + data);
  return;
}

//
//
// utility methods
//
//
function log(msg) {
  log_raw("bigq-sdk-node " + msg);
}

function log_force(msg) {
  console.log(msg);
}

function log_raw(msg) {
  //
  // can be used directly to log without prepending bigq-sdk-node
  // for instance, when dumping data to the console
  //
  if (_debug) console.log(msg);
}

function random_guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

//
//
// test
//
//
function menu() {
  log_force('');
  log_force('-------------------------------------------------------------------------------');
  log_force('Available commands:');
  log_force('q, then CTRL-C   exit the application');
  log_force('login            login to bigq');
  log_force('who              list all connected clients');
  log_force('whoami           show my GUID');
  log_force('/{guid} {msg}    send msg to guid (do not include braces)');
}

function process_commands() {
  var run_forever = true;
  prompt.start();
  log_force('');
  prompt.get(['command'], function (err, result) {
    if (err) {
      console.log('Error: ' + err); 
    }
    else {
      console.log('Received command: ' + result.command);
      var command = result.command.toString().trim();
      if (command.startsWith('/')) {
        //
        // message to user
        //
        command = command.substring(1, command.length);
        var space_pos = result.command.indexOf(' ');
        if (space_pos <= 0) {
          log_force('');
          log_force('Usage: /{guid} {msg}');
          log_force('       i.e.');
          log_force('       /joel howdy!');
        }
        else {
          var nick = command.substring(0, space_pos - 1);
          var data = command.substring(space_pos, command.length);
          log_force('');
          log_force('Sending message to ' + nick + ': ' + data);

          //
          // send the message
          //
          send_privmsg_async(nick, data);
        }
      }
      else {
        switch (result.command) {
          case 'who':
            //
            // list clients
            //
            var who_msg = msg_tostring('ListClients', false, _server_guid, null, null);
            ws_send(who_msg);
            break;

          case 'whoami':
            log_force('');
            log_force(_guid);
            break;

          case 'login':
            login();
            break;

          case 'q':
            run_forever = false;
            break;

          default:
            menu();
            break;
        }
      }
    }

    if (run_forever) process_commands();
  });
}

function test() {
  // (email, password, guid, hostname, port, debug)
  init(null, null, null, 'localhost', 8001, true);
  log('test successfully initialized');
  log('use the \'login\' command once the websocket is connected');
  process_commands();
}

test();
