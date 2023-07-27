var express = require('express');
var bodyparser = require('body-parser');
var cors = require('cors');
var config = require('./conf');
var room = require('./routes/room');
var app = express();

global.room_list = {
    "TESTROOM": {
        "room_name": "TESTROOM",
        "room_leader": "yui",
        "room_user": [
            "yui"
        ],
        "room_state" : "ready",
        "game_setting": config.default_setting[7]
        
    }
};

app.use(cors(config.corsOptions));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(room)
app.use(express.static('view'))


app.listen(8001 , function(req , res ){
    console.log('node server is running...'); 
})