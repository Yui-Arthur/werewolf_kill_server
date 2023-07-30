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
            "#111111" , "#222222" , "#333333" , "#444444" , "#555555" , "#666666" , "#777777"
        ],
        "room_state" : "ready",
        "game_setting": config.default_setting[7],
    }
};

global.game_list = {
    "TESTROOM" : {
        "player" :{
            0 : {
                "user_name" : "yui",
                "user_role" : "seer" ,
                "state" : "alive"      
            },
    
            1 : {
                "user_name" : "pinyu",
                "user_role" : "village" ,         
                "state" : "alive",
            },
        },
        

        "current_operation" : []
    }
} 

app.use(cors(config.corsOptions));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(room);
app.use(game);
app.use(express.static('view'))


app.listen(8001 , function(req , res ){
    console.log('node server is running...'); 
})