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
mongoose.connect('mongodb://' + process.env.IP + '/postdb'); // DOUBLE CHECK

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    // we're connected!
    console.log("we're connected!");
});

// Database for Posts
// var postSchema = new mongoose.Schema({
//     timestamp: { type: Number },
//     sessionId: { type: String },
//     deviceId: { type: String },
//     team: { type: String },
//     position: {
//         x: Number,
//         y: Number,
//         z: Number
//     },
//     noteName: { type: String },
//     filename: { type: String },
//     previousPost: { type: String }
// });
// var schemas = require('./mongo_models.js');
var params = require('./mongo_models.js');
var postParam = new params.postParam();
var deviceParam = new params.deviceParam();
// var postSchema = new schemas.postSchema();
// var postParam = mongoose.model('postCollection', postSchema );
// Database for Devices
// var sessionSchema = new mongoose.Schema({
//     timestamp: { type: Number },
//     team: { type: String },
//     sessionId: { type: String },
//     deviceId: { type: String },
//     kind: { type: String },
//     activeNote: { type: String }
// });
// var sessionSchema = new schemas.sessionSchema();
// var deviceParam = mongoose.model('sessionCollection',sessionSchema);

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var port = 8081; // Socket IO Port : Different than process.env.IP

app.use(express.static('public')); // Serve static files
server.listen(port, process.env.IP, function() {
    console.log('Updated : Server listening at port ' + process.env.IP + " " + port);
});
console.log("process.env.PORT " + process.env.PORT);

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
var previousPostId = null;
var filename = null;
var imgName = null;
io.sockets.on('connection', function(socket) {
    // Identify the devices
    socket.on("id", function(data) {
        //new entry in mongo
        console.log("id: " + data.team_id);
        var newDevice = new deviceParam({
            timestamp: Date.now(),
            team: data.team_id,
            sessionId: data.session_id,
            deviceId: socket.id,
            kind: data.kind,
            activeNote: 0
        });
        newDevice.save(function(err) {
            if (err) console.log('Error on save!') });

        console.log("socket.id " + socket.id);
        var lastSessionTX = data.session_id;
        
        
       
        
        // check if session exists
        deviceParam.find({ sessionId: lastSessionTX, kind: 'display' }).exec(function(err, docs) {
            if (docs.length != 0) {
                // console.log("corresponding display " + docs[docs.length - 1].deviceId);
                displayRX = docs[docs.length - 1].deviceId;
                // console.log("displayRX " +displayRX);
                
                 //If new device = phone. Remove QR From Display
                 var teamRX = data.team_id;
                 deviceParam.find({ sessionId: lastSessionTX, team: teamRX, kind: 'display' }).exec(function(err, docs) {
                    if(docs.length!=0){
                        var displayRX = docs[docs.length - 1].deviceId;
                        console.log("displayRX " +displayRX);
                        io.to(displayRX).emit('removeQR', "true");
                    }
              
                 });
        
                
                
                // find all images related to that session in postParam
                postParam.find({ sessionId: lastSessionTX }).exec(function(err, docs) {
                    if (docs.length != 0) {
                        for (var i = 0; i < docs.length; i++) {
                            //emit image+position to the display that just connected to this session
                            // File Name
                            imgName = docs[i].filename; // Change
                            io.to(displayRX).emit('image_path', imgName);
                            console.log("sending imagepath "+ imgName);
                            //Position
                            var imagePosition = docs[i].position;
                            imagePosition.z = imgName;
                            io.to(displayRX).emit("imagePosition", imagePosition);
                            
                        }
                    }
                });
                if (err) { console.log(err); }
            }
            if (err) { console.log(err); }
        });
        //Notification : X joined the team
        deviceParam.find({ team: { $ne: data.team_id }, sessionId: lastSessionTX, kind: 'display' }).exec(function(err, docs) {
            for (var i = 0; i < docs.length; i++) {
                var displayRX = docs[i].deviceId;
                io.to(displayRX).emit("notification", data.team_id+" joined the session.");
            }
            if (err) { console.log(err); }
        });
        
        // Remove QR from the Display
        
        
        // deviceParam.find({ team: { $ne: data.team_id }, sessionId: lastSessionTX, kind: 'display' }).exec(function(err, docs) {
        //     for (var i = 0; i < docs.length; i++) {
        //         // var displayRX = docs[i].deviceId;
        //         io.to(socket.id).emit("notification", data.team_id+ " is present.");
        //     }
        //     if (err) { console.log(err); }
        // });
        // if(err){console.log(err);} 
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
        var lastSessionTX = null;
        var teamNameTX = null;
        var displayRX = null;

        deviceParam.find({ deviceId: phoneTX }).exec(function(err, docs) {
            if (docs.length > 0) {
                teamNameTX = docs[docs.length - 1].team; // Current Team
                lastSessionTX = docs[docs.length - 1].sessionId; // Current Session

                console.log("teamNameTX " + teamNameTX + " lastSessionTX " + lastSessionTX);

                // find corresponding display
                deviceParam.find({ team: teamNameTX, sessionId: lastSessionTX, kind: 'display' }).exec(function(err, docs) {
                    if (docs.length != 0) {
                        console.log("corresponding display " + docs[docs.length - 1].deviceId);
                        displayRX = docs[docs.length - 1].deviceId;
                        var imgData = data.replace(/^data:image\/\w+;base64,/, "");
                        bufferImage = imgData;
                        // Send to all displays in session 
                        console.log("display RX " + displayRX);
                        io.to(displayRX).emit('activity', "postImage");
                        // io.to(displayRX).emit('image_path', "out_" + imgName + ".png");
                        // io.to(displayRX).emit('image_path', imgName);
                        // Send to rest of the displays
                        //----------------
                        // for (var i = 0; i < docs.length; i++) {
                        //     var displayRX = docs[i].deviceId; // corr display!!!!
                        
                            
                        //     // var imgData = data.replace(/^data:image\/\w+;base64,/, "");
                        //     // bufferImage = imgData;
                            
                        //     //  Write to file on server
                        //     imgName = Date.now();
                        //     filename = __dirname + "/public/images/out_" + imgName + ".png";
                        //     fs.writeFile(filename, imgData, 'base64', function(err) {
                        //         if (err) { console.log("error: " + err); }
                        //         // send it to every display on same team
                        //         console.log("socket image_path to "+ displayRX ) ;
                        //         io.to(displayRX).emit('image_path', "out_" + imgName + ".png");/// NOT BEING SENT 
                        //         // console.log(filename);
                        //         // bufferImagePath = filename;
                        //     });
                        //     // io.to(displayRX).emit("bufferImage", imgData);
                        // }
                         imgName = Date.now();
                         filename = __dirname + "/public/images/out_" + imgName + ".png";
                         fs.writeFile(filename, imgData, 'base64', function(err) {
                             if (err) {
                                 console.log("error: " + err);
                             }
                             // send it to every display on same team
                             
                             deviceParam.find({
                                 sessionId: lastSessionTX,
                                 kind: 'display'
                             }).exec(function(err, docs) {
                                 console.log("docs.length: " + docs.length); // Length is 2 
                                 imgName = "out_" + imgName + ".png";
                                 for (var i = 0; i < docs.length; i++) {
                                     displayRX = docs[i].deviceId; // same values?!
                                     console.log("disprx:" + displayRX);
                                     console.log("socket image_path to " + displayRX);
                                     io.to(displayRX).emit('image_path', imgName); /// NOT BEING SENT 
                        
                                     // io.to(displayRX).emit("bufferImage", imgData);
                                 }
                             });
                             // console.log(filename);
                             // bufferImagePath = filename;
                         });

                        //----------------------
                        
                        



                        zeroing = true;
                        io.to(displayRX).emit('createGrid', 'origin'); ////
                        if (err) { console.log(err); }
                    }
                });
                if (err) { console.log(err); }
            }

        });
        console.log(" Create GRID on ORIGIN");
    });

    socket.on("team_id", function(data) {
        console.log("teamid " + data);
    });

    socket.on("grab", function(data) {
        var phoneTX = socket.id;
        var lastSessionTX = null;
        var teamNameTX = null;
        var displayRX = null;

        deviceParam.find({
            deviceId: phoneTX
        }).exec(function(err, docs) {
            if (docs.length > 0) {
                teamNameTX = docs[docs.length - 1].team; // Current Team
                lastSessionTX = docs[docs.length - 1].sessionId; // Current Session

                console.log("teamNameTX " + teamNameTX + " lastSessionTX " + lastSessionTX);

                // find corresponding display
                deviceParam.find({
                    team: teamNameTX,
                    sessionId: lastSessionTX,
                    kind: 'display'
                }).exec(function(err, docs) {
                    if (docs.length != 0) {
                        console.log("corresponding display " + docs[docs.length - 1].deviceId);
                        displayRX = docs[docs.length - 1].deviceId;
                        zeroing = true;

                        switch (data) {
                            case 'pick':
                                io.to(displayRX).emit('activity', 'grabNote'); ////
                                break;

                            case 'release':
                                io.to(displayRX).emit('activity', 'releaseNote'); ////
                                break;

                            default:
                                // code
                        }


                        io.to(displayRX).emit('createGrid', 'origin'); ////
                        if (err) {
                            console.log(err);
                        }
                    }
                });
                if (err) {
                    console.log(err);
                }
            }
        });
        // console.log(" Create GRID on ORIGIN");
    });

    socket.on("gridCreated", function(data) {
        // console.log("SERVER: Grid created");
        var displayTX = socket.id;
        var lastSessionTX = null;
        var teamNameTX = null;
        var phoneRX = null;

        if (data == 'stop') {
            zeroing = false;
        };
        if (zeroing == true) {
            if (data == 'true') {
                setTimeout(function() {
                    // Delayed for exposure adjustment.
                    // Find corresponding phone socket id = phone rx
                    deviceParam.find({ deviceId: displayTX }).exec(function(err, docs) {
                        teamNameTX = docs[docs.length - 1].team;
                        lastSessionTX = docs[docs.length - 1].sessionId;
                        deviceParam.find({ team: teamNameTX, sessionId: lastSessionTX, kind: 'phone' }).exec(function(err, docs) {
                            // console.log("corresponding display " + docs[docs.length-1].deviceId);
                            phoneRX = docs[docs.length - 1].deviceId;
                            io.to(phoneRX).emit('findColor', 'findColor');
                        });
                    });
                }, 200);
            }
        };
    });
    socket.on("color", function(data) {
        // console.log("COLOR Recieved from Phone");
        // console.log(data);
        var phoneTX = socket.id;
        var lastSessionTX = null;
        var teamNameTX = null;
        var displayRX = null;

        rxColor = new avgColor(data.red, data.green, data.blue);
        var pos = calculatePosition();
        // console.log("Phone Position " + pos);
        // Send to corresponding display
        deviceParam.find({ deviceId: phoneTX }).exec(function(err, docs) {
            if (docs.length > 0) {
                teamNameTX = docs[docs.length - 1].team;
                lastSessionTX = docs[docs.length - 1].sessionId;
                // find corresponding display
                deviceParam.find({ team: teamNameTX, sessionId: lastSessionTX, kind: 'display' }).exec(function(err, docs) {
                    displayRX = docs[docs.length - 1].deviceId;
                    io.to(displayRX).emit('createGrid', pos);
                    if (err) { console.log(err); }
                });
                if (err) { console.log(err); }
            }
        });
    });

    socket.on("imagePosition", function(imagePosition) {
        // send to all displays.Except the sender
        var displayTX = socket.id;
        var lastSessionTX = null;
        var teamNameTX = null;
        var displayRX = null;
        deviceParam.find({ deviceId: displayTX }).exec(function(err, docs) {
            teamNameTX = docs[docs.length - 1].team;
            lastSessionTX = docs[docs.length - 1].sessionId;
            // find corresponding displays in other teams
            deviceParam.find({ team: { $ne: teamNameTX }, sessionId: lastSessionTX, kind: 'display' }).exec(function(err, docs) {
                for (var i = 0; i < docs.length; i++) {
                    var displayRX = docs[i].deviceId;
                    console.log("RX Img name: "+ imagePosition.z);
                    io.to(displayRX).emit("imagePosition", imagePosition);
                }
                if (err) { console.log(err); }
            });
            
            // filename = "out_" + imgName + ".png"; // Generating NUll
            filename = imgName;
            console.log("filename set to : " + filename);
            // filename = "out_" + imagePosition.z + ".png"; //File doesnot ex
            

            // Write the file to mongodb
            var newPost = new postParam({
                timestamp: Date.now(),
                sessionId: lastSessionTX,
                deviceId: socket.id,
                team: teamNameTX,
                position: {
                    x: imagePosition.x,
                    y: imagePosition.y,
                    z: imagePosition.z
                },
                noteName: imagePosition.z,
                filename: filename,
                previousPost: previousPostId
            });
            newPost.save(function(err) {
                if (err) console.log('Error on save!') });
            if (err) { console.log(err); }
        });
    });

    socket.on("grabPosition", function(imagePosition) {
        // send to all displays.Except the sender
        var displayTX = socket.id;
        var lastSessionTX = null;
        var teamNameTX = null;
        var displayRX = null;
        var minDistance = 100000000;
        var distance;
        var nearestNote = null;

        //  look for nearest note in same session
        // TX that to phone
        deviceParam.find({ deviceId: displayTX }).exec(function(err, docs) {
            lastSessionTX = docs[docs.length - 1].sessionId;

            postParam.find({ sessionId: lastSessionTX }).exec(function(err, docs) {
                console.log("docs.length: " + docs.length);
                for (var i = 0; i < docs.length; i++) {
                    var posts = docs[i].position;
                    ///find the nearest post
                    var x1 = imagePosition.x;
                    var x2 = docs[i].position.x;
                    var y1 = imagePosition.y;
                    var y2 = docs[i].position.y;

                    distance = Math.abs(Math.sqrt((x2 -= x1) * x2 + (y2 -= y1) * y2));
                    console.log("distance " + distance);
                    if (distance < minDistance) {
                        minDistance = distance;
                        //nearest note is docs[i]
                        nearestNote = docs[i].position.z;
                    }
                }
                console.log("Nearest Note: " + nearestNote);
                // docs[docs.length-1].activeNote = nearestNote;
                deviceParam.findOne({ deviceId: displayTX }, function(err, doc) {
                    doc.activeNote = nearestNote;
                    doc.save();
                });
                if (err) { console.log(err); }
            });
        });
    });

    socket.on("releasePosition", function(data) {
        var displayTX = socket.id;
        var lastSessionTX = null;
        var teamNameTX = null;
        var displayRX = null;
        var activeNote = null;
        console.log("releasing Note" + data);

        deviceParam.find({ deviceId: displayTX }).exec(function(err, docs) {
            lastSessionTX = docs[docs.length - 1].sessionId;
            activeNote = docs[docs.length - 1].activeNote;
            data.z = activeNote;
            console.log("active note = " + data.z); // INCORRECT
            //all Clients : move note
            deviceParam.find({ sessionId: lastSessionTX, kind: 'display' }).exec(function(err, docs) {
                for (var i = 0; i < docs.length; i++) {
                    var displayRX = docs[i].deviceId;
                    io.to(displayRX).emit("moveNote", data);
                    
                }
                if (err) { console.log(err); }
            });

            postParam.findOne({ noteName: activeNote }, function(err, doc) {
                doc.position.x = data.x;
                doc.position.y = data.y;
                doc.save();
                if (err) { console.log(err); }
            });


            // update position of the note in database

            // postParam.find({sessionId: lastSessionTX}).exec(function(err, docs) {
            //     console.log("docs.length: "+docs.length);
            //     for (var i = 0; i < docs.length; i++) {
            //         var posts = docs[i].position;
            //         ///find the nearest post
            //         var x1 = imagePosition.x;
            //         var x2 = docs[i].position.x;
            //         var y1 = imagePosition.y;
            //         var y2 = docs[i].position.y;

            //         distance = Math.abs(Math.sqrt( (x2-=x1)*x2 + (y2-=y1)*y2 ));
            //         console.log("distance "+distance);
            //         if (distance < minDistance){
            //             minDistance=distance;
            //             //nearest note is docs[i]
            //             nearestNote = docs[i].position.z;
            //         }
            //     }
            //     console.log("Nearest Note: "+ nearestNote);
            //     // Hide note
            //     // wait for phone release
            //     // reposition note

            //     // io.to(displayTX).emit("removeNote", nearestNote); //TEMP
            //     //Remove note from database as well
            //     if(err){console.log(err);}    
            // });
            // //make it active note for the team's display
            // docs[docs.length-1].activeNote = nearestNote;
        });


    });

    socket.on("phoneOrientation", function(data) {
        console.log(data);
       
        var phoneTX = socket.id;
        var lastSessionTX = null;
        var teamNameTX = null;
        var displayRX = null;

        deviceParam.find({ deviceId: phoneTX }).exec(function(err, docs) {
            if (docs.length > 0) {
                teamNameTX = docs[docs.length - 1].team; // Current Team
                lastSessionTX = docs[docs.length - 1].sessionId; // Current Session

                // find corresponding display
                deviceParam.find({ team: teamNameTX, sessionId: lastSessionTX, kind: 'display' }).exec(function(err, docs) {
                    if (docs.length != 0) {
                        console.log("corresponding display " + docs[docs.length - 1].deviceId);
                        displayRX = docs[docs.length - 1].deviceId;
                        io.to(displayRX).emit('pan',data);
                    }
                });
            }
        });
                                
    });
    
    socket.on("endSession", function(data) {
        var phoneTX = socket.id;
        var lastSessionTX = null;
        var teamNameTX = null;
        var displayRX = null;

        deviceParam.find({ deviceId: phoneTX }).exec(function(err, docs) {
            if (docs.length > 0) {
                teamNameTX = docs[docs.length - 1].team; // Current Team
                lastSessionTX = docs[docs.length - 1].sessionId; // Current Session

                // find corresponding display
                deviceParam.find({ team: teamNameTX, sessionId: lastSessionTX, kind: 'display' }).exec(function(err, docs) {
                    if (docs.length != 0) {
                        console.log("corresponding display " + docs[docs.length - 1].deviceId);
                        displayRX = docs[docs.length - 1].deviceId;
                        io.to(displayRX).emit('endSession',lastSessionTX);
                    }
                });
            }
        });
    });
    
    socket.on("recenter",function(data) {
        console.log(data);
        var phoneTX = socket.id;
        var lastSessionTX = null;
        var teamNameTX = null;
        var displayRX = null;

        deviceParam.find({ deviceId: phoneTX }).exec(function(err, docs) {
            if (docs.length > 0) {
                teamNameTX = docs[docs.length - 1].team; // Current Team
                lastSessionTX = docs[docs.length - 1].sessionId; // Current Session

                // find corresponding display
                deviceParam.find({ team: teamNameTX, sessionId: lastSessionTX, kind: 'display' }).exec(function(err, docs) {
                    if (docs.length != 0) {
                        console.log("corresponding display " + docs[docs.length - 1].deviceId);
                        displayRX = docs[docs.length - 1].deviceId;
                        io.to(displayRX).emit('recenter',lastSessionTX);
                    }
                });
            }
        });
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
    // console.log("parsedJSON.colorList.length" + parsedJSON.colorList.length);
    for (var i = 0; i < parsedJSON.colorList.length; i++) {
        // console.log("rxColor" + JSON.stringify(rxColor));
        // console.log("rxColor[1]" + rxColor[1]);
        // console.log("parsedJSON.colorList[i].r" + parsedJSON.colorList[i].r);
        delta = math.abs(rxColor.r - parsedJSON.colorList[i].r) + math.abs(rxColor.g - parsedJSON.colorList[i].g) + math.abs(rxColor.b - parsedJSON.colorList[i].b);
        // console.log("Delta" + delta);
        if (delta < minDelta) {
            calcColor = parsedJSON.colorList[i].color;
            // console.log("calcColor" + calcColor);
            minDelta = delta;
            position = i;
        }
    };
    // console.log(calcColor);
    return position;
}


function updateSessionStat (sessionId){
    // Bake CSV Data
    // Send socket File updated : filename
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