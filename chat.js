var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var people = {};
var rooms = {};
var numberOfRooms = 1
rooms[0] = {name: "main"}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
function doesRoomExist (roomName) {
	var exists = false;
	for (i = 0; numberOfRooms > i; i++) {
		if (rooms[i].name == roomName) {
			exists = true;
			return [exists, i];
		}
	}
	return [exists, -2];
}
io.on('connection', function(socket){
  socket.emit('initialize', people);
  socket.on('room', function(room, passcode, currentRoom) {
	var potentialRoom = doesRoomExist(room);
	var exists = potentialRoom[0];
	var index = potentialRoom[1];
	if (exists) {
		if (rooms[index].passcode == passcode) {
			socket.join(room);
			socket.emit('room join success', room);
		} else {
			socket.emit('chat message', "SYSTEM", "The password was incorrect");
		} 
	} else {
		socket.emit('chat message', "SYSTEM", "That room doesn't exist");
	}
  });
  socket.on('chat message', function(msg, currentRoom){
	if (currentRoom) {
		io.in(currentRoom).emit('chat message', people[socket.id], msg);
    }  
  });
  socket.on('local message', function(msg) {
	socket.emit('chat message', "SYSTEM", msg);
  });
  socket.on('disconnect', function(){
	socket.broadcast.emit('user disconnect', people[socket.id], people);
	delete people[socket.id];
  });
  socket.on('set nickname', function(nickname) {
	people[socket.id] = nickname;
	io.emit('user joined', people[socket.id], people);
  
  });
  socket.on('room creation', function(newRoom, newPassword, currentRoom) {
	var potentialRoom = doesRoomExist(newRoom);
	var exists = potentialRoom[0];
	var index = potentialRoom[1];
	if (exists) {
		socket.emit('chat message', "SYSTEM", "This room already exists");
	} else {
		// Room doesn't exist, create it
		numberOfRooms += 1;
		rooms[numberOfRooms - 1] = {
			name: newRoom,
			passcode: newPassword
		}
		// Leave old room, join created room
		socket.leave(currentRoom);
		console.log("leaving " + currentRoom);
		socket.join(newRoom);
		console.log("joining the " + newRoom);
		socket.emit('room join success', newRoom)
	}
  });
});
http.listen(3000, function(){
  console.log('listening on *:3000');
});