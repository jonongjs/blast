AudioGrid = {
	clipDur: 0.3, // Clip duration in seconds
	grid: [],
	currCol: 0,

	init: function(divisions) {
		if (typeof AudioContext !== "undefined") {
			this.context = new AudioContext();
		} else if (typeof webkitAudioContext !== "undefined") {
			this.context = new webkitAudioContext();
		} else {
			throw new Error('AudioContext not supported.');
		}

		this.divisions = divisions;

		// Generate grid (row by column)
		for (var i=0; i<divisions; ++i) {
			var row = []
			for (var j=0; j<divisions; ++j) row[j] = 0;
			this.grid.push(row);
		}

		this.genPentatonic(this.divisions);
	},

	playNextColumn: function(time) {
		var col = this.currCol;
		var activeCells = [];
		for (var r=0; r<this.divisions; ++r) {
			if (this.grid[r][col] > 0)
				activeCells.push(r);
		}
		var gain = (activeCells.length > 0) ? 0.7/activeCells.length : 0.0;
		activeCells.forEach(function(elt, i) {
			this.pentatonicScale[elt].play(gain, time);
		}, this);

		this.currCol = (1 + this.currCol) % this.divisions;
	},

	start: function() {
		this.audioNextTime = this.context.currentTime;

		this.playNextColumn(this.audioNextTime);
		this.audioNextTime += this.clipDur;
	},

	update: function(elapsed) {
		var now = this.context.currentTime;
		if (this.audioNextTime-now <= 0.05) {
			this.playNextColumn(this.audioNextTime);
			this.audioNextTime += this.clipDur;
		}
	},

	// Internal variables/methods
	context: null,
	divisions: 16,
	pentatonicScale: [],
	audioNextTime: 0,

	genPentatonic: function(numNotes) {
		var notes = [ 0, 2, 4, 7, 9 ];
		var clipDur = this.clipDur;

		var freq, n;
		for (var i=0, octs=0; i<numNotes; ++i) {
			if (i > 0 && i % notes.length == 0) {
				++octs;
			}
			// Generate notes; n=0 ==> 220Hz or A3
			n = notes[i % notes.length] + octs*12;
			freq = Math.pow(2, n/12.0) * 220.0;

			var oscillator = this.context.createOscillator();
			oscillator.frequency.value = freq;
			var gainNode = this.context.createGainNode();
			gainNode.gain.value = 0.0;
			gainNode.connect(this.context.destination);
			oscillator.connect(gainNode);
			oscillator.noteOn(0);

			// Create an object with a 'play' function to play the note
			this.pentatonicScale.push({
				context: this.context,
				oscillator: oscillator,
				gainNode: gainNode,

				play: function(gain, time) {
					var gainNode = this.gainNode;
					gainNode.gain.linearRampToValueAtTime(0, time);
					gainNode.gain.linearRampToValueAtTime(gain, time+clipDur*0.1);
					gainNode.gain.linearRampToValueAtTime(0, time+clipDur);
				}
			});
		}
	}
};
