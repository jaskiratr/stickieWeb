var http = require("http");
var sio = require("socket.io");
var math = require('mathjs');
var jsonfile = require('jsonfile');
var util = require('util');
var fs = require('fs');
var fsPlayback = require('fs');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var mongoose = require('mongoose');
mongoose.connect('mongodb://'+process.env.IP+'/postdb'); // DOUBLE CHECK

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log("we're connected!");
});

// Database for Posts
var sessionSchema = new mongoose.Schema({
  timestamp: { type: Number },
  team: { type: String },
  position :{
    x: Number,
    y: Number
  },
  filename :{ type: String },
  previousPost: { type: String }
});
var postParam = mongoose.model('postCollection', sessionSchema);

// Database for Devices
var deviceSchema = new mongoose.Schema({
  timestamp: { type: Number },
  team: { type: String },
  sessionId: { type: String },
  deviceId: { type: String },
  kind: { type: String }
});
var deviceParam = mongoose.model('sessionCollection', deviceSchema);

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var port = 8081;    // Socket IO Port : Different than process.env.IP

app.use(express.static('public')); // Serve static files
server.listen(port,process.env.IP, function () {
    console.log('Updated : Server listening at port '+ process.env.IP +" "+ port);
});
console.log("process.env.PORT "+process.env.PORT);

///////

var imgCount = 0;
var rxColor;
var zeroing = false;
var phoneA = "null";
var phoneB = "null";
var displayA = "null";
var displayB = "null";
var displayRX, displayTX, phoneRX, phoneTX;
var playback = false;
var startTime = math.floor(Date.now() / 1000);
var elapsedTime = 0;
var bufferImage = null;
var bufferImagePath = null;
var notePostedFromLog = false;

io.sockets.on('connection', function(socket) {
    // Identify the devices
    socket.on("id",function(data) {
        //new entry in mongo
        var newDevice = new deviceParam ({
          timestamp: Date.now(),
          team: data.team_id,
          sessionId: data.session_id,
          deviceId: socket.id,
          kind: data.kind
        });
        // Saving it to the database.
        newDevice.save(function (err) {if (err) console.log ('Error on save!')});
    });
    
    socket.on("device_id", function(data) {
        switch (data) {
            case "phoneA":
                phoneA = socket.id;
                console.log("phoneA Connected");
                io.to(phoneA).emit("Hello", "phoneA");
                break;
            case "phoneB":
                phoneB = socket.id;
                console.log("phoneB Connected");
                io.to(phoneA).emit("Hello", "phoneA");
                break;
            case "displayA":
                displayA = socket.id;
                console.log("displayA Connected");
                io.to(displayA).emit("Hello", "displayA");
                break;
            case "displayB":
                displayB = socket.id;
                console.log("displayB Connected");
                io.to(displayB).emit("Hello", "displayB");
                break;
        }
    });

    socket.on("image", function(data) {
        var phoneTX = socket.id;
        var imgData = data.replace(/^data:image\/\w+;base64,/, "");
        bufferImage = imgData;

        io.to(displayA).emit("bufferImage", imgData);
        io.to(displayB).emit("bufferImage", imgData);

        //Write to file
        var filename = __dirname + "/images/out_" + imgCount + ".png";
        fs.writeFile(filename, imgData, 'base64', function(err) {
            console.log("error: " + err);
            io.sockets.emit('image_path', "out_" + imgCount + ".png");
            // console.log(filename);
            imgCount++;
            bufferImagePath = filename;
        }); 

        zeroing = true;
        if (phoneTX == phoneA) {
            displayRX = displayA;
            console.log(" Request initiated by Phone A");
            console.log("DisplayA" + displayA);
        };
        if (phoneTX == phoneB) {
            displayRX = displayB;
            console.log(" Request initiated by Phone B");
            console.log("DisplayB" + displayB);
        };

        console.log("displayRX ----" + displayRX);
        console.log("DisplayA ----" + displayA);
        io.to(displayRX).emit('createGrid', 'origin'); ////
        console.log(" Create GRID on ORIGIN");
    });
    socket.on("gridCreated", function(data) {
        console.log("SERVER: Grid created");
        var displayTX = socket.id;
        if (data == 'stop') {
            zeroing = false;
        };
        if (zeroing == true) {
            if (data == 'true') {
                setTimeout(function() {
                    // Delayed for exposure adjustment.
                    if (displayTX == displayA) {
                        phoneRX = phoneA;
                        io.to(phoneRX).emit('findColor', 'findColor');
                    };
                    if (displayTX == displayB) {
                        phoneRX = phoneB;
                        io.to(phoneRX).emit("findColor", "findColor");
                    };
                }, 200);
            }
        };
    });
    socket.on("color", function(data) {
        console.log("COLOR Recieved from Phone");
        console.log(data);
        
        var phoneTX = socket.id;
        var displayRX = "null";
        rxColor = new avgColor(data.red, data.green, data.blue);
        var pos = calculatePosition();
        console.log("Phone Position " + pos);
        // Send to specific display
        if (phoneTX == phoneA) {
            displayRX = displayA
        }
        if (phoneTX == phoneB) {
            displayRX = displayB
        }
        io.to(displayRX).emit('createGrid', pos);
    });

    socket.on("imagePosition", function(imagePosition) {
        var displayTX = socket.id;
        var team = null;
        if (displayTX == displayA) {
            io.to(displayB).emit("imagePosition", imagePosition);
            team = 'team1';
        }
        if (displayTX == displayB) {
            io.to(displayA).emit("imagePosition", imagePosition);
            team = 'team2';
        }

        elapsedTime = math.floor(Date.now() / 1000) - startTime;
        // Write to Json
        // Creating one user.
        var newPost = new postParam ({
          timestamp: 001,
          team: team,
          position: {
            x: imagePosition.x,
            y: imagePosition.y
          },
          filename: bufferImagePath,
          previousPost: '000Prev'
        });

        // Saving it to the database.
        newPost.save(function (err) {if (err) console.log ('Error on save!')});

        // addToLog(elapsedTime, displayTX, bufferImagePath, imagePosition);
    });

});

function avgColor(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
};

var lastImage = -1;

function calculatePosition() {
    var position;
    var calcColor = "nullColor";
    var delta = 0;
    var minDelta = 10000;
    var parsedJSON = require('./colors.json');
    console.log("parsedJSON.colorList.length" + parsedJSON.colorList.length);
    for (var i = 0; i < parsedJSON.colorList.length; i++) {
        console.log("rxColor" + JSON.stringify(rxColor));
        console.log("rxColor[1]" + rxColor[1]);
        console.log("parsedJSON.colorList[i].r" + parsedJSON.colorList[i].r);
        delta = math.abs(rxColor.r - parsedJSON.colorList[i].r) + math.abs(rxColor.g - parsedJSON.colorList[i].g) + math.abs(rxColor.b - parsedJSON.colorList[i].b);
        console.log("Delta" + delta);
        if (delta < minDelta) {
            calcColor = parsedJSON.colorList[i].color;
            console.log("calcColor" + calcColor);
            minDelta = delta;
            position = i;
        }
    };
    console.log(calcColor);
    return position;
}


///////
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
