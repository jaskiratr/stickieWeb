var mongoose = require('mongoose');

var postSchema = new mongoose.Schema({
    timestamp: { type: Number },
    sessionId: { type: String },
    deviceId: { type: String },
    team: { type: String },
    position: {
        x: Number,
        y: Number,
        z: Number
    },
    noteName: { type: String },
    filename: { type: String },
    previousPost: { type: String }
});

var sessionSchema = new mongoose.Schema({
    timestamp: { type: Number },
    team: { type: String },
    sessionId: { type: String },
    deviceId: { type: String },
    kind: { type: String },
    activeNote: { type: String }
});

var postParam = mongoose.model('postCollection', postSchema );
var deviceParam = mongoose.model('sessionCollection',sessionSchema);

module.exports = {
    postParam: function() {return postParam},
    deviceParam: function() {return deviceParam}
};
