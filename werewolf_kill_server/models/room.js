var config = require('../conf')
var jwt_op = require('./jwt')
var game = require('./game')
var grpc = require('@grpc/grpc-js');
var werewolf_kill = require('./proto')
var randomstring = require("randomstring");
var fs = require('fs');

function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

function formatDate(date) {
    // console.log(date);
    return (
        [
        date.getFullYear(),
        padTo2Digits(date.getMonth() + 1),
        padTo2Digits(date.getDate()),
        ].join('-') +
        '_' +
        [
        padTo2Digits(date.getHours()),
        padTo2Digits(date.getMinutes()),
        padTo2Digits(date.getSeconds()),
        ].join('_')
    );
}
function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = {

    /**
     * create a new room
     * @param {string} user_name 
     * @returns {string , string} 
     */
    create_room : async function(user_name , user_color){
        var room_name = randomstring.generate({
            length: 8,
            capitalization : 'uppercase'
        });

        var user_token = await jwt_op.create_room_jwt(user_name , room_name , true)
        global.room_list[room_name] = {
            "room_name" : room_name,
            "room_leader" : user_name,
            "room_user" : [user_name],
            "user_color" : [`#${user_color}`],
            "room_state" : "ready",
            "game_setting" : config.default_setting[7]
        };

        return [room_name , user_token];
    },
    /**
     * check the room is exist or not
     * @param {string} room_name 
     * @returns {boolean}
     */
    check_room : async function(room_name){
        return global.room_list.hasOwnProperty(room_name) && global.room_list[room_name]['room_state'] != "started"
    },
    /**
     * join a room
     * @param {string} user_name 
     * @param {string} room_name 
     * @returns 
     */
    join_room : async function(user_name , room_name , user_color){
        if(!await this.check_room(room_name))
            return{status: false,  log:"room not found" , token : ""}    
        if(await this.is_full(room_name))
            return{status: false,  log:"room is full" , token : ""}    

        var user_token = await jwt_op.create_room_jwt(user_name , room_name , false)
        global.room_list[room_name]['room_user'].push(user_name)
        global.room_list[room_name]['user_color'].push(`#${user_color}`)
    
        return{status: true,  log:"ok" , token : user_token}
    },

    quit_room : async function(room_name , user_name , token){
        token = token.replace('Bearer ', '')

        if(!await this.check_room(room_name))
            return {status: false , log: "room not found"}
        // leader quit room
        if(await jwt_op.verify_room_jwt(token , room_name , true , user_name)){
            delete global.room_list[room_name]
            return {status: true,  log:"ok"}
        }   
        // user quit room
        else if(await jwt_op.verify_room_jwt(token , room_name , false , user_name)){
            var index = global.room_list[room_name]['room_user'].indexOf(user_name);
            if(index > -1){
                global.room_list[room_name]['room_user'].splice(index, 1)
                global.room_list[room_name]['user_color'].splice(index, 1)
                return {status: true,  log:"ok"}
            }
            else
                return {status: false , log: "user name error"}
            
        }
        // leader kick someoune out
        else if(await jwt_op.verify_room_jwt(token , room_name , true)){
            var index = global.room_list[room_name]['room_user'].indexOf(user_name);
            if(index > -1){
                global.room_list[room_name]['room_user'].splice(index, 1)
                global.room_list[room_name]['user_color'].splice(index, 1)
                return {status: true,  log:"ok"}
            }
            else
            return {status: false , log: "user name error"}
        }
        else    
            return {status: false , log: "jwt error"}
        
    },

    is_full : async function(room_name){
        return  global.room_list[room_name]['room_user'].length == global.room_list[room_name]['game_setting']['player_num']
    },

    change_player_number : async function(token , room_name , user_number){
        token = token.replace('Bearer ', '')
        if(!await this.check_room(room_name))
            return {status: false , log: "room not found"}

        if(!await jwt_op.verify_room_jwt(token , room_name , true))
            return {status: false , log: "jwt error"}
        
        if(!config.default_setting.hasOwnProperty(user_number))
            return {status: false , log: "player number error"}
        
        global.room_list[room_name]['game_setting'] = config.default_setting[user_number]

        return {status: true,  log:"ok"}
    },
    

    game_setting : async function(token , room_name , game_setting , route_back) {

        token = token.replace('Bearer ', '')
        if(!await this.check_room(room_name))
            return route_back({status: false , log: "room not found"})

        if(!await jwt_op.verify_room_jwt(token , room_name , true))
            return route_back({status: false , log: "jwt error"})
        
        
        if(Object.keys(game_setting).sort().toString() != Object.keys(config.default_setting[8]).sort().toString())
            return route_back({status: false , log: "game setting key error"})
        
        /** grpc check game setting **/
        var role_list = Array(5) 
        var sum = 0
        for (const [key, value] of Object.entries(game_setting)) 
        {
            if(config.roleToIndex.hasOwnProperty(key))
                role_list[config.roleToIndex[key]] = value , sum += value
        }

        if(sum != game_setting['player_num'])
            return route_back({status: false , log: "player num and role num not equal"})

        const client = new werewolf_kill(config.grpc_server_ip, grpc.credentials.createInsecure());
        client.checkRoleList({role : role_list, room_name : room_name}, function (err, response) {
            // console.log(response)
            if(err){
                // console.log(err);
                return route_back({status: false , log: "grpc srror"})
            }
            else if(! response['result']){
                // console.log(response.result)
                return route_back({status: false , log: "game setting srror"})
            }
            else{
                global.room_list[room_name]['game_setting'] = game_setting
                return route_back({status: true,  log:"ok"})
                // return
            }
                
        })
        
        /**********************************/  
        
    },

    start_game : async function(room_name , token , route_back){
        token = token.replace('Bearer ', '')
        if(!await this.check_room(room_name))
            return route_back({status: false , log: "room not found"})

        if(!await jwt_op.verify_room_jwt(token , room_name , true))
            return route_back({status: false , log: "jwt error"})

        if(global.room_list[room_name]['room_user'].length != global.room_list[room_name]['game_setting']['player_num'])
            return route_back({status: false , log: "number of people error"})
            
            
            
        // set check grpc server
        game.check_grpc_server()
        var retries = 20
        while(! global.grpc_server_check['status']){
            retries --
            await sleep(1000)
            console.log("grpc server is not available , retrying")
            
            if(retries == 0){
                console.log("grpc server is error , end game")
                return route_back({status: false,  log:"grpc server is not available"})
            }
        }
            
        // game setting
        var role_list = Array(5) 
        for (const [key, value] of Object.entries(global.room_list[room_name]["game_setting"])) 
        {
            if(config.roleToIndex.hasOwnProperty(key))
            role_list[config.roleToIndex[key]] = value
        }
            
    
        /** grpc game start**/
        
        const client = new werewolf_kill(config.grpc_server_ip, grpc.credentials.createInsecure());
        client.startGame({role : role_list, room_name : room_name}, function (err, response){

            if(err)
                return route_back({status: false , log: "grpc error"})
            
            global.game_list[room_name] = {
                'stage' : "check_role",
                'stage_description' : "遊戲開始，請查看身分",
                'announcement' : [],
                'information' : [],
                'timer' : config.announcementWaitTime,
                'vote_info' : {},
                'empty' : 0,
                'player_num' : global.room_list[room_name]['game_setting']['player_num'],
                'operation_time' : global.room_list[room_name]['game_setting']['operation_time'],
                'dialogue_time' : global.room_list[room_name]['game_setting']['dialogue_time'],
                'start_time' : Date.now(),
                'log_file' :  "",
                'player' : {},
                'died' : [],
            }

            // set init timer
            global.game_timer[room_name] = {
                timer : setTimeout(game.next_stage , config.announcementWaitTime  * 1000 , room_name , game.next_stage , game.get_vote_info , game.game_over),
                end_time : Date.now() + config.announcementWaitTime  * 1000
            }
            
            // create log file
            global.game_list[room_name]['log_file'] = `./game_logs/${room_name}_${formatDate(new Date(global.game_list[room_name]['start_time']))}.log`
            fs.writeFileSync(global.game_list[room_name]["log_file"] , "")
            
            // init user info
            for( const [idx, user_name] of global.room_list[room_name]['room_user'].entries()){
                global.game_list[room_name]['player'][idx] = {
                    "user_name" : user_name,
                    "user_role" : config.indexToRole[response['role'][idx]],
                    "user_state" : "alive", 
                    "user_position" : [0,0],
                    "operation" : {},
                }
            }

            // set grpc server check timer
            if(global.grpc_server_check['timer'] == null)
                global.grpc_server_check['timer'] = setInterval(game.check_grpc_server , 10 *1000)
            
            global.room_list[room_name]['room_state'] = "started"

            return route_back({status: true,  log:"ok"})
        })

    },
   

}

// console.log(jwt_op.create_room_jwt("yui" , "TESTROOM" , true))
// console.log(jwt_op.create_room_jwt("pinyu" , "TESTROOM" , true))
// console.log(jwt_op.create_room_jwt("yeeecheng" , "TESTROOM" , true))
// console.log(jwt_op.create_room_jwt("sunny" , "TESTROOM" , true))
// console.log(jwt_op.create_room_jwt("a" , "TESTROOM" , true))
// console.log(jwt_op.create_room_jwt("b" , "TESTROOM" , true))
// console.log(jwt_op.create_room_jwt("c" , "TESTROOM" , true))