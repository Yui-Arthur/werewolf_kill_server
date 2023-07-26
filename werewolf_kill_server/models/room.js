var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken')
var config = require('../conf')
const saltRounds = 10;
var jwt_op = require('./jwt')
var randomstring = require("randomstring");

module.exports = {

    /**
     * 
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
            "game_setting" : {
                "player_num" : 7,
            }
        };

        return [room_name , user_token];
    },
    check_room : async function(room_name){
        return global.room_list.hasOwnProperty(room_name)
    },
    join_room : async function(user_name , room_name){
        var user_token = await jwt_op.create_room_jwt(user_name , room_name , false)
        global.room_list[room_name]['room_user'].push(user_name)
    
        return user_token;
    },

    quit_room : async function(room_name , user_name , token){
        token = token.replace('Bearer ', '')
        console.log(await jwt_op.verify_room_jwt(token , room_name , false , user_name))
        console.log(await jwt_op.verify_room_jwt(token , room_name , true))
        if(await jwt_op.verify_room_jwt(token , room_name , false , user_name)){
            var index = global.room_list[room_name]['room_user'].indexOf(user_name);
            if(index > -1){
                global.room_list[room_name]['room_user'].splice(index, 1)
                return true
            }
            else
                return false
            

        }
        else if(await jwt_op.verify_room_jwt(token , room_name , true)){
            var index = global.room_list[room_name]['room_user'].indexOf(user_name);
            if(index > -1){
                global.room_list[room_name]['room_user'].splice(index, 1)
                return true
            }
            else
                return false
        }
        else    
            return false
        
    },

    is_full : async function(room_name){
        return  global.room_list[room_name]['room_user'].length == global.room_list[room_name]['game_setting']['player_num']
    },

    game_setting : async function(token , room_name , game_setting){
        token = token.replace('Bearer ', '')
        if(!await jwt_op.verify_room_jwt(token , room_name , true))
            return false
        
        global.room_list[room_name]['game_setting'] = game_setting

        return true
    }



}

// console.log(jwt_op.create_room_jwt("yui" , "TESTROOM" , true))