var g = game(800, 600, setup,
				[	"json/sticky.png",
					"json/hands.png",
					"json/alien.png",
					"json/alienHunter.json",
					"json/car.json",
					"images/texture.png",
					"images/texture2.png",
					"images/texture3.png",
					"sounds/retro-action.wav",
					"sounds/shot.wav",
					"sounds/explosion.wav",
					"sounds/bounce.mp3",
					"fonts/puzzler.otf",
					"fonts/PetMe64.ttf"
				]
				,load
			);
//Start the engine
g.start();

//Scale and center the game
g.scaleToWindow();

//Optionally rescale the canvas if the browser window is changed
window.addEventListener("resize", function(event){
	g.scaleToWindow();
});

//Global variables
var player,sky,ship,gun,mGun,car;
//Global groups
var blocks,playerGroup,itemGroup = group([]);
//Global Arrays
var designs = [];

//Object to hold game variables/constants
var controller = {
	gravity: 15,	//force of gravity
	speed: 275,		//speed 275
	jumpForce: 375,	// force to jump
	bulletSpeed: 1000, //speed of the bullet
	d0: 0,	// time at last call
	dt:	0,	// elapsed time between calls
	design: null,
	distance: null,
	miles: null
};
var contr = controller;

var score = {
	aliensKilled: 0,
	miles: 0
};

//For activities to be performed while assets are loading
function load(){
	//Display the loading progress bar while the game
	progressBar.create(g.canvas, assets);
	progressBar.update();
}
function setup(){
	//Remove the progress bar
	progressBar.remove();

	//Sound and music
	shotSound = assets["sounds/shot.wav"];
	bgMusic = assets["sounds/retro-action.wav"];
	bgMusic.loop = true;
	bgMusic.volume= 0.5;
	explosionSound = assets["sounds/explosion.wav"];
	jumpSound = assets["sounds/bounce.mp3"];

	//Create the sprites
	//1. The 'titleScene' sprites
	//The play button
	playButton = button([
		assets["up.png"],
		assets["over.png"],
		assets["down.png"]
	]);

	//Set the 'playButton''s x property to 514 so that
	//it's offscreen when the sprite is created
	playButton.x = 514;
	playButton.y = 450;

	//Set the 'titleMessage' x position to -200 so that it's offscreen
	titleMessage = text("start game", "20px puzzler", "white", -200, 420);

	//Game title name
	gameTitle = text("Alien Hunter", "40px PetMe64", "white", 100, 150);

	//Make the 'playButton' and 'titleMessage' slide in from the
	//edges of the screen using the 'slide' function
	slide(playButton, 420, 450, 30, ["decelerationCubed"]);
	slide(titleMessage, 420, 420, 30, ["decelerationCubed"]);

	frontBg = rectangle(g.canvas.width,g.canvas.height,"#3b3224","",1,0,0);

	//Create the 'titleScene' group
	titleScene = group([frontBg,playButton,titleMessage,gameTitle]);

 	//2. The 'gameScene' sprites
	//Make the sky background
	sky = getSkyBackground();
	//Initialize designs
	initDesigns();

	//space ship sprites
	ship = createShip();
	//draw moon sprites
	moon = drawMoon();
	//Add a black border along the top of the screen
	topBar = new TopBar();
	topBar.create();

	//make player and set initials
	player = makePlayer();
	player.walk();
	player.breath();

	//Power Ups
	gun = createGun();
	car = createCar();

	//Create Player Group as a container
	playerGroup = createPlayerGroup();

	//Create  buildings
	bd = new Buildings();
	bd.createBuildings();

	//Add the game sprites to the 'gameScene' group
	gameScene = group([sky,topBar.container,moon,blocks,ship,car,playerGroup,itemGroup]);

	//Create Aliens
	aliens = new Alien();
	for(var i=0;i < 5;i++){
		var alienObj = aliens.createAlien();
		alienObj.visible = false;
		alienObj.setPosition(ship.centerX,ship.centerY);
		aliens.alienPool.push(alienObj);
	}
	//Create Bullets
	bullets = new Bullet();
	for(var i=0;i < 5;i++){
		var bulletObj = bullets.createBullet();
		bulletObj.visible = false;
		bullets.bulletPool.push(bulletObj);
	}
	//Initi items
	imgr = new ItemManager();
	imgr.initItems();

	//Position the 'gameScene' offscreen at 814 so that its
	//not visible when the game starts
	gameScene.x = 814;
	// titleScene.layer = 1;
	// stage.alpha = 1;
	// titleScene.alpha=0.95;

	//Assign the key events
	keyHandler();

	playButton.press = function(){
		g.state = play;
		slide(titleScene, 814, 0, 30, ["decelerationCubed"]);
		slide(gameScene, 0, 0, 30, ["decelerationCubed"]);
		bgMusic.play();
		contr.t0 = new Date().getTime(); // initialize value of t0
	};
}
function keyHandler(){
	//pause the game with Q  keyboard key
	keyboard(81).press = function(){
		if(g.paused){
			g.resume();
		}
		else {
			g.pause();
		}
	};
	//fire the bullets with space key
	var space = keyboard(32);
	space.press = function(){
		if(playerGroup.item.type=="gun"){
			playerGroup.item.visible = true;
			player.shoot(gun);
		}
		if(playerGroup.item.type=="mg"){
			player.shoot(mGun);
		}
	};
	space.release = function(){
		if(playerGroup.item.type=="gun"){
			playerGroup.item.visible = false;
			player.walk();
		}
		if(playerGroup.item.type=="mg"){
			player.walk();
		}
	};
	//Jump the player with upArrow
	var upArrow = keyboard(38);
	upArrow.press = function(){
		if (playerGroup.isOnGround){
			playerGroup.isOnGround = false;
			playerGroup.vy = -contr.jumpForce;
			player.jump();
		}
	};
	//slide the player with downArrow
	var dwnArrow = keyboard(40);
	dwnArrow.press = function(){
		playerGroup.rotation = -1.45;
		player.slide();
	};
	//unslide the player
	dwnArrow.release = function(){
		playerGroup.rotation = 0;
		player.unSlide();
	};
}
function makePlayer(){
	var o = {};
	//States
	o.state = "";
	o.sticky = sprite(filmstrip(assets["json/sticky.png"],30,53));
	o.sticky.states = {
		stand:0,
		walk: [1,6],
		jump: 7,
		slide: 8
	};
	//Set the player's 'fps'
	o.sticky.fps = 12;
	o.sticky.sliding = false;
	//hands
	o.hands = sprite(filmstrip(assets["json/hands.png"],30,21));
	o.hands.states = {
		stand: 0,
		walk: [1,6],
		jump: 7,
		slide:8,
		gun:9,
		mg: 10
	};
	o.hands.setPosition(0,21);

	//eyes
	o.leye = ellipse(7,4.2,2,5);
	o.reye = ellipse(10,4.2,2,5);

	//group to assemble player parts
	o.grp = group([o.sticky,o.hands,o.leye,o.reye]);

	o.walk = function(){
		if(o.state !== "walk"){
			o.state = "walk";
			o.sticky.playSequence(o.sticky.states.walk);
			o.hands.playSequence(o.hands.states.walk);
		}
	};
	o.breath = function(){
		var breathePlayer = breathe(player.grp, 1, 1.05, 30);
	};
	o.jump = function(){
		if(o.state !== "jump"){
			o.state = "jump";
			o.sticky.show(o.sticky.states.jump);
			o.hands.show(o.hands.states.jump);
			jumpSound.play();
		}
	};
	o.slide = function(){
		if(o.state !== "slide"){
			o.state = "slide";
			o.sticky.sliding = true;
			o.sticky.show(o.sticky.states.slide);
			o.hands.show(o.hands.states.slide);
		}
	};
	o.unSlide = function(){
		if(o.state !== "unslide"){
			o.state = "unslide";
			o.sticky.sliding = false;
			o.walk();
		}
	};
	o.shoot = function(shooter){
		if(o.state !== "shoot"){
			o.state = "shoot";
			o.hands.show(o.hands.states.gun);
			if (shooter.type == "gun"){
				fire(shooter);
			}
			else{// else it is machine gun
				o.hands.show(o.hands.states.mg);
				fire(shooter);
				setTimeout(function(){fire(shooter);},50);
			}
		}
	};
	o.play = function(){
		if(o.state !== "playing"){
			o.state = "playing";
			o.sticky.play();
			o.hands.play();
		}
	};
	o.stop = function(){
		if(o.state !== "stopped"){
			o.state = "stopped";
			o.sticky.stop();
			o.hands.stop();
		}
	}
	return o;
}
function createCar(){
	var cBody = sprite(assets["carBody.png"]);
	var cLWheel = sprite(assets["carWheel.png"],14.6,17.2);
	var cRWheel = sprite(assets["carWheel.png"],56,17.2);
	var driver =  sprite(assets["driver.png"],38,2);

	cLWheel.rotate =0.1;
	cRWheel.rotate =0.1;
	var car = group([cBody,cLWheel,cRWheel,driver]);

	car.type = "car";
	car.visible = false;

	car.start = function(){
			cLWheel.rotation += cLWheel.rotate;
			cRWheel.rotation += cRWheel.rotate;
			var carWobble = wobble(car, 1, 1.1);
	};
	car.remove = function(){
		car.visible = false;
		stage.addChild(car);

		player.grp.visible = true;

		playerGroup.addChild(player.grp);
		playerGroup.addChild(gun);
		playerGroup.item = gun;
	}
	return car;// return a car object
}
function Alien(){
	//aliens Pool and active Pool
	this.alienPool = [];
	this.activeAliens=[];
	this.createAlien = function(){
		var alien = sprite(filmstrip(assets["json/alien.png"],30,53));
		alien.states = {
			stand: 0,
			walk: [1,6],
			jump: 7
		};
		//Set the player's 'fps'
		alien.fps = 12;
		alien.vx=0;
		alien.accelerationX = 0;
		alien.isOnGround = false;
		alien.isTouching = false;
		alien.state = "";

		alien.walk = function(){
			if(alien.state!== "walk"){
				alien.state = "walk";
				alien.playSequence(alien.states.walk);
			}
		};
		alien.jump = function(){
			if(alien.state!== "jump"){
				alien.state = "jump";
				alien.show(alien.states.jump);
			}
		};
		alien.stand = function(){
			if(alien.state!== "stand"){
				alien.state = "stand";
				alien.show(alien.states.stand);
			}
		};
		alien.stop = function(){
			if(alien.state!== "stop"){
				alien.state = "stop";
				alien.stop();
			}
		};
		gameScene.addChild(alien);
		return alien;
	};
	this.getAlien = function(){
		var alien = null;
		if(this.alienPool.length > 0){
			alien = this.alienPool.pop();
			alien.vx=0;
			alien.vy = 0;
			alien.accelerationX = 0;
			alien.isOnGround = false;
			alien.isTouching = false;
			alien.state = "";
			alien.act = "";
		}
		else {
			alien = this.createAlien();
		}
		alien.setPosition(ship.centerX,ship.centerY);
		alien.visible = true;
		this.activeAliens.push(alien);
		return alien;
	};
  this.freeAlien = function(alien){
	 	alien.visible = false;
		alien.isTouching = false;
	 	alien.setPosition(ship.centerX,ship.centerY);
	 	this.activeAliens.splice(this.activeAliens.indexOf(alien), 1);
	 	// return the alien back into the pool
	 	this.alienPool.push(alien);
	};
}
function createShip(){
	var ship = sprite(assets["ship.png"]);
	ship.setPosition(600,32);
	ship.startTime = Date.now();
	ship.lastUpdateTime = ship.startTime;
	return ship;
}
function createPlayerGroup(){
	var o = group([player.grp,gun]);
	o.isOnGround = false;
	o.building_id = "";
	o.item = gun;
	o.setPosition(150,300);
	return	o;
}
function createGun(){
	var gun = sprite(assets["gun.png"],25,21);
	gun.visible = false;
	gun.type = "gun";
	return gun;
}
function createMGun(){
	var mGun = sprite(assets["mGun.png"]);
	mGun.type = "mg";
	mGun.visible = false;
	mGun.remove = function(){
		mGun.visible = false;
		stage.addChild(mGun);

		playerGroup.addChild(gun);
		playerGroup.item = gun;
	}
	return mGun;
}
function end(){
	//remove aliens
	for(var i=aliens.activeAliens.length-1;i>=0;i--){
		aliens.freeAlien(aliens.activeAliens[i]);
	}
	//remove bullets
	for(var i=bullets.activeBullets.length-1;i>=0;i--){
		bullets.freeBullet(bullets.activeBullets[i]);
	}
	//Display the 'titleScene' and hide the 'gameScene'
	slide(titleScene, 0, 0, 30, ["decelerationCubed"]);
	slide(gameScene, 814, 0, 30, ["decelerationCubed"]);

	gameScene.visible = false;

	//Assign a new button 'press' action to restart the game
	playButton.press = function(){
		restart();
		//Set the game state to 'play' and 'resume' the game
		contr.t0 = new Date().getTime(); // initialize value of t0
		g.resume();
	};
}
function restart(){
	gameScene.visible = true;
	playerGroup.setPosition(150,300);
	topBar.reset(5);
  var pattern = designs[randomInt(0,3)];
	contr.design = pattern;
	contr.distance = 0;
	bd.resetBuildings(pattern); //reset the building designs

	//Hide the titleScene and reveal the gameScene
	slide(titleScene, 814, 0, 30, ["decelerationCubed"]);
	slide(gameScene, 0, 0, 30, ["decelerationCubed"]);
}
function Buildings(){
	//variables for building blocks
	this.numOfBuilding = 4;
	this.buildingWidth = 300;
	this.buildingHeight = null;
	this.row = 9;
	this.columns = 13;
	//Create a 'group' for all the buildings
	blocks = group([]);

	this.pattern = designs[randomInt(0,3)];

	this.createBuildings = function(){
		blocks.nextPos = { X: 0, Y:400 };
		//Procedural Generation of buildings
		for (var k =0; k < this.numOfBuilding; k++){
			this.buildingHeight = g.canvas.height - blocks.nextPos.Y;
			var building = this.designBuidlings(this.buildingWidth,this.buildingHeight,this.pattern,
				blocks.nextPos.X,blocks.nextPos.Y);

			blocks.addChild(building);
			blocks.nextPos.X=building.x + randomInt(350,400);
			blocks.nextPos.Y=400 + randomInt(-50,50);
		}
	};
	this.designBuidlings = function(width,height,pattern,x,y){
		// var row=9;
		// var coloums=13;
		var building =rectangle(width,height,"#272726","grey",2,x,y);
		if(pattern.image){
			building.setPattern(pattern.image,"repeat");
		}

		var windowWidth = building.width /this.row;
		var windowHeight = building.height/this.columns;
		for(var i = 0; i < this.columns; i++){
			for(var j = 0; j < this.row; j++){
				if ( j % 2 !== 0 && i % 2 !== 0){
					//create the windows
					var window = rectangle(windowWidth,windowHeight,"grey","black",1);
					window.x = windowWidth*j;
					window.y = windowHeight*i;
					window.i = i;
					window.j = j;
					if(randomInt(0,1)){
						window.setRadialGradient(pattern.color,"grey",0,0,pattern.startR,0,0,pattern.endR);
					}
					window.blendMode = "hard-light";

					building.addChild(window);
				}
			}
		}
		return building;
	};
	this.resetBuildings = function(pattern){
		blocks.children.forEach(function(building){
			building.pattern = false;
			if(pattern.image)	building.setPattern(pattern.image,"repeat");
			building.children.forEach(function(window){
				window.gradient = false;
				if(randomInt(0,1)){
					window.setRadialGradient(pattern.color,"grey",0,0,pattern.startR,0,0,pattern.endR);
				}
			});
		});
	};
}
function TopBar(){
	this.lifePool = [];
	this.activeLifePool = [];
	this.life = 3;
	this.miles = text("Miles " + score.miles, "10px PetMe64", "black",32,32);
	this.miles.setPosition(g.canvas.width-3*this.miles.width,0.5);
	this.container = group([]);

	this.create = function(){
		for (i = 0; i < this.life; i++){
			this.container.addChild(sprite(assets["life.png"],11*i,5));
		}
		this.container.addChild(this.miles);
	};
	this.update = function(lifeCounter){
		this.life += lifeCounter;
		if(this.life >= 1){
			this.container.remove(this.container.children);
			this.create();
		}
		else{
			playerGroup.vy = 0;
			player.stop();
			g.pause();
			setTimeout(end,1000);
		}
	};
	this.reset = function(){
		this.container.remove(this.container.children);
		this.life = 5;
		for (i = 0; i < o.life; i++){
			this.container.addChild(sprite(assets["life.png"],11*i,5));
		}
		score.miles = 0;
		this.container.addChild(this.miles);
	};
}
function getSkyBackground(){
		return tilingSprite(g.canvas.width,g.canvas.height,assets["snow.png"]);
}
function drawMoon(){
	var moon = circle(50);
	moon.blendMode = "hard-light";
	moon.setRadialGradient("white","#e6e6e2",0,0,10,0,0,35);
	moon.setPosition(150,200);
	return moon;
}
function initDesigns(){
	var design1 = {
			image: undefined,
			color: "white",
			startR: 3,
			endR: 17
	};
	var design2 = {
			image: assets["images/texture.png"],
			color:"#f00e2e",
			startR: 10,
			endR: 17
	};
	var design3 = {
			image: assets["images/texture2.png"],
			color:"black",
			startR: 15,
			endR: 17
	};
	var design4 = {
			image: assets["images/texture3.png"],
			color:"black",
			startR: 15,
			endR: 17
	};
	designs.push(design1);
	designs.push(design2);
	designs.push(design3);
	designs.push(design4);
}
function ItemManager(){
  this.initItems = function(){
    this.car_snap = sprite(assets["car_snap.png"]);
    this.car_snap.type = "car";
    this.car_snap.visible = false;

    this.life = sprite(assets["heart.png"]);
    this.life.type = "heart";
    this.life.visible = false;
    gameScene.addChild(this.car_snap);
    gameScene.addChild(this.life);
  };
  this.getItem = function(){
  	var item;
    switch (randomInt(1,2)){
      case 1:
        item = this.car_snap;
        break;
      case 2:
        item = this.life;
        break;
      default:
        console.log("Error in getting items");
    }
    if (item !== undefined){
      return item;
  	}
  };
  this.removeItem = function(item){
    item.visible= false;
    gameScene.addChild(item);
  };
}
