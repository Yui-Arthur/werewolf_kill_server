var express = require('express');
var bodyparser = require('body-parser');
var cors = require('cors');
var config = require('./conf');
var room = require('./routes/room');
var game = require('./routes/game');
var agent = require('./routes/agent');
var game_model = require('./models/game')
var room_model = require('./models/room')
var agent_model = require('./models/agent')
var app = express();



global.room_list = {};
global.game_list = {} 
global.game_timer = {}
global.grpc_server_check = {
    "timer" : setInterval(game_model.check_grpc_server , 60 * 1000),
    "status" : {
        "werewolf" : false,
        "agent" : false
    }
}
global.mapping_keywords = {}

// every 10 minutes check idel room
setInterval(room_model.delete_idel_room , 10 * 60 * 1000)

app.use(cors(config.corsOptions));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(room);
app.use(game);
app.use(agent);
app.use(express.static('views'))


app.listen(8001 , function(req , res ){
    console.log('node server is running...'); 
    console.log("-------------- Setting --------------")
    console.log(`  jwt setting : ${config.jwt_open}`)
    console.log(`  werewolf server : ${config.werewolf_server_ip}`)
    console.log(`  agent server : ${config.agent_server_ip}`)
    console.log(`  werewolf_realtime_vote_info : ${config.werewolf_realtime_vote_info}`)
    console.log("-------------------------------------")
    agent_model.build_key_words()
    game_model.check_grpc_server()
    room_model.delete_idel_room()
})