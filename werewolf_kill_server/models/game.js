var config = require('../conf')
var jwt_op = require('./jwt')
var room = require('./room')
var grpc = require('@grpc/grpc-js');
var werewolf_kill = require('./proto')


module.exports = {

    check_game_room : async function(room_name){
        return global.room_list.hasOwnProperty(room_name) && global.room_list[room_name]['room_state'] == "started"
    },

    get_vote_info: async function(room_name , current_stage , vote_func){
        // grpc vote_info func

        if(current_stage !=  global.game_list[room_name]['stage'])
            return

        const client = new werewolf_kill('localhost:50051', grpc.credentials.createInsecure());
        client.voteInfo({room_name: room_name , room_stage : global.game_list[room_name]['stage']} , function(err, result){
            if(err){
                console.log(err)
                setTimeout(vote_func , 1000 , room_name , current_stage , vote_func)
            }

            // console.log(result)
            for(const [idx , user_state] of result.state.entries()){
                if(user_state !=-1)
                    global.game_list[room_name]['vote_info'][idx] = user_state
            }
            if(current_stage ==  global.game_list[room_name]['stage'])
                setTimeout(vote_func, 1000 , room_name , current_stage , vote_func)
            else
                global.game_list[room_name]['vote_info'] = {}
        })
        
    },

    game_over : async function(room_name){
        delete global.game_list[room_name]
        global.room_list[room_name]['state'] = "ready"
    },

    next_stage : async function(room_name , stage_func , vote_func , game_over_func){
        // grpc next_stage func
        const client = new werewolf_kill('localhost:50051', grpc.credentials.createInsecure());
        client.nextStage({room_name: room_name , room_stage : global.game_list[room_name]['stage']} , function(err, result) {
            
            if(err){
                console.log(err)
                return 
            }
            // clear prev announcement & information
            global.game_list[room_name]['information'].length = 0
            global.game_list[room_name]['announcement'].length = 0

            // set game stage
            global.game_list[room_name]['stage'] = result['stage_name']
            

            var timer = 5000
            // stage proccess
            for(var [index , user_stage] of result['stage'].entries()){
                // died & chat & role_info => announcement
                if(Array('died' , 'chat' , 'role_info').includes(user_stage["operation"])){

                    // seer role_info description
                    if(user_stage["operation"] == 'role_info'){
                        user_stage["description"] = user_stage["description"] == "0" ? `${user_stage['target']}是壞人` : `${user_stage['target']}是好人`
                    }
                    

                    global.game_list[room_name]['announcement'].push({
                        'user' : user_stage["operation"] == 'role_info' ? user_stage['target'] : user_stage["user"],
                        'operation' : user_stage["operation"],
                        'description' : user_stage["description"],
                        'allow' : user_stage["operation"] == 'role_info' ? user_stage["user"] : -1
                    })
                    // if someone died => user_state = died
                    if(user_stage["operation"] == "died"){
                        for(const [idx , user] of user_stage['user'].entries()){
                            global.game_list[room_name]['player'][user]['user_state'] = "died"
                        }
                    }
                }
                // vote & dialogue
                else if(Array('vote' , 'vote_or_not' , 'dialogue' , 'role_info').includes(user_stage["operation"])){
                    global.game_list[room_name]['information'].push(user_stage)
                    
                    timer = user_stage["operation"] == "dialogue" ? global.game_list[room_name]['dialogue_time'] : global.game_list[room_name]['operation_time']
    
                    if(user_stage["operation"] == "vote")
                        setTimeout(vote_func , 1000 , room_name , global.game_list[room_name]['stage'] , vote_func)
                }
                else{
                    // console.log(user_stage)
                    timer = -1    
                    global.game_list[room_name]['announcement'].push({
                        'user' : [],
                        'operation' : "game_over",
                        'description' : user_stage["description"],
                        'allow' : -1
                    })
                    global.game_list[room_name]['information'].length = 0    
                    break
                }
            }
            console.log(result)
            // console.log(global.game_list[room_name]['information'])
            // console.log(global.game_list[room_name]['announcement'])
            

            if(timer != -1)
                setTimeout(stage_func , timer * 1000, room_name , stage_func , vote_func , game_over_func) 
                // setTimeout(stage_func , timer * 500, room_name , stage_func , vote_func , game_over_func) 
            else
                setTimeout(game_over_func , 60 * 1000 , room_name) 

        });

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
        var vote_info = {}
        console.log(user_id)
        for( const [index , user_stage] of global.game_list[room_name]["information"].entries()){
            if(user_stage['user'].includes(user_id) || global.game_list[room_name]['player'][user_id]['user_state'] == "died"){
                information.push(user_stage)

                if(user_stage['operation'] == "vote")
                    vote_info = global.game_list[room_name]['vote_info']
            }
        }

        var announcement = []
        for( const [index , user_stage] of global.game_list[room_name]["announcement"].entries()){
            if(user_stage['allow'] == user_id || user_stage['allow'] == -1 || global.game_list[room_name]['player'][user_id]['user_state'] == "died")
                announcement.push({
                    'user' : user_stage["user"],
                    'operation' : user_stage["operation"],
                    'description' : user_stage["description"],
                })
            
        }

        var info = {
            stage : global.game_list[room_name]['stage'],
            announcement : announcement,
            information : information,
            vote_info : vote_info,
            player_position : await this.get_player_position(room_name),
        }
        
        return {status: true, player_info : info , log:"ok"}
    },

    check_operation : async function(room_name , user_id , target , operation , stage){

        if(global.game_list[room_name]['stage'] != stage && global.game_list[room_name]['player']['user_state'] == 'died')
            return false


        for( const [index , user_stage] of global.game_list[room_name]["information"].entries()){
            if(user_stage['user'].includes(user_id) && user_stage['operation'] == operation && user_stage['target'].includes(target))
                return true
                
        }

        return false

    },

    send_player_operation : async function(room_name, user_name , token , operation , route_back){
        token = token.replace('Bearer ', '')

        if(!await this.check_game_room(room_name))
            return route_back({status: false,  log:"room not found or game is not started"}) 

        if(!await jwt_op.verify_room_jwt(token , room_name , false , user_name) && !await jwt_op.verify_room_jwt(token , room_name , true, user_name))
            return route_back({status: false,  log:"jwt error"})

        var user_id = global.room_list[room_name]['room_user'].indexOf(user_name);

        if(user_id <= -1)
            return route_back({status: false , log: "user name error"})

        // console.log(global.game_list[room_name])
        global.game_list[room_name]['player'][user_id]['user_position'] = operation["position"]
        if(operation['operation'] != "None"){
            if(! await this.check_operation(room_name , user_id , operation['target'] ,operation['operation'] , operation['stage_name']))
            return  route_back({status : false , log : "operation error"})
            
            const client = new werewolf_kill('localhost:50051', grpc.credentials.createInsecure());
            user_operation = {
                user : user_id,
                operation : operation['operation'],
                target : operation['target'],
                chat : operation['chat'],
                room : {
                    stage_name : operation['stage_name'],
                    room_name : room_name,

                }
                
                
            }
            // console.log(user_operation)

            client.sendUserOperation(user_operation , function(err , response){
                if(err)
                    return route_back({status: false,  log:"grpc error"})
                else if(response.result)
                    return route_back({status: true,  log:"ok"})
                else
                    return route_back({status: false,  log:"grpc operation false"})
            })
        }

        

    }






}
