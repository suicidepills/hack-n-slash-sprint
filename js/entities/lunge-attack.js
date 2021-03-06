define(
['jaws', 'DATABASE', 'entities/entity', 'lib/SAT', 'entities/effects/knockback', 'entities/effects/invulnerability'],
function (jaws, DATABASE, Entity, SAT, Knockback, Invulnerability) {

function LungeAttack (options) {
	// Merge options
	this.options = $.extend({
						width: 80,
						height: 80,
						scale: 1,
						anchor: [0.5, 0.5],
						radius: 1,
						x: options.attacker.x,
						y: options.attacker.y
					}, options);

	// Call super-class.
	Entity.call(this, this.options);
	
	this.onFinish   = this.options.onFinish;
	
	this.hitBox = new SAT.Circle(new SAT.Vector(this.x, this.y), this.options.radius);
	
	this.presences.push.apply(this.presences, [
		{name: 'touch', shape: this.hitBox}
	]);
	
	this.interests.push.apply(this.interests, [
		{name: 'touch', shape: this.hitBox}
	]);
	
	// State
	this.duration     = 20;
	this.currentTime  = 0;
	
	// These options will not be able to be set if this constructor is being
	// called as a means to extend it.
	if(this.options){
		this.attacker = this.options.attacker;
		this.attackData = this.options.attackData;
		this.angle = this.options.angle;
		this.magnitude = this.options.magnitude;
	}
}

LungeAttack.prototype = Object.create(Entity.prototype);

LungeAttack.prototype.onCollision = function (collision) {
	var entity   = collision.target,
		interest = collision.interest;

	if (interest.name === "touch" &&
		this.attacker.consider(entity) === "hostile" &&
		!entity.invulnerable) {
		entity.damage(this.options.attackData);
		
		entity.addEffect(new Knockback({
			// Target
			target: entity,
			// Angle
			angle: this.angle,
			// Force
			force: this.magnitude * 1
		}));
		
		entity.addEffect(new Invulnerability({
			// Target
			target: entity
		}));
		
		this.currentTime = this.duration;
		this.attacker.addEffect(new Knockback({
			// Target
			target: this.attacker,
			// Angle
			angle: this.angle + Math.PI,
			// Force
			force: this.magnitude * 0.5,
			// Duration
			duration: 10
		}));
	}
};

LungeAttack.prototype.update = function () {
	this.attacker.move(this.angle, this.magnitude);
	this.x = this.attacker.x;
	this.y = this.attacker.y;
	
	// Step forward in time.
	this.currentTime += 1;

	// Check to see if the attack has finished yet or not.
	if(this.currentTime >= this.duration) {
		this.onFinish();
	}
};

LungeAttack.prototype.draw = function () {
	/* DEBUG */
	var context = jaws.context;

	context.save();
	context.strokeStyle = "green";
	context.lineWidth = 3;

	context.beginPath();
	
	context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);

	context.stroke();

	context.restore();
	
};

return LungeAttack;

});
