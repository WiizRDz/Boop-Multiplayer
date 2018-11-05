// Setup packages and server
var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

serv.listen(2000);

serv.timeout = 0;

console.log('server started');

var io = require('socket.io')(serv, {});

// Game code

var COLOURS = ["#EBEB87", "#E7B7FA"];

function INIT_VAL(w, charSize, charID) {
	if (charID % 2) {
		return {x: w - 1.5 * charSize, d: -1};
	}
	return {x: 1.5 * charSize, d: 1};
}

class Player {
	constructor(charID, w, h, att) {
		this.id = charID;
		this.w = w;
		this.h = h;
		this.s = Math.round(h / 15);
		this.fl = this.h / 1.8;
		this.cl = this.h / 2 * .3;

		this.c = COLOURS[charID % 2];
		this.x = Math.round(INIT_VAL(w, this.s, charID).x);
		this.y = this.fl - this.s / 2;

		this.att = att;
		this.beenBooped = false;
		this.boopVelo = 0;
		this.boopAmount = 20;
		this.boopD = INIT_VAL(w, this.s, charID).d;

		this.state = {l: false, r: false, u: false, d: false};
	}

	resetPos() {
		this.x = INIT_VAL(this.w, this.charSize, this.id).x;
		this.y = this.h / 2;
	}

	updateState(state) {
		if (state.l != undefined) { this.state.l = state.l; }
		if (state.r != undefined) { this.state.r = state.r; }
		if (state.u != undefined) { this.state.u = state.u; }
		if (state.d != undefined) { this.state.d = state.d; }
	}

	update() {
		var SPEED = 5;
		if (this.state.l) {
			this.x -= SPEED;
		}
		if (this.state.r) {
			this.x += SPEED;
		}
		if (this.state.u) {
			this.y -= SPEED;
		}
		if (this.state.d) {
			this.y += SPEED;
		}
		if (this.state.d && this.att) {
			this.boop();
		}
		if (this.beenBooped) {
			this.booped();
		}

		this.checkBounds();
	}

	boop() {
		var otherPlayer = getOtherPlayer(this);

		if (Math.abs(this.y - otherPlayer.y) < 70 && Math.abs(this.x - otherPlayer.x) < 55) {
			otherPlayer.booped(this.boopD * this.boopAmount);
		}
	}

	booped(xv = this.boopVelo) {
		this.beenBooped = true;
		if (Math.abs(xv) > .5) {
			this.x += xv;
		} else {
			this.beenBooped = false;
			this.boopVelo = 0;
		}
		if (xv < 0) { xv += .5; } else { xv -= .5 };
		this.boopVelo = xv;
	}

	checkBounds() {
		if (this.x < this.s / 2) {
			this.x = this.s / 2;
		} else if (this.x > this.w - this.s / 2) {
			this.x = this.w - this.s / 2;
		}

		if (this.y < this.cl + this.s / 2) {
			this.y = this.cl + this.s / 2;
		} else if (this.y > this.fl - this.s / 2) {
			this.y = this.fl - this.s / 2;
		}
	}
}

// Server-Client interaction
var currID = 0;

var SOCKET_LIST = {};
var PLAYERS = {};

io.sockets.on('connection', function(socket) {
	if (Object.keys(SOCKET_LIST).length >= 2) { return; }

	socket.id = currID++;

	SOCKET_LIST[socket.id] = socket;

	socket.on('init', function(data) {
		socket.w = data.w;
		socket.h = data.h;
		socket.emit('init', socket.id);
	});

	socket.on('updateState', function(data) {
		if (PLAYERS[socket.id] == undefined) { return; }
		PLAYERS[socket.id].updateState(data);
	});


	socket.on('disconnect', function() {
		delete SOCKET_LIST[socket.id];
		delete PLAYERS[socket.id];
		currID = socket.id;
	});
});

var mw = -1;
var mh = -1;

function setScreens() {
	mw = -1;
	mh = -1;

	for (var s in SOCKET_LIST) {
		if ((SOCKET_LIST[s].w < mw || mw == -1) && SOCKET_LIST[s].w != undefined) {
			mw = SOCKET_LIST[s].w;
		}
		if ((SOCKET_LIST[s].h < mh || mh == -1) && SOCKET_LIST[s].h != undefined) {
			mh = SOCKET_LIST[s].h;
		}
	}
}

function getOtherPlayer(player) {
	for (var p in PLAYERS) {
		if (PLAYERS[p] != player) {
			return PLAYERS[p];
		}
	}
}

setInterval(function() {
	if (Object.keys(SOCKET_LIST).length < 2) {
		for (var s in SOCKET_LIST) {
			SOCKET_LIST[s].emit('LOADING', Object.keys(SOCKET_LIST).length);
		}
		PLAYERS = {};
		return;
	}

	if (Object.keys(PLAYERS).length == 0) {
		setScreens();
		var a = true;
		for (var s in SOCKET_LIST) {
			PLAYERS[s] = new Player(s, mw, mh, a);
			a = !a;
		}
		for (var s in SOCKET_LIST) {
			SOCKET_LIST[s].emit('CONFIGURE_CANVAS', {w: mw, h: mh});
		}

	}

	var data = {};
	for (var p in PLAYERS) {
		PLAYERS[p].update();
		data[PLAYERS[p].id] = {x: PLAYERS[p].x, y: PLAYERS[p].y, c: PLAYERS[p].c, s: PLAYERS[p].s, fl: PLAYERS[p].fl, cl: PLAYERS[p].cl};
	}

	for (var s in SOCKET_LIST) {
		SOCKET_LIST[s].emit('DATA', data);
	}
}, 1000 / 60);