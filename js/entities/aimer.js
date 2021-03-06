define(
['jaws', 'DATABASE', 'entities/entity', 'lib/SAT', 'entities/effects/knockback', 'entities/effects/invulnerability'],
function (jaws, DATABASE, Entity, SAT, Knockback, Invulnerability) {

function Aimer (options) {
	// Merge options
	this.options = $.extend({
						width: 80,
						height: 80,
						scale: 1,
						anchor: [0.5, 0.5],
						radius: 10,
						x: options.attacker.x,
						y: options.attacker.y
					}, options);

	// Call super-class.
	Entity.call(this, this.options);
	
	this.onFinish   = this.options.onFinish;
	
	this.hitBox = new SAT.Circle(new SAT.Vector(this.x, this.y), this.options.radius);
	
	this.interests.push.apply(this.interests, [
		{name: 'touch', shape: this.hitBox}
	]);
	
	// State
	this.speed             = 5;
	this.magnitude         = 0;
	this.activated         = false;
	
	this.target            = null;
	this.timeLocked        = 0;
	this.timeToUnlock      = 10;
	this.magnitudeToUnlock = 0.9;
	this.lockMagnitude     = 0.2;
	
	this.lastLocked        = null;
	this.timeSinceLocked   = 0;
	this.timeBeforeRelock  = 15;
	
	// DEBUG
	this.hookshotDuration     = 30;
	this.hookshotSpeed        = 12;
	this.maxRange     = this.hookshotDuration * this.hookshotSpeed;
	
	// These options will not be able to be set if this constructor is being
	// called as a means to extend it.
	if(this.options){
		this.attacker = this.options.attacker;
		this.angle    = this.options.angle;
	}
}

Aimer.prototype = Object.create(Entity.prototype);

Aimer.prototype.onCollision = function (collision) {
	// TODO: Clean-up these ad-hoc variables.
	var entity   = collision.target,
		interest = collision.interest;
	// TODO: React to different properties based on this.attacker's interests
	// Debug: hardcoded use of entity.hookable for Hookshot aiming.
	if (interest.name === "touch") {
		if (entity.hookable &&
			entity != this.attacker &&
			!this.target ) {
			if (entity != this.lastLocked || this.timeSinceLocked >= this.timeBeforeRelock || this.magnitude === 0) {
				// Lock on!
				this.lockOnTo(entity);
			}
			
			// Reset timeSinceLocked
			this.timeSinceLocked = 0;
		}
	}
};

Aimer.prototype.update = function () {
	if (this.activated) {
		this.angle = Math.atan2(this.attacker.x - this.x, this.attacker.y - this.y)+Math.PI;
		
		if (this.target) {
			// We're locked, but we're pushing hard enough to get unlocked.
			if (this.magnitude > this.magnitudeToUnlock) {
				// We aren't timelocked.
				if (this.timeLocked > this.timeToUnlock) {
					this.unlock();
				}
				// We are timelocked.
				else {
					// Increment timelock, since magnitude was strong enough to break the lock.
					this.timeLocked++;
					
					// Ease position to locked target.
					var angleToTarget = Math.atan2(this.target.x - this.x, this.target.y - this.y);
					this.move(angleToTarget, this.lockMagnitude);
				
					// Reset timeSinceLocked
					this.timeSinceLocked = 0;
				}
			}
			else {
				// Reset position to locked target.
				this.x = this.target.x;
				this.y = this.target.y;
				
				// Reset timeSinceLocked
				this.timeSinceLocked = 0;
			}
		}
		
		if (this.timeSinceLocked < this.timeBeforeRelock || this.magnitude < this.magnitudeToUnlock) {
			this.timeSinceLocked++;
		}
	}
};

Aimer.prototype.lockOnTo = function (entity) {
	this.timeSinceLocked = 0;
	this.target = entity;
	this.timeLocked = 0;
};

Aimer.prototype.unlock = function () {
	// Clear this.target, since we broke the lock!
	this.lastLocked = this.target;
	this.target = null;
};

Aimer.prototype.angleTo = function () {
	return this.angle;
};

// TODO: Don't reinvent the wheel, dummy...
Aimer.prototype.move = function (angle, magnitude) {
	var x = Math.sin(angle) * this.speed * magnitude;
	var y = Math.cos(angle) * this.speed * magnitude;
	
	// Update magnitude for book keeping.
	this.magnitude = magnitude;
	
	if (x !== 0 || y !== 0) {
		this.activated = true;
		// Apply movement.
		this.x += x;
		this.y += y;
		
		// DEBUG: Hacked this in to make Aimer react to hardcoded max range.
		// TODO: Standardize the way aimable objects expose their max range and other properties to Aimer.
		var distancePoints = function ( xA, yA, xB, yB ){
			var xDistance = Math.abs( xA - xB );
			var yDistance = Math.abs( yA - yB );
		   
			return Math.sqrt( Math.pow( xDistance, 2 ) + Math.pow( yDistance, 2 ) );
		};
		var distanceBetween = distancePoints(
			this.attacker.x,
			this.attacker.y,
			this.x,
			this.y
		);
		
		// Undo movement if we've overextended our reach.
		if (distanceBetween > this.maxRange) {
			var newAngleToAttacker = Math.atan2(this.attacker.x - this.x, this.attacker.y - this.y);
			this.move(newAngleToAttacker, 1);
		}
	}
};

Aimer.prototype.draw = function () {
	/* DEBUG */
	// Only draw if coordinates are different from the attacker's.
	if (this.activated) {
		var context = jaws.context;
	
		context.save();
		
		context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
		context.fillStyle = 'rgba(255, 255, 255, 0.2)';
		context.lineWidth = 3;
		
		// Draw outer max range circle.
		context.beginPath();
		context.arc(this.attacker.x, this.attacker.y, this.maxRange+this.radius, 0, 2 * Math.PI, false);
		context.fill();
		context.stroke();
		
		// Draw line from attacker, through this Aimer instance, to the max range.
		var maxX = this.attacker.x + (Math.sin(this.angle) * (this.maxRange + this.radius));
		var maxY = this.attacker.y + (Math.cos(this.angle) * (this.maxRange + this.radius));
		context.beginPath();
		context.moveTo(this.attacker.x, this.attacker.y);
		context.lineTo(maxX, maxY);
		context.stroke();
		context.closePath();
		
		// Draw inner collision circle.
		context.beginPath();
		context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
		context.fill();
		context.stroke();
	
		context.restore();
	}
};

return Aimer;

});
