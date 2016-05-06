var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
mongoose.connect('mongodb://' + process.env.IP + '/postdb'); // DOUBLE CHECK

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    // we're connected!
    console.log("we're connected!");
});

var params = require('../mongo_models.js');
var postParam = new params.postParam();
var deviceParam = new params.deviceParam();
// var postParam = mongoose.model('postCollection', new schemas.postSchema());
// var deviceParam = mongoose.model('sessionCollection',new schemas.sessionSchema());
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {title: 'Stickie', sessionId: Math.floor(Math.random()*90000) + 10000});
});


router.route('/api/:sessionId').get(function(req, res) {
    var lastSessionTX = req.params.sessionId;
    postParam.find({ sessionId: lastSessionTX }).exec(function(err, docs) {
        // var data = [];
        if (docs.length != 0) {
            for(var i in docs)
            {   
                 docs[i].noteName = (parseInt(i)+1);
            }
            // console.log(data);
            res.json(docs);
        }
    });
    // res.json({ message: 'hooray! welcome to our api!' });   
});
router.route('/data/:sessionId').get(function(req, res) {
    var lastSessionTX = req.params.sessionId;
    postParam.find({ sessionId: lastSessionTX }).exec(function(err, docs) {
        // var data = [];
        if (docs.length != 0) {
            for(var i in docs)
            {   
                //  docs[i].noteName = (parseInt(i)+1);
            }
            // console.log(data);
            res.json(docs);
        }
    });
    // res.json({ message: 'hooray! welcome to our api!' });   
});

    


router.get('/stats=*', function(req, res) {
    var str = req.url;
    var lastSessionTX = str.split('=')[1];
    res.render('stats', {title: 'Stickie', sessionId: lastSessionTX});
});

// Get session
router.get('/*', function(req, res) {
    // console.log("New Session " + (req.originalUrl).slice(1));
    res.render('session', { title: (req.originalUrl).slice(1) });
});



// router.get('/session', function(req, res) {
//     // console.log("New Session " + (req.originalUrl).slice(1));
//     // console.log("SessionID " +req.params.sessionId);
//     // console.log("TEAMID " +req.params.teamName);
//     res.render('session', { title: (req.originalUrl).slice(1) });
    
// });

// Get session + teamname
// router.get('/:teamName/:sessionId', function(req, res) {
//     // console.log("New Session " + (req.originalUrl).slice(1));
//     console.log("SessionID " +req.params.sessionId);
//     console.log("TEAMID " +req.params.teamName);
//     res.render('session', { title: (req.originalUrl).slice(1) });
// });


// router.get('/team1', function(req, res) {
//     res.render('teamName', { title: 'team1' });
// });


// router.get('/team2', function(req, res) {
//     res.render('teamName', { title: 'team2' });
// });

module.exports = router;
