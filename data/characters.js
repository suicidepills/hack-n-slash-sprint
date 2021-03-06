define(
['../data/items'],
function (items) {

return {
    "base": {
		label: "no label",
		spawnX: 0,
		spawnY: 0,
		width: 32,
		height: 32,
		tileMap: null,
		sprite_sheet: null,
		scale: 1,
		anchor: [0.5, 0.5625],
		frame_size: [128, 128],
		frame_duration: 100,
		animationSubsets: {
			// Paperdoll
			paperdoll:    [1,2],
			
			// Idle
			idle_S:       [2,3], // Reuses first frame of walk for now.
			idle_N:       [4,5], // Reuses first frame of walk for now.
			idle_W:       [6,7], // Reuses first frame of walk for now.
			idle_E:       [8,9], // Reuses first frame of walk for now.
			
			// Walk
			walk_S:       [2,4],
			walk_N:       [4,6],
			walk_W:       [6,8],
			walk_E:       [8,10],
			
			// Attack
			attack_S:     [10,14],
			attackHold_S: [13,14],
			attack_N:     [14,18],
			attackHold_N: [17,18],
			attack_W:     [18,22],
			attackHold_W: [21,22],
			attack_E:     [22,26],
			attackHold_E: [25,26],
			
			// Misc.
			damage:       [28,29],
			dead:         [29,30],
			fall:         [30,36]
		},
		radius: 8,
		bearing: "S",
		resources: {
			health: 100,
			mana: 100,
			stamina: 100,
			currency: 0
		},
		// TODO: Implement max regen, damage reduction, and penetration rates.
		stats: {
			maxHealth: 100,
			maxMana: 100,
			maxStamina: 100,
			regenRateHealth: 1,
			regenRateMana: 1,
			regenRateStamina: 1,
			damage: 2,
			damageReductionPhysical: 0,
			damageReductionMagic: 0,
			penetrationPhysical: 0,
			penetrationMagic: 0,
			movementSpeed: 1,
			movementSpeedIncrease: 0,
			maxMovementSpeed: 5,
			walkSpeed: 1,
			runSpeed: 2.5
		},
		equipment: {
			attack: null,
			useActiveItem: null,
			offhand: null,
			tunic: null,
			sleeves: null,
			gloves: null,
			leggings: null,
			footwear: null,
			gorget: null,
			head: null,
			ring: null,
			amulet: null
		},
		mass: 1
	},
	"Chuck": {
		label: "Chuck",
		sprite_sheet: "assets/png/entities/Chuck.png"
	},
	"Edge": {
		label: "Edge",
		sprite_sheet: "assets/png/entities/FF4_Edge.png"
	},
	"Tellah": {
		hookable: true,
		interaction: "lift",
		label: "Tellah",
		sprite_sheet: "assets/png/entities/FF4_Tellah.png"
	}
};

});