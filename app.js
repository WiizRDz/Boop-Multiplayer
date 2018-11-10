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

var round = 0;
var timer = 100;

var COLOURS = ["#EBEB87", "#E7B7FA"];

function INIT_VAL(w, charSize, charID) {
	if (charID % 2) {
		return {x: w - 1.5 * charSize, d: -1};
	}
	return {x: 1.5 * charSize, d: 1};
}

function nextRound() {
	for (var p in PLAYERS) {
		PLAYERS[p].resetPos();
		PLAYERS[p].att = !PLAYERS[p].att;
	}
	round++;
	timer = 100;
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
		this.yp = 0;
		this.yc = 0;
		this.jc = 0;

		this.att = att;
		this.beenBooped = false;
		this.boopVelo = 0;
		this.boopAmount = 20;
		this.boopD = INIT_VAL(w, this.s, charID).d;

		this.state = {l: false, r: false, u: false, d: false};
	}

	resetPos() {
		this.x = Math.round(INIT_VAL(this.w, this.s, this.id).x);
		this.y = this.fl - this.s / 2;
	}

	updateState(state) {
		if (state.l != undefined) { this.state.l = state.l; }
		if (state.r != undefined) { this.state.r = state.r; }
		if (state.u != undefined) {
			if (state.u && this.jc < 2) {
				this.yc = this.h / 135;
				this.jc++;
			}
			this.state.u = state.u;
		}
		if (state.d != undefined) { this.state.d = state.d; }
	}

	update() {
		var SPEED = 7;

		this.hitY();
		if (this.state.l && Math.abs(this.boopVelo) < 10) {
			this.x -= SPEED + !this.att * 2;
			if (this.yp == 0) {
				this.x -= 2;
			}
			this.hitX();
		}
		if (this.state.r && Math.abs(this.boopVelo) < 10) {
			this.x += SPEED + !this.att * 2;
			if (this.yp == 0) {
				this.x += 2;
			}
			this.hitX();
		}
		if (this.state.u) {
			this.jump();
			this.y = this.fl - this.s / 2 + this.yp;
			this.hitY();
		}
		if (this.state.d && !this.att) {
			this.boop();
		}
		if (this.beenBooped) {
			this.booped();
		}
		if (this.y < this.cl - this.s / 2) {
			this.y = this.cl - this.s / 2;
			this.yc = -1;
		}

		this.checkBounds();

		if (this.att) {
			this.checkWin();
		}
	}

	jump() {
		if (this.y == getOtherPlayer(this).y + getOtherPlayer(this).s && this.y == this.fl - this.s / 2) {
			this.state.u = false;
			return;
		}
		if (!this.state.u) {
			return;
		}
		this.yp -= this.yc;
		this.yc -= this.h / 5400;
		if (this.yp > 0) {
			this.yp = 0;
			this.yc = 0;
			this.state.u = false;
			this.jc = 0;
		}
	}

	boop() {
		var otherPlayer = getOtherPlayer(this);

		if (Math.abs(this.y - otherPlayer.y) < this.s + 20 && Math.abs(this.x - otherPlayer.x) < this.s + 10) {
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

	checkWin() {
		if (this.boopD == 1) {
			if (this.x > this.w - this.s / 2 - 3) {
				nextRound();
			}
		} else {
			if (this.x < this.s / 2 + 3) {
				nextRound();
			}
		}
	}

	hitX() {
		var otherPlayer = getOtherPlayer(this);

		if (Math.abs(this.y - otherPlayer.y) < this.s && Math.abs(this.x - otherPlayer.x) < this.s) {
			if (this.x > otherPlayer.x) {
				this.x = otherPlayer.x + this.s;
			} else {
				this.x = otherPlayer.x - this.s;
			}
		}
	}

	hitY() {
		var otherPlayer = getOtherPlayer(this);

		if (Math.abs(this.y - otherPlayer.y) < this.s && Math.abs(this.x - otherPlayer.x) < this.s) {
			if (this.y < otherPlayer.y) {
				this.y = otherPlayer.y - this.s;
				this.yc = 0;
				this.jc = 0;
				otherPlayer.yc = -1;
			}
		}
	}
}

function f(x) {
	if (x == 0) {
		return 0;
	}
	return .002 * x * x;
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

	socket.on('increaseRound', function() {
		round++;
		timer = 100;
	});

	socket.on('decreaseRound', function() {
		round--;
		timer = 100;
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
		var a = 1;
		for (var s in SOCKET_LIST) {
			PLAYERS[s] = new Player(s, mw, mh, a);
			a = (a + 1) % 2;
		}
		for (var s in SOCKET_LIST) {
			SOCKET_LIST[s].emit('CONFIGURE_CANVAS', {w: mw, h: mh});
		}
		round = 0;
	}

	var data = {};
	for (var p in PLAYERS) {
		PLAYERS[p].update();
		data[PLAYERS[p].id] = {x: PLAYERS[p].x, y: PLAYERS[p].y, c: PLAYERS[p].c, s: PLAYERS[p].s,
							   fl: PLAYERS[p].fl, cl: PLAYERS[p].cl, d: PLAYERS[p].boopD, a: PLAYERS[p].att,
							   t: timer, r: round};
	}

	for (var s in SOCKET_LIST) {
		SOCKET_LIST[s].emit('DATA', data);
	}

	timer -= f(round);
}, 1000 / 60);