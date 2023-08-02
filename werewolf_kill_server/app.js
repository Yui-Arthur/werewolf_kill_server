var express = require('express');
var bodyparser = require('body-parser');
var cors = require('cors');
var config = require('./conf');
var room = require('./routes/room');
var game = require('./routes/game');
var app = express();

global.room_list = {
    "TESTROOM": {
        "room_name": "TESTROOM",
        "room_leader": "yui",
        "room_user": [
            "yui" , "pinyu" , "yeeecheng" , "sunny" , "a" , "b" ,"c"
        ],
        "user_color" : [
            "#96c4c3" , "#a0c9c9" , "#abcfcf" , "#b5d5d5" , "#c0dbdb" , "#cae1e1" , "#d5e7e7"
        ],
        "room_state" : "ready",
        "game_setting": config.default_setting[7],
    }
};

global.game_list = {} 
global.game_timer = {}

app.use(cors(config.corsOptions));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(room);
app.use(game);
app.use(express.static('view'))


app.listen(8001 , function(req , res ){
    console.log('node server is running...'); 
})