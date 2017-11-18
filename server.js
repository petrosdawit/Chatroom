var http = require('http');
var express = require('express')

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var path = require('path');
var fs = require('fs');

var anyDB = require('any-db');
var conn = anyDB.createConnection('sqlite3://chatroom.db');

var bodyParser = require('body-parser');

var engines = require('consolidate');

var Readable = require('stream').Readable;
var stream = new Readable;

app.engine('html', engines.hogan); 
app.set('views', __dirname + '/templates'); 
app.set('view engine', 'html');  

conn.query("CREATE TABLE IF NOT EXISTS messages " + 
		  "(id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, nickname TEXT, body TEXT, time INTEGER);");

conn.query("CREATE TABLE IF NOT EXISTS rooms " + 
		  "(id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT);");

var chatroomIds = {}

var q = conn.query('SELECT room from rooms;', function(error, data){
	inputIds(error, data);
});

function inputIds(err, res){
	n = res.rows.length
	i = 0
	while (i < n){
		chatroomIds[res.rows[i]['room']] = true;
		i++;
	}
}

io.on('connection', function(socket){

	socket.on('join', function(msg){
		socket.join(msg.roomName);
		socket.roomName = msg.roomName;
		socket.nickname = msg.nickname;

		var sql = 'SELECT nickname, body, time FROM messages WHERE room=$1 ORDER BY time ASC;';
		var q2 = conn.query(sql, [msg.roomName], function(err, data){
			io.sockets.in(msg.roomName).emit('messages', data.rows);
		});
		broadcastMembers(msg.roomName);


	});

  	socket.on('chat message', function(msg){
  		var nickname = msg.nickname;
  		var message = msg.message;
  		var roomName = msg.roomName;
  		var time = (new Date()).getTime();		

  		var q = conn.query('INSERT INTO messages (room, nickname, body, time) VALUES ($1, $2, $3, $4)', 
  			[roomName, nickname, message, time], function(err, result){ return result; });	
		
		var sql = 'SELECT nickname, body, time FROM messages WHERE room=$1 ORDER BY time ASC;';
		var q2 = conn.query(sql, [roomName], function(err, data){
			var messages = data.rows;
			io.sockets.in(roomName).emit('messages', data.rows);
		});
  	});

  	socket.on('changeNick', function(msg){
  		socket.nickname = msg.nickname;
		broadcastMembers(msg.roomName);
  	});

  	socket.on('disconnect', function() {
  		socket.leave(socket.roomName)
  		broadcastMembers(socket.roomName);
  	})

    socket.on('error', function(){
    	socket.leave(socket.roomName)
    	console.error(new Error("Looks like we have an error, try reloading the home page!"));
    });

});

function broadcastMembers(roomName){
	if (io.sockets.adapter.rooms[roomName] != null){
		sockets = io.sockets.adapter.rooms[roomName].sockets;
		var nicknames = []
		for (var key in sockets){
			var nickname = io.sockets.connected[key].nickname;
			nicknames.push(nickname);
		}
		io.sockets.in(roomName).emit('membership', {nicknames: nicknames});
	}
}

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.use('/css', express.static(__dirname +'/assets'));

app.post('/createRoom', function(req, res){
	var roomName = generateRoomIdentifier();
	while (roomName in chatroomIds){
		roomName = generateRoomIdentifier();
	}
	chatroomIds[roomName] = true;
	console.log(roomName); 
	conn.query('INSERT INTO rooms (room) VALUES ($1)', [roomName]);
	var url = req.protocol + '://' + req.get('host') + '/' + roomName;
	res.redirect(url);

});

app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/index.html'));
});

app.get(/^(.+)$/, function(req, res){
	console.log(req.params);
	try {
		if (req.params[0].substring(1) in chatroomIds) {
  			res.render('chatroom.html', {roomName: req.params[0].substring(1)});
		} else {
			res.sendFile(path.join(__dirname+'/404.html'));				
		}
	} catch(err) {
		res.sendFile(path.join(__dirname+'/404.html'));
	}
});

function generateRoomIdentifier() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  var result = '';
  for (var i = 0; i < 6; i++)
    result += chars.charAt(Math.floor(Math.random() * chars.length));

  return result;
}

server.listen(8000);


console.log("Running at Port 8000");