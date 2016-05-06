var container, stats;
var camera, scene, renderer;
var cube, plane;
var targetRotationX = 0;
var targetRotationY = 0;
var targetRotationOnMouseDownX = 0;
var targetRotationOnMouseDownY = 0;
var mouseX = 0;
var mouseY = 0;
var mouseZ = 0;
var mouseXOnMouseDown = 0;
var mouseYOnMouseDown = 0;
var mouseZOnMouseDown = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var objects = [];
var parsedJSON;
var colorWidth, colorHeight;
var totalColors;
var counter = 0;
var gridX = 0;
var gridY = 0;
var gridColumns = true;
var zeroingIterations = 6;
var image_path = "null";
var newNoteX = 0;
var newNoteY = 0;
var imgCount = 0;
var imageData = "null";
var bufferImage = "null";
// var sessionId = Math.floor(Math.random()*900000) + 100000;


var gui, controls;

var player, rotation_speed, movement_speed;

var yaw = 0,
    pitch = 0,
    roll = 0;
var posx = 0,
    posy = 0,
    posz = 0;

var dummy = 0;
var device_id = null;
var teamName = document.title;

if (teamName == "team1"){
    device_id = "displayA";
}else if (teamName == "team2"){
    device_id = "displayB";
}

try {
    var socket = io.connect("https://stickie2-jaskiratr.c9users.io:8081");
    socket.emit("device_id", device_id);
    socket.on("pos_data", function(data) {
        posx = data.args[0];
        posy = data.args[1];
        posz = data.args[2];

        console.log(data);
    });
    // socket.on("team")

    socket.on("image_path", function(data) {
        image_path = data;
    });
    socket.on("bufferImage", function(data) {
        bufferImage = "data:image/png;base64," + data;
    });


    socket.on("createGrid", function(data) {
        console.log("CREATING GRID....");
        if (counter < zeroingIterations) {
            if (data == "origin") {
                resetGrid();
                createGrid(0);
                console.log("Grid Created at ORigin");
            } else {
                createGrid(data); // at a certain position
                console.log("Grid Created at " + data);
            };
        }
    });
    socket.on("ImgData", function(data) {
        console.log("imgData received");
        storeImage(data);
    });
    socket.on("imagePosition",function(data){
        newNote(bufferImage,data.x,data.y);
    });


} catch (e) {
    console.log("exception occurred");
    console.log(e);
}

loadColors();
init();
animate();

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 700;
    camera.position.x = window.innerWidth / 2;
    camera.position.y = window.innerHeight / 2;
    scene = new THREE.Scene();

    // // GRADIENT BACKGROUND
    // var geometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    // var texture = THREE.ImageUtils.loadTexture("bg.jpg");
    // texture.wrapS = THREE.RepeatWrapping;
    // texture.wrapT = THREE.RepeatWrapping;
    // texture.repeat.set(1, 1);
    // var material = new THREE.MeshBasicMaterial({map: texture});
    // var plane = new THREE.Mesh(geometry, material);
    // plane.position.x = window.innerWidth / 2;
    // plane.position.y = window.innerHeight / 2;
    // scene.add(plane);

    // console.log(typeof(plane.position.x));


    // initPlayer();
    // createGrid();

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setClearColor(0xf0f0f0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild(renderer.domElement);

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);

}


function initPlayer() {
    var geometry = new THREE.PlaneGeometry(100, 100);
    var material = new THREE.MeshBasicMaterial({
        color: new THREE.Color("rgb(155,160,20)"),
    });
    var player = new THREE.Mesh(geometry, material);
    player.position.x = newNoteX;
    player.position.y = newNoteY;
    player.position.z = 1;
    scene.add(player);
    console.log('player added');
}

function newNote_test(data) {
    var geometry = new THREE.PlaneGeometry(100, 100);
    var material = new THREE.MeshBasicMaterial({
        color: new THREE.Color("rgb(155,160,20)"),
    });
    var note = new THREE.Mesh(geometry, material);
    var posx = data.red / 210 * window.innerWidth;
    var posy = data.green / 210 * window.innerHeight;
    note.position.x = posx;
    note.position.y = posy;
    note.position.z = 1;
    scene.add(note);
    console.log('note added');

}

function newNote(imageData, posx, posy) {
    var texture, material, note;
    // imageData = "data:image/png;base64," + data;
    // texture = THREE.ImageUtils.loadTexture("images/" + path);
    texture = THREE.ImageUtils.loadTexture(imageData);
    material = new THREE.MeshBasicMaterial({
        map: texture
    });
    note = new THREE.Mesh(new THREE.PlaneGeometry(104.0, 124.0), material);
    note.material.side = THREE.DoubleSide;

    note.position.x = posx;
    note.position.y = posy;
    note.position.z = 10;
    note.rotation.x = 0;
    note.rotation.y = 0;

    note.castShadow = true;
    note.receiveShadow = true;
    scene.add(note);
    objects.push(note);
    console.log('Note added');
    removeGrid();
}

function createGrid(position) {
    if (counter < zeroingIterations) {
        console.log("position " + position);
        console.log("counter " + counter);
        console.log("gridX start " + gridX);
        console.log("gridY start" + gridY);

        removeGrid();
        var geometry = new THREE.PlaneGeometry(colorWidth, colorHeight);

        if (gridColumns == true) {
            gridY += position * colorHeight;
        } else {
            gridX += position * colorWidth;
        }
        console.log("colorWidth " + colorWidth);
        console.log("colorHeight " + colorHeight);
        console.log("gridColumns " + gridColumns);
        for (var i = 0; i < totalColors; i++) {
            var material = new THREE.MeshBasicMaterial({
                color: new THREE.Color("rgb(" + parsedJSON.refColors[i].r + ',' + parsedJSON.refColors[i].g + ',' + parsedJSON.refColors[i].b + ")"),
            });
            var plane = new THREE.Mesh(geometry, material);
            if (gridColumns == true) {
                plane.position.x = (colorWidth) * (i + 0.5) + gridX;
                plane.position.y = gridY + colorHeight / 2;
            } else {
                plane.position.x = gridX + colorWidth / 2;
                plane.position.y = (colorHeight) * (i + 0.5) + gridY;
            }
            plane.name = "gridColor";
            scene.add(plane);
        };
        if (gridColumns == true) {
            colorHeight = colorHeight / totalColors; // reduce height
            gridColumns = false;
        } else {
            colorWidth = colorWidth / totalColors; // reduce width
            gridColumns = true;
        }
        counter++;
        // if (counter < zeroingIterations) {
        socket.emit("gridCreated", "true");
        console.log("displayA: GRID CREATED")
    }
    if (counter == zeroingIterations) {
        newNoteX = plane.position.x;
        newNoteY = plane.position.y;

        //use the buffer image data to create the note
        newNote(bufferImage, newNoteX, newNoteY);   

        //send data to other display 
        socket.emit("imagePosition", plane.position);

        removeGrid();
        counter = 0;
        socket.emit("gridCreated", "stop");
    };
}
//function to create the note using buffer image data when pos rx-ed


function removeGrid() {
    for (var i = 0; i < totalColors; i++) {
        var selectedObject = scene.getObjectByName("gridColor");
        if (selectedObject) {
            scene.remove(selectedObject);
        }
    }
}

function resetGrid() {
    gridX = 0;
    gridY = 0;
    colorWidth = window.innerWidth / totalColors;
    colorHeight = window.innerHeight;
    gridColumns = true;
    console.log("reset");
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadColors() {
    // Load JSON 
    parsedJSON = (function() {
        var json = null;
        $.ajax({
            'async': false,
            'global': false,
            'url': 'colors.json',
            'dataType': "json",
            'success': function(data) {
                json = data;
            }
        });
        return json;
    })();
    totalColors = parsedJSON.refColors.length;
    colorWidth = window.innerWidth / totalColors;
    colorHeight = window.innerHeight;
}

function animate() {
    requestAnimationFrame(animate);
    render();
    stats.update();
}

function render() {
    renderer.render(scene, camera);
}
