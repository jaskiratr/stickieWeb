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
var zeroingIterations = 4;
var image_path = "null";
var newNoteX = 0;
var newNoteY = 0;
var imgCount = 0;
var imageData = "null";
var bufferImage = "null";
var activity = "null";
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var INTERSECTED, SELECTED;
var newPosX, newPosY, newPosZ;
var tempNotename;
var url = window.location.href ;
var sessionId = url.split('/').pop();
// console.log(teamName);
if(teamName != "null"){
    console.log("teamName "+ teamName);
}
// console.log("sessionId= " + sessionId);

var gui, controls;

var player, rotation_speed, movement_speed;

var xSpeed = 0,
    ySpeed = 0,
    xOffset = 0,
    yOffset = 0;
var zoomPause = 1000;
var interval = 0;
var isPanning = false;
var zoom = 0;    
var posx = 0,
    posy = 0,
    posz = 0;

var dummy = 0;
var device_id = null;
var teamName = document.title;
var id = {team_id:'null', session_id: sessionId, kind: 'display'};
var socket;
function connectSocket(sessionId, teamId){
    
    
    
    console.log(sessionId +' '+ teamId);
    teamName = teamId;
   console.log("connecting to socket");
   try {
    socket = io.connect("https://stickie2-jaskiratr.c9users.io:8081");
    showNotification("Connected!");
    id = {team_id: teamId, session_id: sessionId, kind: 'display'};
    socket.emit("id", id);
    socket.on("pos_data", function(data) {
        posx = data.args[0];
        posy = data.args[1];
        posz = data.args[2];
    });
    
    //GENERATE QR CODE -
    setTimeout(function(){
        generateQR(sessionId,teamId);
    },2000);
    
    //WAIT FOR PHONE TO BE CONNECTED
    socket.on("removeQR",function(data) {
        $("#qrContainer").fadeOut(1500);   
       console.log("removeQR") ;
    });
    socket.on("activity",function(data) {
       switch (data) {
           case 'postImage':
               activity = 'postImage';
               console.log("Activity = postImage");
               break;
            
            case 'grabNote':
               activity = 'grabNote';
               console.log("Activity = grabNote");
               break;
            
            case 'releaseNote':
                activity = 'releaseNote';
               console.log("Activity = releaseNote");
               break;
           
           default:
               // code
       } 
    });
    
    socket.on("notification",function(data) {
        console.log("notification Rx");
        showNotification(data);    
    });
    
    socket.on("pan", function(data) {
        console.log(data);
        xSpeed = data.x/4;
        ySpeed = data.y/4;
        // xSpeed = 0.985*xSpeed + 0.015*data.x;
        // ySpeed = 0.985*ySpeed + 0.015* data.y;
        // zoom = data.z/2;
        zoom = Math.sqrt(Math.pow(xSpeed,2)+Math.pow(ySpeed,2))/3;
        xOffset += xSpeed;
        yOffset += ySpeed;
        // newPosX=(camera.position.X+xSpeed);
        // newPosY= 0.3*camera.position.Y + (camera.position.Y+xSpeed)*0.7;
        // newPosX= 0.3*camera.position.x + (camera.position.x+xSpeed)*0.7;
        // camera.position.X += newPosX;
        // camera.position.Y += newPosY;
        camera.position.x += xSpeed;
        camera.position.y += ySpeed;
        camera.position.z += zoom;
        interval = Date.now();
        // gridX += xSpeed/5;
        // gridY += ySpeed/5;
    });
    
    socket.on("image_path", function(data) { // NOT BEING CALLED OMG!!!
        image_path = "/images/"+ data;
        console.log("Image Path set from socket "+ image_path); // THis doesnt update global var?
    });
    
    socket.on("bufferImage", function(data) {
        // console.log("bufferimage rxed");
        bufferImage = "data:image/png;base64," + data;
    });
    
    socket.on("createGrid", function(data) {
        // console.log("CREATING GRID....");
        if (counter < zeroingIterations) {
            if (data == "origin") {
                resetGrid();
                createGrid(0);
                // console.log("Grid Created at ORigin");
            } else {
                createGrid(data); // at a certain position
                // console.log("Grid Created at " + data);
            };
        }
    });
    socket.on("ImgData", function(data) {
        // console.log("imgData received");
        storeImage(data);
    });
    socket.on("imagePosition",function(data){
        // console.log("data.x " + data.x);
        // console.log("data.z " + data.z);
        newNote(bufferImage,data.x,data.y,data.z);
    });
    socket.on("removeNote",function(data) {
       removeNote(data); 
    });
    socket.on("moveNote",function(data) {
        console.log("moveNote rx "+data);
       moveNote(data); 
    });
    
    socket.on("endSession",function(data) {
      window.location.href = ("https://stickie2-jaskiratr.c9users.io/stats=" + data);  
        //  $("#sessionButtons").fadeOut(400,function() {
                 
        //       });
    });
    socket.on("recenter",function(data) {
       camera.position.x = window.innerWidth / 2;
       camera.position.y = window.innerHeight / 2;
       xOffset = 0;
       yOffset = 0;
       resetGrid();
    //   camera.position.x = 0;
    });
    
    } catch (e) {
        console.log("exception occurred");
        console.log(e);
    } 
}
loadColors();
init();
animate();


function init() {
    container = document.createElement('div');
    document.body.appendChild(container);
    container.className = "threeCanvas";
    container.setAttribute("id", "threeCanvas");

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 700;
    camera.position.x = window.innerWidth / 2;
    camera.position.y = window.innerHeight / 2;
    scene = new THREE.Scene();

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
    // console.log('player added');
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
    note.position.z = -1;
    scene.add(note);
    // console.log('note added');
}

function newNote(imageData, posx, posy, noteName) {
    var texture, material, note;
    // imageData = "data:image/png;base64," + data;
    // texture = THREE.ImageUtils.loadTexture("images/" + path);
    // texture = THREE.ImageUtils.loadTexture(imageData);
    // texture = THREE.ImageUtils.loadTexture(image_path);
    // console.log("new note " + noteName);
    
    // image_path = "/images/out_"+noteName+".png";
    var texture = new THREE.TextureLoader().load( image_path );
    
    console.log("Texture Image_path: "+ image_path); // ERROR: DIFFERENT
    // console.log("Rest of the disp noteName"+ noteName);
    material = new THREE.MeshBasicMaterial({
        map: texture
    });
    note = new THREE.Mesh(new THREE.PlaneGeometry(104.0, 124.0), material);
    note.material.side = THREE.DoubleSide;

    note.position.x = posx;
    note.position.y = posy;
    note.position.z = -10;
    note.rotation.x = 0;
    note.rotation.y = 0;
    note.name = noteName;

    note.castShadow = true;
    note.receiveShadow = true;
    scene.add(note);
    objects.push(note);
    // console.log('Note added');
    removeGrid();
}

function createGrid(position) {
    if (counter < zeroingIterations) {
        // console.log("position " + position);
        // console.log("counter " + counter);
        // console.log("gridX start " + gridX);
        // console.log("gridY start" + gridY);

        removeGrid();
        var geometry = new THREE.PlaneGeometry(colorWidth, colorHeight);

        if (gridColumns == true) {
            gridY += position * (colorHeight) ;
        } else {
            gridX += position * (colorWidth) ;
        }
        // console.log("colorWidth " + colorWidth);
        // console.log("colorHeight " + colorHeight);
        // console.log("gridColumns " + gridColumns);
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
        // console.log("displayA: GRID CREATED")
    }
    if (counter == zeroingIterations) {
        /////// DO WHEN POSITION IS ZEROED 
        console.log("Switch Activity: "+ activity);
        switch (activity) {
            
            case 'postImage':
                // code
                newNoteX = plane.position.x;
                newNoteY = plane.position.y;
                plane.position.z = Date.now(); // USE Z AXIS AS IMAGE ID
                
                newNote(bufferImage, newNoteX, newNoteY, plane.position.z );   // Create note on this screen
                //send data to other display 
                
                console.log("corresponding disp plane pos z"+plane.position.z);
                socket.emit("imagePosition", plane.position);   /// SEND TO OTHER DISPLAYS
                // plane.pos.z = wrong here.
                break;

            case 'grabNote':
                socket.emit("grabPosition", plane.position);
                break;
                
            case 'releaseNote':
                socket.emit("releasePosition", plane.position);
                break;
            
            default:
                // code
        }
        setTimeout(function(){
             removeGrid();
        },2000);
        counter = 0;
        socket.emit("gridCreated", "stop");
    };
}

function removeNote(noteName) {
    console.log("remove Object "+ noteName);
    var object = scene.getObjectByName( noteName );
    console.log("rem obj name "+ object.name);
    scene.remove(object);
}

function moveNote(data) {
    console.log(typeof(data));
    console.log("Move note : " + data);
    var noteName = parseInt(data.z);
    console.log("data.z"+ data.z );
    // console.log(" type notename "+ typeof(noteName));
    // console.log("move Object "+ noteName);
    var object = scene.getObjectByName( noteName ); // NOTE NAME IS INCORRECT
    // console.log(object.name);
    object.position.x = data.x;
    object.position.y = data.y;
    // scene.remove(object);
    
    removeGrid();
    // init();
    // animate();
}



function removeGrid() {
    for (var i = 0; i < totalColors; i++) {
        var selectedObject = scene.getObjectByName("gridColor");
        if (selectedObject) {
            scene.remove(selectedObject);
        }
    }
}

function resetGrid() {
    gridX = 0+xOffset;
    gridY = 0 +yOffset;
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
    if(Date.now()-interval>zoomPause){
        // zoom = zoom*0.2;
        camera.position.z = 0.3 * camera.position.z + 490;
    }
    
}

function render() {
    renderer.render(scene, camera);
}

// showNotification("team1");
function showNotification(data) {
    // body...
    var notification = new NotificationFx();
    var notification = new NotificationFx({
        message : '<p>'+data+'</p>',
        layout : 'growl',
        effect : 'slide',
        type : 'notice' // notice, warning or error
    });
    
    // show the notification
    notification.show();
    
}

function generateQR(session, team){
    
    console.log("GenereateQR FOR : "+ session + team);
    var $qrContainer = $( "<div id='qrContainer'/>" );
    $( "body" ).append( $qrContainer);
    
    var $qrCode = $( "<div id='qrCode'/>" );
    $( "#qrContainer").append($qrCode);
    
    // var $qrText = $( "<div id='qrText'/>" );
    
    // $(".container").insertBefore($qrContainer);
    	
    $( "#threeCanvas" ).before( $( "#qrContainer" ) );
    $( "#qrContainer")
    .css("display","none")
    .width("100%")
    .height("100%")
    .css("position", "fixed")
    .css("z-index", "100")
    .css("padding", "10")
    .css("diplay", "block")
    .css("background", "#7DE2B8");
    
    $( "#qrCode")
    .width(200)
    .height(200)
    .css("margin","auto")
    .css("top","50%")
    .css("position","absolute")
    .css("left","50%")
    .css("margin-top"," -100px")
    .css("margin-left"," -100px");
    
    $("#qrContainer").fadeIn(1500);
    // Add qr code
    updateQrCode(session,team);
    
}

function updateQrCode(session,team) {

    var options = {
            // render: $('#render').val(),
            ecLevel: "H",
            minVersion: parseInt(8, 10),

            // fill: $('#fill').val(),
            // background: $('#background').val(),
            // // fill: $('#img-buffer')[0],

            text: session+","+team,
            // size: parseInt($('#size').val(), 10),
            radius: 0.02,
            // quiet: parseInt($('#quiet').val(), 10),

            mode: parseInt(2, 10),

            mSize: 0.1,
            // mPosX: parseInt($('#mposx').val(), 10) * 0.01,
            // mPosY: parseInt($('#mposy').val(), 10) * 0.01,

            label: "Stickie",
            fontname: "Lato",
            fontcolor: "#000",

            // image: $('#img-buffer')[0]
        };

    $('#qrCode').qrcode(options);
    $( "#qrCode").append("<div><h3><span>Point yer' phone here.</span></h3></div>");
}
