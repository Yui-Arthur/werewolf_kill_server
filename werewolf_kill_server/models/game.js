var config = require('../conf')
var jwt_op = require('./jwt')
var room = require('./room')
var game = require('./game')

module.exports = {

    check_game_room : async function(room_name){
        return global.room_list.hasOwnProperty(room_name) && global.room_list[room_name]['room_state'] == "started"
    },

    get_vote_info: async function(room_name , current_stage){
        // grpc vote_info func
        var grpc_return = [-1,1,2,-1,4,3,1]
        global.game_list[room_name]['vote_info'] = grpc_return

        if(current_stage ==  global.game_list[room_name]['stage'])
            setTimeout(this._onTimeout , 1000 , room_name , current_stage )
        else
            global.game_list[room_name]['vote_info'] = Array(global.game_list).fill(0)
    },

    game_over : async function(room_name){
        delete global.game_list[room_name]
        global.room_list[room_name]['state'] = "ready"
    },

    next_stage : async function(room_name , vote_func , game_over_func){
        // grpc next_stage func

        var grpc_return = {
            user_stages : [
                {
                    user : [0,1,2,3,4],
                    operation : "vote",
                    target : [0,1,2,3,4],
                    description : "狼人投票",
                },
                {
                    user : [1,4],
                    operation : "died",
                    target : [],
                    description : "被票出去",
                },
                
            ],

            stage_name : ""
        }
        
        var timer = 0
        global.game_list[room_name]['information'].length = 0
        for(const [index , user_stage] of grpc_return['user_stages'].entries()){
            // console.log(user_stage)
            if(Array('died' , 'chat').includes(user_stage["operation"])){
                global.game_list[room_name]['information'].push({
                    'allow' : Array(global.game_list[room_name]['player_num']).fill(0).map((n, i) => n + i),
                    ...user_stage
                })
            }
            else if(Array('vote' , 'vote_or_not' , 'dialogue').includes(user_stage["operation"])){
                global.game_list[room_name]['information'].push({
                    'allow' : user_stage['user'],
                    ...user_stage
                })
                timer = user_stage["operation"] == "dialogue" ? global.game_list[room_name]['dialogue_time'] : global.game_list[room_name]['operation_time']

                if(user_stage["operation"] == "vote")
                    setTimeout(vote_func , 1000 , room_name , global.game_list[room_name]['stage'])
            }
            else
                timer = -1            
        }
        // console.log(timer , game.next_stage )
        if(timer != -1)
            // global.game_list[room_name]['timer'] = setTimeout(this._onTimeout , timer * 1000, room_name) 
            setTimeout(this._onTimeout , timer * 1000, room_name , vote_func , game_over_func) 
        else
            game_over_func(game_name)
        
    },

    get_role: async function(room_name , user_name , token){
        token = token.replace('Bearer ', '')

        if(!await this.check_game_room(room_name))
            return{status: false,  log:"room not found or game is not started" }  

        if(!await jwt_op.verify_room_jwt(token , room_name , false , user_name) && !await jwt_op.verify_room_jwt(token , room_name , true, user_name))
            return{status: false,  log:"jwt error"}
        
        var index = global.room_list[room_name]['room_user'].indexOf(user_name);

        if(index <= -1)
            return {status: false , log: "user name error"}
            
        return {status: true, game_info : global.game_list[room_name]['player'][index] , player_id : index , log:"ok"}
    },

    get_player_position : async function(room_name){
        var player_position = Array(global.game_list[room_name]['player_num'])
        for(const [player_id, player_info] of Object.entries(global.game_list[room_name]['player'])){
            player_position[player_id] = player_info["user_position"]
        }

        return player_position
    },

    get_information : async function(room_name, user_name , token){
        token = token.replace('Bearer ', '')

        if(!await this.check_game_room(room_name))
            return{status: false,  log:"room not found or game is not started"}  

        if(!await jwt_op.verify_room_jwt(token , room_name , false , user_name) && !await jwt_op.verify_room_jwt(token , room_name , true, user_name))
            return{status: false,  log:"jwt error"}

        var user_id = global.room_list[room_name]['room_user'].indexOf(user_name);

        if(user_id <= -1)
            return {status: false , log: "user name error"}

        var information = []
        for( const [index , user_stage] of global.game_list[room_name]["information"].entries()){
            if(user_stage['allow'].includes(user_id))
                information.push(user_stage)
        }
        
        

        return {status: true, information : information , player_position : await this.get_player_position(room_name) , log:"ok"}
    },

    check_operation : async function(room_name , user_id , target , operation , stage){

        if(global.game_list[room_name]['stage'] != stage)
            return false


        for( const [index , user_stage] of global.game_list[room_name]["information"].entries()){
            if(user_stage['allow'].includes(user_id) && user_stage['operation'] == operation && user_stage['allow'].includes(target))
                return true
                
        }

        return false

    },

    send_player_operation : async function(room_name, user_name , token , operation){

        token = token.replace('Bearer ', '')

        if(!await this.check_game_room(room_name))
            return{status: false,  log:"room not found or game is not started"}  

        if(!await jwt_op.verify_room_jwt(token , room_name , false , user_name) && !await jwt_op.verify_room_jwt(token , room_name , true, user_name))
            return{status: false,  log:"jwt error"}

        var user_id = global.room_list[room_name]['room_user'].indexOf(user_name);

        if(user_id <= -1)
            return {status: false , log: "user name error"}

        global.game_list[room_name]['player'][user_id]['user_position'] = operation["position"]

        if(operation['operation'] != "None"){
            if(! await this.check_operation(room_name , user_id , operation['target'] ,operation['operation'] , operation['stage_name']))
                return {status : false , log : "operation error"}

            user_operation = {
                user_id : user_id,
                operation : operation['operation'],
                target : operation['target'],

                stage_name : operation['stage_name'],
                room_name : room_name,

            }
        }

        return{status: true,  log:"ok"}

    }






}
