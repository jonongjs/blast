window.onload = function() {
	var stage = new createjs.Stage("playground");
	var gameWidth = 400;
	var gameHeight = 400;
	var divisions = 16;

	var keyStates = {
		UP: false,
		DOWN: false,
		LEFT: false,
		RIGHT: false
	};
	var INV_PI_180 = 180.0/Math.PI;

	var player = { shape: null, vel: {x: 0, y: 0}, acc: {x: 0, y: 0}, maxspeed: 200, radius: 10 };
	var enemies = [];
	var bullets;
	var background;

	function init() {
		var i;

		background = new createjs.Shape();
		var bgGfx = background.graphics;
		bgGfx.setStrokeStyle(1).beginStroke("#505050");
		var dx = gameWidth / divisions;
		for (i=0; i<=divisions; ++i) {
			var div = i*dx;
			bgGfx.moveTo(div, 0).lineTo(div, gameHeight);
			bgGfx.moveTo(0, div).lineTo(gameWidth, div);
		}
		stage.addChild(background);

		createEnemyPool();

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
	}

	function createEnemyPool() {
		var count = 15;
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

		spawner.update(elapsed);

		updateMotion(player, elapsed);
		collideWithWalls(player, false);
		enemies.forEach(function(elt, i) { updateMotion(elt, elapsed); collideWithWalls(elt, true); });
		if (player.acc.y != 0 || player.acc.x != 0)
			player.shape.rotation = Math.atan2(player.acc.y, player.acc.x) * INV_PI_180 - 90;

		stage.update();
	}

	function updateMotion(obj, elapsed) {
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

	var spawner = {
		spawnInterval: 2.0, // number of seconds to wait before spawning
		spawnElapsed: 0.0,

		update: function(elapsed) {
			this.spawnElapsed += elapsed;
			if (this.spawnElapsed >= this.spawnInterval) {
				this.spawnEnemy();
				this.spawnElapsed -= this.spawnInterval;
			}
		},

		freeFilter: function(elt, i) {
			return !elt.shape.visible;
		},

		spawnEnemy: function() {
			var freeEnemies = enemies.filter(this.freeFilter);
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
	};

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
