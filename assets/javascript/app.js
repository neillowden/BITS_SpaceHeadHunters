const {ipcRenderer} = require('electron');
const rows = 9, cols = 9;

function renderPlayers(gameState){
	// Render players individualy using the gameState data.
	// For the active player the second argument will be true
	var p1div = document.getElementById('player1');
	renderPlayer(gameState.players[0],gameState.player==0, p1div, gameState);

	var p2div = document.getElementById('player2');
	renderPlayer(gameState.players[1],gameState.player==1, p2div, gameState);

	var p3div = document.getElementById('player3');
	renderPlayer(gameState.players[2],gameState.player==2, p3div, gameState);

	var p4div = document.getElementById('player4');
	renderPlayer(gameState.players[3],gameState.player==3, p4div, gameState);
}

// Josh, here's the player's part
function renderPlayer(player, active, element, gamestate){
	//Clear the area for drawing
	element.innerHTML = "";
	//If there's no player - render an empty div with id = element
	//If we have a player
		//render h3 name
		//render avatar
		//render status line
		//render score
		//render action area
		renderActionArea(player, active, element, gamestate);
}

function renderActionArea(player, active, element, gamestate){
	var activeArea = document.createElement("div");
	activeArea.className = "actionarea";
	if(active){
		switch(gamestate.phase){
			case "DRAW":
				//button get a card
				var drawButton = document.createElement("button");
				drawButton.innerHTML = "Draw a card";

				//message back to main
				drawButton.onclick = function(){ 
					sendEvent(gamestate.phase, gamestate.player);
				}

				//add the button to the area
				activeArea.appendChild(drawButton);

				break;
			case "PLACE":
				var cardName = document.createElement("div");
				cardName.innerHTML = player.currentCard;
				activeArea.append(cardName);
				//show player where he can put his card
				displayAvailableSpots(gamestate);
				break;
			case "LURE":
				//Display available spots for lure
				displayAvailableLure(gamestate);
				break;
			default:
				//ships fly
		}
	} else {
		//whaiting - watch
	}
	element.appendChild(activeArea);
}


function sendEvent(name, arg){
	console.log("Sending event ", name, arg);
	ipcRenderer.send(name, arg);
}

function renderBoard(gameState){
	// create an element to draw all tiles on the board
	var element = document.getElementById('board');
	element.innerHTML = "";

	// Add all tiles to the board
	for(var x=0; x<rows; x++){
		for(var y=0; y<cols; y++){
			var cell = document.createElement('div');
			cell.className = 'cell new';
			cell.dataset.x = x;
			cell.dataset.y = y;
			element.appendChild(cell);
			// draw the card if it exists
			drawCard(gameState, x, y, cell);
			drawShips(gameState, x, y, cell);
			drawLure(gameState, x, y, cell);
		}
	}

	// Draw available places
}

function drawCard(gameState, x, y, cell){
	// Find a card in the given coordinates
	var cards = findByXY(gameState.board.tiles, x, y);

	// For cards we only need the first found item
	var card = cards[0];

	if(card){
		cell.innerHTML = card.type;
	}
}

function drawShips(gameState, x, y, cell){
	var ships = findByXY(gameState.board.ships, x, y);

	if(ships.length>0){
		cell.innerHTML += " "+ships.length;
	}
}

function drawLure(gameState, x, y, cell){
	var n = checkLure(gameState, x, y);
	if(n>=0){
		cell.innerHTML += " P"+n;
	}
}

function findByXY(items, x, y){
	// Apply a filter to find items in given cooridnates
	var found = items.filter(function(item){
		return item.x==x && item.y==y;
	})
	return found;
}

function findAvailableSpots(gamestate){
	var available = [];
	//go through your cards, take 4 available spots near each
	gamestate.board.tiles.forEach(function(tile){
		var spots = [
			{ x: tile.x, y: tile.y-1},
			{ x: tile.x, y: tile.y+1},
			{ x: tile.x-1, y: tile.y},
			{ x: tile.x+1, y: tile.y},
		];

		var checkedSpots = spots.filter(function(spot){
			return checkSpot(gamestate, available, spot);
		});
		//if this spot is not in available array yet - add it
		available.push(...checkedSpots);
	});
	return available;
}

function checkLure(gameState, x, y){
	return gameState.players.findIndex(function(player, n){
		return player.lure && player.lure.x == x && player.lure.y == y;
	});
}

function findAvailableCards(gameState){
	var available = [];
	gameState.board.tiles.forEach(function(tile){
		var lured = false;
		var shiped = false;
		var trashed = false;

		// Is there a lure at this coordinates?

		if(checkLure(gameState, tile.x, tile.y)>=0){
			lured = true;
		}

		// Are there ships at this coordinates?
		if(gameState.board.ships){
			gameState.board.ships.forEach(function(ship){
				if(ship.x==tile.x && ship.y==tile.y){
					shiped = true;
				}
			});
		}

		// Is it a trash?
		if(tile.type=="pub"){
			trashed = true;
		}

		if(!lured && !shiped && !trashed){
			console.log("Tile ",tile)
			available.push(tile);
		}

	});
	return available;
}

function checkSpot(gamestate, available, spot){
	//check if this spot is on the board
	var onBoard = spot.x<rows && spot.y<cols && spot.x >= 0 && spot.y >= 0;
	//not taken by a card
	var isCard = findByXY(gamestate.board.tiles, spot.x, spot.y).length>0;
	//not in available yet
	var inAvailable = findByXY(available, spot.x, spot.y).length>0;

	return onBoard && !isCard && !inAvailable;

}

function displayAvailableSpots(gameState){
	var available = findAvailableSpots(gameState);
	available.forEach(function(spot){
		var cell = document.querySelector('[data-x="'+spot.x+'"][data-y="'+spot.y+'"]');
		cell.innerHTML = "A";
		cell.onclick = function(){
			sendEvent(gameState.phase, {
				player: gameState.player, 
				x: spot.x,
				y: spot.y,
			});
		};

	});
}

function displayAvailableLure(gameState){
	var available = findAvailableCards(gameState);
	available.forEach(function(card){
		var cell = document.querySelector('[data-x="'+card.x+'"][data-y="'+card.y+'"]');
		cell.innerHTML += " "+"L";
		cell.onclick = function(){
			sendEvent(gameState.phase, {
				player: gameState.player, 
				x: card.x,
				y: card.y,
			});
		};
	});
}


ipcRenderer.on('GSO', (event, arg) => {
  console.log(event, arg) // helper, prints objects to use
  renderBoard(arg); // render the board from gamestate
  renderPlayers(arg); // render both players from gamestate
})