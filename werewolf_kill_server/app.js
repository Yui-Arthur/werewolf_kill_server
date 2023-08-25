var express = require('express');
var bodyparser = require('body-parser');
var cors = require('cors');
var config = require('./conf');
var room = require('./routes/room');
var game = require('./routes/game');
var game_model = require('./models/game')
var room_model = require('./models/room')
var app = express();



global.room_list = {
    "TESTROOM": {
        "room_name": "TESTROOM",
        "room_leader": "yui",
        "room_user": [
            "yui" , "pinyu" , "yeeecheng" , "sunny" , "a" , "b" , "c"
        ],
        "user_color" : [
            "#fda4af" , "#f9a8d4" , "#f0abfc" , "#d8b4fe" , "#c4b5fd" , "#818cf8" , "#93c5fd"
        ],
        "room_state" : "ready",
        "game_setting": config.default_setting[7],
        "last_used" : Date.now()
    }
};
global.game_list = {} 
global.game_timer = {}
global.grpc_server_check = {
    "timer" : setInterval(game_model.check_grpc_server , 30 * 1000),
    "status" : false
}

// every 10 minutes check idel room
setInterval(room_model.delete_idel_room , 10 * 60 * 1000)

app.use(cors(config.corsOptions));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(room);
app.use(game);
app.use(express.static('view'))


app.listen(8001 , function(req , res ){
    console.log('node server is running...'); 
    console.log("-------------- Setting --------------")
    console.log(`  jwt setting : ${config.jwt_open}`)
    console.log(`  grpc api server : ${config.grpc_server_ip}`)
    console.log(`  werewolf_realtime_vote_info : ${config.werewolf_realtime_vote_info}`)
    console.log("-------------------------------------")
    game_model.check_grpc_server()
    room_model.delete_idel_room()
})