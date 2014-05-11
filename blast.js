window.onload = function() {
	var stage = new createjs.Stage("playground");
	var gameWidth = 400;
	var gameHeight = 400;
	var divisions = 16;

	var keyStates = {
		UP: false,
		DOWN: false,
		LEFT: false,
		RIGHT: false,
		SHOOT: false
	};
	var PI_180 = Math.PI/180.0;
	var INV_PI_180 = 180.0/Math.PI;

	var player = { shape: null, vel: {x: 0, y: 0}, acc: {x: 0, y: 0}, maxspeed: 200, radius: 10 };
	var enemies = [];
	var bullets = [];
	var background;
	var grid;
	var colHilite;

	var enemySpawner;
	var bulletSpawner;

	function init() {
		AudioGrid.init(divisions);

		background = new createjs.Shape();
		var bgGfx = background.graphics;
		bgGfx.setStrokeStyle(1).beginStroke("#505050");
		var dx = gameWidth / divisions;
		for (var i=0; i<=divisions; ++i) {
			var div = i*dx;
			bgGfx.moveTo(div, 0).lineTo(div, gameHeight);
			bgGfx.moveTo(0, div).lineTo(gameWidth, div);
		}
		stage.addChild(background);

		grid = [];
		for (var r=0; r<divisions; ++r) {
			var rowCells = [];
			for (var c=0; c<divisions; ++c) {
				var cell = new createjs.Shape();
				cell.graphics.beginFill("#607090")
					.rect(c*dx+4, r*dx+4, dx-8, dx-8);
				cell.visible = false;
				rowCells.push(cell);
				stage.addChild(cell);
			}
			grid.push(rowCells);
		}

		colHilite = new createjs.Shape();
		colHilite.graphics.beginFill("#f0ff33")
			.rect(2, 2, dx-4, divisions*dx-4);
		colHilite.alpha = 0.3;
		stage.addChild(colHilite);

		createEnemyPool(15);
		createBulletPool(100);

		enemySpawner = getSpawner(1.5, spawnEnemy);
		bulletSpawner = getSpawner(0.2, spawnBullet);

		player.shape = new createjs.Shape();
		player.shape.graphics.setStrokeStyle(1, "round")
			.beginStroke("#ffffff")
			.moveTo(-8, -10)
			.lineTo(0, 12)
			.lineTo(8, -10)
			.lineTo(-8, -10);
		player.shape.x = player.shape.y = 100;
		stage.addChild(player.shape);

		createjs.Ticker.setFPS(60);
		createjs.Ticker.addEventListener("tick", handleTick);
		window.onkeydown = keyEvent(true);
		window.onkeyup = keyEvent(false);
		window.onresize = resize;

		resize();

		AudioGrid.start();
	}

	function createEnemyPool(count) {
		for (; count>0; --count) {
			var enemy = { shape: null, vel: {x: 0, y: 0}, acc: {x: 0, y: 0}, maxspeed: 100, radius: 10 };
			enemy.shape = new createjs.Shape();
			enemy.shape.graphics.setStrokeStyle(1, "round")
				.beginStroke("#ef3030")
				.drawCircle(0, 0, enemy.radius);
			enemy.shape.visible = false;
			enemies.push(enemy);
			stage.addChild(enemy.shape);
		}
	}

	function createBulletPool(count) {
		for (; count>0; --count) {
			var bullet = { shape: null, vel: {x: 0, y: 0}, acc: {x: 0, y: 0}, maxspeed: 1000, radius: 2 };
			bullet.shape = new createjs.Shape();
			bullet.shape.graphics.setStrokeStyle(1, "round")
				.beginStroke("#cccccc")
				.drawCircle(0, 0, bullet.radius);
			bullet.shape.visible = false;
			bullets.push(bullet);
			stage.addChild(bullet.shape);
		}
	}

	function handleTick() {
		// Input handling
		var acc = 200;
		player.acc.y = 0;
		if (keyStates["UP"]) player.acc.y += -acc;
		if (keyStates["DOWN"]) player.acc.y += acc;

		player.acc.x = 0;
		if (keyStates["LEFT"]) player.acc.x += -acc;
		if (keyStates["RIGHT"]) player.acc.x += acc;

		// Game updates
		var elapsed = createjs.Ticker.getInterval() * 0.001;

		enemySpawner.update(elapsed);
		bulletSpawner.update(elapsed);

		updateMotion(player, elapsed);
		collideWithWalls(player, false);
		enemies.forEach(function(elt, i) { updateMotion(elt, elapsed); collideWithWalls(elt, true); });
		bullets.forEach(function(elt, i) { updateMotion(elt, elapsed); checkBulletCollisions(elt); });
		if (player.acc.y != 0 || player.acc.x != 0)
			player.shape.rotation = Math.atan2(player.acc.y, player.acc.x) * INV_PI_180 - 90;

		// Go through the audio grid and set up the visibility
		for (var r=0; r<divisions; ++r) {
			for (var c=0; c<divisions; ++c) {
				grid[r][c].visible = (AudioGrid.grid[r][c] > 0);
			}
		}
		AudioGrid.update(elapsed);
		// Highlight the current column
		colHilite.x = gameWidth/divisions * (AudioGrid.currCol>0 ? AudioGrid.currCol-1: divisions-1);

		stage.update();
	}

	function updateMotion(obj, elapsed) {
		if (!obj.shape.visible)
			return;

		if (obj.acc.x == 0)
			obj.vel.x *= 0.8;
		else
			obj.vel.x += obj.acc.x * elapsed;
		if (Math.abs(obj.vel.x) <= 0.0001)
			obj.vel.x = 0;

		if (obj.acc.y == 0)
			obj.vel.y *= 0.8;
		else
			obj.vel.y += obj.acc.y * elapsed;
		if (Math.abs(obj.vel.y) <= 0.0001)
			obj.vel.y = 0;

		clampMag(obj.vel, obj.maxspeed);

		obj.shape.x += obj.vel.x * elapsed;
		obj.shape.y += obj.vel.y * elapsed;
	}

	function collideWithWalls(obj, bounce) {
		if (obj.shape.visible) {
			var x = obj.shape.x;
			var y = obj.shape.y;
			var radius = obj.radius;
			if (x-radius <= 0 || x+radius >= gameWidth) {
				obj.shape.x += (x-radius <= 0) ? -(x-radius) : gameWidth-(x+radius);
				if (bounce) {
					obj.vel.x = -obj.vel.x;
					obj.acc.x = -obj.acc.x;
				}
			}
			if (y-radius <= 0 || y+radius >= gameHeight) {
				obj.shape.y += (y-radius <= 0) ? -(y-radius) : gameHeight-(y+radius);
				if (bounce) {
					obj.vel.y = -obj.vel.y;
					obj.acc.y = -obj.acc.y;
				}
			}
		}
	}

	function checkBulletCollisions(bullet) {
		if (bullet.shape.visible) {
			var x = bullet.shape.x;
			var y = bullet.shape.y;
			var radius = bullet.radius;

			if (x-radius <= 0 || x+radius >= gameWidth || y-radius <= 0 || y+radius >= gameHeight) {
				bullet.shape.visible = false;
				return;
			}

			var hitlist = enemies.filter(function(enemy, i) {
				var threshold = bullet.radius+enemy.radius;
				return enemy.shape.visible && (sqDist(bullet.shape, enemy.shape) < threshold*threshold);
			});
			if (hitlist.length > 0) {
				hitlist.forEach(killEnemy);
				bullet.shape.visible = false;
			}
		}
	}

	function getSpawner(interval, spawnFunc) {
		var spawner = {
			spawnInterval: interval, // number of seconds to wait before spawning
			spawnElapsed: 0.0,

			update: function(elapsed) {
				this.spawnElapsed += elapsed;
				if (this.spawnElapsed >= this.spawnInterval) {
					this.spawnFunc();
					this.spawnElapsed -= this.spawnInterval;
				}
			},

			spawnFunc: spawnFunc
		};
		return spawner;
	}

	// Spawns an enemy if there are free enemies available
	function spawnEnemy() {
		var freeEnemies = enemies.filter(freeFilter);
		if (freeEnemies.length == 0)
			return;

		var freeEnemy = freeEnemies[0];
		var closeToPlayer = true;
		while (closeToPlayer) {
			freeEnemy.shape.x = Math.random() * (gameWidth-30)+15;
			freeEnemy.shape.y = Math.random() * (gameHeight-30)+15;

			closeToPlayer = sqDist(freeEnemy.shape, player.shape) < 25*25;
		}

		freeEnemy.shape.visible = true;
		freeEnemy.vel.x = 0;
		freeEnemy.vel.y = 0;
		freeEnemy.acc.x = (Math.random()-0.5) * 20;
		freeEnemy.acc.y = (Math.random()-0.5) * 20;
	}

	// Spawns a bullet if there are free bullets available
	function spawnBullet() {
		if (!keyStates["SHOOT"])
			return;

		var freeBullets = bullets.filter(freeFilter);
		if (freeBullets.length == 0)
			return;

		var bullet = freeBullets[0];
		var rotation = player.shape.rotation + 90;
		var dir = { x: Math.cos(rotation*PI_180), y: Math.sin(rotation*PI_180) };
		bullet.shape.x = player.shape.x + 12*dir.x;
		bullet.shape.y = player.shape.y + 12*dir.y;

		bullet.shape.visible = true;
		bullet.vel.x = dir.x * 1000;
		bullet.vel.y = dir.y * 1000;
		bullet.acc.x = dir.x;
		bullet.acc.y = dir.y;
	}

	// Helper functions
	// Returns a keyUp/keyDown callback
	function keyEvent(isKeyDown) {
		var state = isKeyDown;

		var KEYCODE_UP = 38;
		var KEYCODE_DOWN = 40;
		var KEYCODE_LEFT = 37;
		var KEYCODE_RIGHT = 39;
		var KEYCODE_W = 87;
		var KEYCODE_S = 83;
		var KEYCODE_A = 65;
		var KEYCODE_D = 68;
		var KEYCODE_J = 74;

		return function(evt) {
			switch (evt.keyCode) {
				case KEYCODE_UP:
				case KEYCODE_W:
					keyStates["UP"] = state;
					break;
				case KEYCODE_DOWN:
				case KEYCODE_S:
					keyStates["DOWN"] = state;
					break;
				case KEYCODE_LEFT:
				case KEYCODE_A:
					keyStates["LEFT"] = state;
					break;
				case KEYCODE_RIGHT:
				case KEYCODE_D:
					keyStates["RIGHT"] = state;
					break;
				case KEYCODE_J:
					keyStates["SHOOT"] = state;
					break;
			}
		};
	}

	// Clamps the magnitude of a vector to a given maximum
	function clampMag(vec, maxmag) {
		var mag_sq = vec.x*vec.x + vec.y*vec.y;
		if (mag_sq > maxmag*maxmag) {
			var factor = maxmag / Math.sqrt(mag_sq);
			vec.x *= factor;
			vec.y *= factor;
		}
	}

	// Calculates squared distance between shapes
	function sqDist(shape1, shape2) {
		var dx = shape1.x - shape2.x;
		var dy = shape1.y - shape2.y;
		return dx*dx + dy*dy;
	}

	// Helper for getting free elements in a pool
	function freeFilter(elt, i) {
		return !elt.shape.visible;
	}

	function killEnemy(elt, i) {
		elt.shape.visible = false;
		var col = ~~(elt.shape.x / gameWidth * divisions);
		var row = ~~(elt.shape.y / gameHeight * divisions);
		AudioGrid.grid[row][col] = 1;
	}

	// Handles resizing of stage
	function resize() {
		var winWidth = window.innerWidth * 0.9;
		var winHeight = window.innerHeight * 0.9;

		var scale = Math.min(winWidth/gameWidth, winHeight/gameHeight);
		stage.scaleX = stage.scaleY = scale;

		stage.canvas.width = gameWidth * scale;
		stage.canvas.height = gameHeight * scale;
	}

	// Finally, start it all
	init();
};
