var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken')
var config = require('../conf')
const saltRounds = 10;
var jwt_op = require('./jwt')
var randomstring = require("randomstring");

module.exports = {

    /**
     * create a new room
     * @param {string} user_name 
     * @returns {string , string} 
     */
    create_room : async function(user_name){
        var room_name = randomstring.generate({
            length: 8,
            capitalization : 'uppercase'
        });

        var user_token = await jwt_op.create_room_jwt(user_name , room_name , true)
        global.room_list[room_name] = {
            "room_name" : room_name,
            "room_leader" : user_name,
            "room_user" : [user_name],
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
    join_room : async function(user_name , room_name){
        if(!await this.check_room(room_name))
            return{status: false,  log:"room not found" , token : ""}    
        if(await this.is_full(room_name))
            return{status: false,  log:"room is full" , token : ""}    

        var user_token = await jwt_op.create_room_jwt(user_name , room_name , false)
        global.room_list[room_name]['room_user'].push(user_name)
    
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
    

    game_setting : async function(token , room_name , game_setting){

        token = token.replace('Bearer ', '')
        if(!await this.check_room(room_name))
            return {status: false , log: "room not found"}

        if(!await jwt_op.verify_room_jwt(token , room_name , true))
            return {status: false , log: "jwt error"}
        
        
        if(Object.keys(game_setting).sort().toString() != Object.keys(config.default_setting[8]).sort().toString())
            return {status: false , log: "game setting key error"}
        
        /** grpc check game setting **/
        var role_list = Array(5) 
        for (const [key, value] of Object.entries(game_setting)) 
        {
            if(config.indexToRole.hasOwnProperty(key))
                role_list[config.indexToRole[key]] = value
        }
        var grpc_result = true
        if(! grpc_result)
            return {status: false , log: "game setting srror"}
        /**********************************/  

        console.log(role_list)

        global.room_list[room_name]['game_setting'] = game_setting

        return {status: true,  log:"ok"}
        
    },

    start_game : async function(room_name , token){
        token = token.replace('Bearer ', '')
        if(!await this.check_room(room_name))
            return {status: false , log: "room not found"}

        if(!await jwt_op.verify_room_jwt(token , room_name , true))
            return {status: false , log: "jwt error"}

        global.room_list[room_name]['room_state'] = "started"
        return {status: true,  log:"ok"}
    }





}

// console.log(jwt_op.create_room_jwt("yui" , "TESTROOM" , true))