var express = require('express')
    , app = express()
    , http = require('http')
    , server = http.createServer(app)
    , io = require('socket.io').listen(server);

server.listen(13100);

app.use(express.static(__dirname + '/'));

function User (socketId, id, nome, room) {
  this.socketId = socketId;
  this.id = id;
  this.nome = nome;
  this.room = room;
  this.clone = function () {
  	return new User(this.socketId, this.id, this.nome, this.room);
  }
}

function Room (ID, mod, ora) {
  this.id = ID;
  this.moderador = mod;
  this.orador = ora;
}

var users = new Array();//array de todos os clientes mobile
var rooms = new Array();
var endRooms = new Array();


io.on('connection', function (socket) {

	socket.on('newConnect', function (data) {
		socket.join(data.reuniao);

		var newUser = new User(socket.id, data.user, data.nome, data.reuniao);

        users.push(newUser);
        console.log("NOVO USER: "+socket.id+ " ID: "+data.user);

		if(!existRoom(data.reuniao)  && notEndRoom(data.reuniao)){
			console.log("NOVO ROOM: "+data.reuniao);
			rooms.push(new Room(data.reuniao, data.user, data.user));
			socket.emit("MODERADOR");
			socket.emit("ORADOR");
		}else{
			if(isMod(data.user)){
				console.log("MOD: "+data.user);
				socket.emit("MODERADOR");
				socket.emit("ORADOR");
			}
		}
		if(notEndRoom(data.reuniao)){
			socket.broadcast.to(data.reuniao).emit("NEW_USER", {user:newUser});
			socket.emit("USERS", {users:getUsers(data.reuniao)});
		}else{
			socket.emit("END_ROOM");
		}
        
  });
	

	socket.on("END_ROOM", function (data) {
		console.log("END ROOM: "+data.room);
		io.to(data.room).emit("END_ROOM");
		removeRoom(data.room);
  	});
	
	socket.on("ETIQUETAS_CHANGE", function (data) {
  		socket.broadcast.to(data.room).emit("ETIQUETAS_CHANGE", {visible:data.visible});
  	});

  	socket.on("MODELO_CHANGE", function (data) {
  		socket.broadcast.to(data.room).emit("MODELO_CHANGE", {modelo:data.modelo});
  	});

	socket.on("MENSAGEM", function (data) {
  		io.to(data.room).emit("MENSAGEM_CHAT", {texto:data.texto, type:data.type});
  	});

  socket.on('moveObject', function (data) {
  	socket.broadcast.to(data.room).emit('onMove', {x:data.x, y:data.y, z:data.z});
  });

  socket.on('moveMouse', function (data) {
  		//console.log(data);
  	  socket.broadcast.to(data.room).emit('mouseOnMove', {mouse:data});  
  });

  socket.on("changeOrador", function(data){
	if(oradorChange(data.room, data.user)){
		var auxRoom = getRoom(data.room);
		var auxOra = getUser(auxRoom.orador);
		io.to(auxOra.socketId).emit("USER");
		io.to(data.socketid).emit("ORADOR");
		auxRoom.orador = data.user;
		console.log("MUDAR ORADOR ROOM: "+data.room);
	}  	
  });

  

  //disconnect de um cliente mobile/ecra
  socket.on('disconnect', function (data) {
     for (var i = 0; i < users.length; i++) {
         if(users[i].socketId == socket.id){
         	socket.broadcast.to(users[i].room).emit("DISCONNECT", {user:users[i].id});
         	socket.leave(users[i].room);
            users.splice(i, 1);
            console.log("USER DISCONNECT");
         }
     }
  });

});



function oradorChange (id, user) {
	for (var i = 0; i < rooms.length; i++) {
		if(rooms[i].id == id && rooms[i].orador != user ){
			return true;
		}
	}
	return undefined;
}

function existRoom (id) {
	for (var i = 0; i < rooms.length; i++) {
		if(rooms[i].id == id){
			return true;
		}
	}
	return undefined;
}

function isMod (id) {
	for (var i = 0; i < rooms.length; i++) {
		if(rooms[i].moderador == id){
			return true;
		}
	}
	return undefined;
}

function getUsers (id) {
	var aux = new Array();
	for (var i = 0; i < users.length; i++) {
		if(users[i].room == id){
			aux.push(users[i].clone());
		}
	}
	return aux;
}

function getRoom (id) {
	for (var i = 0; i < rooms.length; i++) {
		if(rooms[i].id == id){
			return rooms[i];
		}
	}
	return undefined;
}

function getUser (id) {
	for (var i = 0; i < users.length; i++) {
		if(users[i].id == id){
			return users[i];
		}
	}
	return undefined;
}

function removeRoom (id) {
	for (var i = 0; i < rooms.length; i++) {
		if(rooms[i].id == id){
			endRooms.push(id);
			rooms.splice(i, 1);
		}
	}
}

function notEndRoom (id) {
	for (var i = 0; i < endRooms.length; i++) {
		if(endRooms[i] == id){
			return false;
		}
	}
	return true;
}