function PlayState () {
	// The current map.
	var map, players=[], npcs=[], characters=[], viewport;

	this.setup = function (options) {
		if(!options.map) {
			throw new Error("PlayState needs a map.");
		}
		if(!options.players) {
			throw new Error("PlayState needs at least one player.");
		}

		options.players = options.players || [];
		options.npcs    = options.npcs    || [];

		map = _parseMap(options.map);

		viewport = new jaws.Viewport({
			width: jaws.width,
			height: jaws.height,
			max_x: map.width,
			max_y: map.height
		});
		
		// Setup players.
		(function () {
			// Load Map assets.
			for(var lcv = 0; lcv < options.players.length; lcv++ ) {
				var player = PlayerFactory({
					character: $.extend({}, options.players[lcv].character, {
						spawnX: options.players[lcv].spawnX,
						spawnY: options.players[lcv].spawnY,
						tileMap: map
					}),
					tileMap   : map,
					players   : players,
					npcs      : npcs,
					keyMap    : options.players[lcv].keyMap,
					characters: characters

					// Experiments w/ multiple viewports.
					/*
					viewWidth: jaws.width / 2,
					viewHeight: jaws.height,
					viewOffsetX: lcv * (jaws.width / 2),
					viewOffsetY: 0
					*/
				});
				
				players.push(player);
				characters.push(player.character);
			}
		})();
		
		// Setup NPCs.
		(function () {
			// Load Map assets.
			for(var lcv = 0; lcv < options.npcs.length; lcv++ ) {
				var npc = NPCFactory({
					character: $.extend({}, options.npcs[lcv].character, {
						spawnX: options.npcs[lcv].spawnX,
						spawnY: options.npcs[lcv].spawnY,
						tileMap: map
					})
				});
				
				npcs.push(npc);
				characters.push(npc.character);
			}
		})();
		
        jaws.preventDefaultKeys(["up", "down", "left", "right", "space"]);
	};

	this.update = function () {
		// Set up loop variables.
		var i, ilen, j, jlen, response = new SAT.Response();

		// Update our players and NPCs.  This includes decision making and 
		// actions.
		for(i=0, ilen=players.length; i<ilen; i++) {
			players[i].update();
		}
		for(i=0, ilen=npcs.length; i<ilen; i++) {
			npcs[i].update();
		}

		// Sort the list of characters by Y coordinate so they'll be drawn with
		// the "closest" one in the foreground.
		characters.sort(function (a, b) {
			if(a.y > b.y) return  1;
			if(a.y < b.y) return -1;
			return 0; 
		});

		// Detect / respond to map collisions.
		for(i=0, ilen=characters.length; i<ilen; i++) {
			var mapObjs = map.collides( characters[i] );
			for(j=0, jlen=mapObjs.length; j<jlen; j++) {
				characters[i].x -= mapObjs[j].overlapX;
				characters[i].y -= mapObjs[j].overlapY;
			}
		}
	};

	this.draw = function () {
		jaws.clear();

		for(var lcv = 0; lcv < players.length; lcv++ ) {
			players[lcv].draw();
		}
	};

	/*
	 * Parse map data and output a TileMap.
	 */
	function _parseMap (data) {
		var tileMap, 
			xlen = data.tiles[0].length,
			ylen = data.tiles.length,
			x, y, tile, tileProps;

		tileMap = new jaws.TileMap({
			cell_size: data.properties.size,
			size     : [xlen, ylen],
			x: 0, y: 0
		});

		tileMap.width  = xlen * data.properties.size[0];
		tileMap.height = ylen * data.properties.size[1];

		for(x=0; x<xlen; x++) {
			for(y=0; y<ylen; y++) {
				tileProps = data.properties[data.tiles[y][x]];
				tile = new jaws.Sprite({
					image: tileProps.imageSrc,
					x    : x * data.properties.size[0],
					y    : y * data.properties.size[1]
				});

				tile = $.extend(tile, tileProps);
				tileMap.push(tile);
			}
		}

		return tileMap;
	}
}