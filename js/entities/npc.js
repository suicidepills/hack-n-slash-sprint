define(
['jaws', 'DATABASE', 'entities/character', 'entities/item', 'lib/SAT', 'entities/effects/knockback', 'entities/effects/invulnerability'],
function (jaws, DATABASE, Character, Item, SAT, Knockback, Invulnerability) {

function NPC (options) {

	Character.call(this, options);

	this.options = $.extend( 
		{},
		// Default options, until we come up with a better way to define these.
		{
			state:	"idle"
		},
		options
	);
	
	
		// Field of Vision funsies
	this.fov = new SAT.Polygon(new SAT.Vector(this.x, this.y),
		[
		new SAT.Vector(16, 0),
		new SAT.Vector(32, 16),
		new SAT.Vector(64, 64),
		new SAT.Vector(64, 96),
		new SAT.Vector(48, 112),
		new SAT.Vector(16, 128),
		
		new SAT.Vector(-16, 128),
		new SAT.Vector(-48, 112),
		new SAT.Vector(-64, 96),
		new SAT.Vector(-64, 64),
		new SAT.Vector(-32, 16),
		new SAT.Vector(-16, 0)
		]);
	this.fov.translate(0, -8); // offset from the character a touch
	
	
	
	this.interests.push.apply(this.interests, [
		{name: 'sight', shape: this.fov}
	]);
	
	
	
	this.state = this.options.state;
	this.isDistracted = false;
	this.distractionRate = options.distractionRate;
	this.courseOfAction = {
		move: {angle: 0, magnitude: 0},
		attack: {}
	};
	
	if (this.options.patrol ) {
		this.patrol(this.options.patrol);
	}
	
	this.seekTarget = null;
}

NPC.prototype = Object.create(Character.prototype);

NPC.prototype.update = function () {
	Character.prototype.update.call(this);
	this.decideNextAction();
	this.seekTarget = null; // Forget seekTarget until next collision.
	
	// Update FOV angle to match bearing.
	this.fov.setAngle(-this.radianMap8D[this.bearing]);
};

NPC.prototype.draw = function () {
	// Call super.
	Character.prototype.draw.call(this);
	
	/* DEBUG: Draw FoV */
	var context = jaws.context,
		points  = this.fov.calcPoints,
		i, ilen;

	context.save();
	context.strokeStyle = "black";
	context.lineWidth = 3;

	context.beginPath();
	context.moveTo(
		this.fov.pos.x + points[0].x, 
		this.fov.pos.y + points[0].y
	);
	for(i=0, ilen=points.length; i<ilen; i++) {
		context.lineTo(
			this.fov.pos.x + points[i].x, 
			this.fov.pos.y + points[i].y
		);
	}
	context.lineTo(
		this.fov.pos.x + points[0].x,
		this.fov.pos.y + points[0].y
	);
	context.stroke();

	context.restore();
};

NPC.prototype.onCollision = function (collision) {

	// Call super.
	Character.prototype.onCollision.call(this, collision);

	// Temp variables while we transition to single 'collision' input object.
	var entity   = collision.target,
		interest = collision.interest;

	//console.log(this.name, ' collides with ', entity.name, ' because of ', interest.name);
	if (interest.name === this.currentPatrol && entity.patrolIndex === this.currentPatrolPointIndex) {
		this.incrementPatrolPoint();
	}
	
	if (interest.name === "sight" &&
		this.consider(entity) === "hostile" &&
		!this.seekTarget) {
		
		if (entity.resources && entity.resources.health === 0) {
			this.seekTarget = null;
			this.state = "patrol";
		}
		else {
			// Seek target
			this.state = "seek";
			this.seekTarget = entity;
		}
	}
	
	if (interest.name === "touch" &&
		this.consider(entity) === "hostile" &&
		this.resources.health > 0 &&
		!entity.invulnerable) {
		console.log("contact");
		// Debug: damage on contact.
		entity.damage({
			resource: "health",
			type: "physical",
			value: 1,
			penetration: 1
		});
		
		// Calculate angle to target entity.
		var p1 = {
			x: this.x,
			y: this.y
		};
		var p2 = entity;
	
		var analogX = p2.x - p1.x;
		var analogY = p2.y - p1.y;
		
		var angleToTarget = Math.atan2(analogX, analogY);
		
		// Apply knockback to target entity.
		entity.addEffect(new Knockback({
			// Target
			target: entity,
			// Angle
			angle: angleToTarget,
			// Force
			force: 8,
			// Duration
			duration: 10
		}));
		
		// Apply invulnerability to target entity.
		entity.addEffect(new Invulnerability({
			// Target
			target: entity
		}));
		
		if (entity.resources.health <= 0) {
			this.seekTarget = null;
			this.state = "patrol";
		}
		
	}
};

NPC.prototype.rollForDistraction = function(distractionRateMultiplier) {
	var calculatedDistractionRate = this.distractionRate;
	if (distractionRateMultiplier) { 
		calculatedDistractionRate = calculatedDistractionRate * distractionRateMultiplier;
	}
	if (Math.random() < calculatedDistractionRate) {
		this.isDistracted = true;
	}
	else {
		this.isDistracted = false;
	}
};

NPC.prototype.decideNextAction = function() {
	// Do nothing if dead.
	if (this.resources.health > 0 === false) return;
	
	// Do nothing.
	if (this.state === "idle") return;
	
	// Wander.
	if (this.state === "wander") {
		this.wander();
		return;
	}
	
	// Patrol.
	if (this.state === "patrol") {
		var targetPatrolPoint = this.getNextPatrolPoint();
		if (targetPatrolPoint) {
			this.seek(targetPatrolPoint);
		}
		else {
			this.wander();
		}
		return;
	}
	// Seek.
	if (this.state === "seek") {
		if(this.seekTarget !== null) {
			this.seek(this.seekTarget/*{x: this.seekTarget.x, y: this.seekTarget.y}*/);
		} else {
			this.wander();
		}
		return;
	}

	// This currently causes all character health to drop to 0 as soon as the
	// game starts.
	/*
	if (this.courseOfAction.attack) {
		this.attack(this.courseOfAction.attack);
	}
	*/
	
};

NPC.prototype.seek = function (destination) {
	// TODO: Allow NPCs to seek characters/locations besides the player.
	// Find angle to player.
	var p1 = {
		x: this.x,
		y: this.y
	};
	var p2 = destination;

	var analogX = p2.x - p1.x;
	var analogY = p2.y - p1.y;
	
	var angleToTarget = Math.atan2(analogX, analogY);
	
	this.courseOfAction.move = {
		angle: angleToTarget,
		magnitude: 0.8
	};
	
	
	var reach = 50;
	var startX = this.x;
	var startY = this.y;
	var endX = startX + reach * Math.sin(angleToTarget);
	var endY = startY + reach * Math.cos(angleToTarget);
	
	
	this.courseOfAction.attack = {
		reach : reach,
		startX: startX,
		startY: startY,
		endX  : endX,
		endY  : endY,
		angle : angleToTarget
	};

	this.steer(this.courseOfAction.move.angle,
					  this.courseOfAction.move.magnitude);
};

NPC.prototype.wander = function () {
	this.rollForDistraction(0.4);
	if (this.isDistracted) {
		// Decide how to move in the X-axis.
		var analogX = Math.round(Math.random()) ? Math.random() : Math.random() * -1;
		var analogY = Math.round(Math.random()) ? Math.random() : Math.random() * -1;
		
		this.courseOfAction.move.angle = Math.atan2(analogX, analogY);
		this.courseOfAction.move.magnitude = Math.sqrt(analogX*analogX+analogY*analogY);
	}
	if(this.courseOfAction.move) {
		this.move(this.courseOfAction.move.angle,
						  this.courseOfAction.move.magnitude);
	}
};

NPC.prototype.patrol = function (patrolName, patrolPointIndex) {
	if (this.currentPatrol) {
		var index = this.interests.indexOf(this.currentPatrol);
		if(index > -1) {
			this.signals.lostPresence.dispatch(this, this.interests[index]);
			this.interests.splice(index, 1);
		}
	}
	
	this.currentPatrol = patrolName;
	this.currentPatrolPointIndex = patrolPointIndex || 0;
	this.interests.push({name: this.currentPatrol, shape: new SAT.Circle(new SAT.Vector(this.x, this.y), this.radius)});
	this.signals.gainedPresence.dispatch(this, this.interests[this.interests.length-1]);
};

NPC.prototype.getNextPatrolPoint = function () {
	if (this.currentPatrol &&
		this._gameData.patrols[this.currentPatrol] &&
		this._gameData.patrols[this.currentPatrol][this.currentPatrolPointIndex]) {
		return this._gameData.patrols[this.currentPatrol][this.currentPatrolPointIndex];
	}
	
	return undefined;
};

NPC.prototype.incrementPatrolPoint = function () {
	if (this.currentPatrol &&
		this._gameData.patrols[this.currentPatrol]) {
		
		this.currentPatrolPointIndex = this.currentPatrolPointIndex < this._gameData.patrols[this.currentPatrol].length-1 ?
									   this.currentPatrolPointIndex+1 :
									   0;
		
	}
};

NPC.prototype.kill = function() {
	Character.prototype.kill.call(this);
	
	// Make some loot.
	var lootKey = DATABASE.lootTable["Basic Creature"].getRandom();
	var loot = new Item($.extend(true, {},
							 DATABASE.items["base"],
							 DATABASE.items[lootKey]));
	loot._gameData = this._gameData;
	// Put the loot in the game world
	this.signals.gave.dispatch(loot);
	loot.drop(this.x, this.y+20);
};

return NPC;

});