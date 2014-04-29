window.onload = function() {
	var stage = new createjs.Stage("playground");

	var keyStates = {
		UP: false,
		DOWN: false,
		LEFT: false,
		RIGHT: false
	};
	var INV_PI_180 = 180.0/Math.PI;

	var player = { shape: null, vel: {x: 0, y: 0}, acc: {x: 0, y: 0}, maxspeed: 200 };
	var enemies;
	var bullets;
	var background;

	function init() {
		var i;
		var divisions = 16;

		background = new createjs.Shape();
		var bgGfx = background.graphics;
		bgGfx.setStrokeStyle(1).beginStroke("#505050");
		var dx = stage.canvas.width / divisions;
		for (i=0; i<=divisions; ++i) {
			var div = i*dx;
			bgGfx.moveTo(div, 0).lineTo(div, stage.canvas.height);
			bgGfx.moveTo(0, div).lineTo(stage.canvas.width, div);
		}
		stage.addChild(background);

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

		updateMotion(player, elapsed);
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

	// Finally, start it all
	init();
};
