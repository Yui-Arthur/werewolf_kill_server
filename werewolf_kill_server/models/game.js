var config = require('../conf')
var jwt_op = require('./jwt')
var room = require('./room')
var grpc = require('@grpc/grpc-js');
var werewolf_kill = require('./proto')
var fs = require('fs');


function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = {

    check_game_room : async function(room_name){
        return global.game_list.hasOwnProperty(room_name) && global.room_list[room_name]['room_state'] == "started"
    },

    check_grpc_server : async function(){
        const client = new werewolf_kill(config.grpc_server_ip, grpc.credentials.createInsecure());
        client.checkRoleList({role : [0,0,0,0,0], room_name : "1234"}, function (err, response) {
            if(err){
                global.grpc_server_check['status'] = 0
                console.log(`[${new Date(Date.now())}] - grpc server is not available`) 
            }
            else{
                global.grpc_server_check['status'] = 1
                console.log(`[${new Date(Date.now())}] - grpc server is running`) 
            }
        })

    },

    get_vote_info: async function(room_name , current_stage , vote_func){
        // grpc vote_info func

        if(current_stage !=  global.game_list[room_name]['stage'])
            return


        const client = new werewolf_kill(config.grpc_server_ip, grpc.credentials.createInsecure());
        client.voteInfo({room_name: room_name , room_stage : global.game_list[room_name]['stage']} , function(err, result){
            if(err){
                console.log(err)
                // setTimeout(vote_func , 1000 , room_name , current_stage , vote_func)
            }

            for(const [idx , user_state] of result.state.entries()){
                if(user_state !=-1)
                    global.game_list[room_name]['vote_info'][idx] = user_state
            }

            if(current_stage ==  global.game_list[room_name]['stage'])
                setTimeout(vote_func, 1000 , room_name , current_stage , vote_func)
                
        })
        
    },

    skip_stage : async function(room_name , stage_name , token , user_name){
        token = token.replace('Bearer ', '')

        if(!await this.check_game_room(room_name))
            return{status: false,  log:"room not found or game is not started"}  

        if(! global.grpc_server_check['status'])
            return{status: false,  log:"grpc server is not available"}      

        if(!await jwt_op.verify_room_jwt(token , room_name , false , user_name))
            return{status: false,  log:"jwt error"}

        // if(global.game_list[room_name]["stage"] != stage_name)
        //     return {status: false,  log:"stage error"}

        // for(const [user_id , value] of Object.entries(global.game_list[room_name]['player'])){
        //     for(const [user_operation, op_flag] of Object.entries(value['operation'])){
        //         if(op_flag == 0)
        //             return {status: false,  log:"not all users ready"}
        //     }

        // }

        // if(global.game_list[room_name]["stage"] != stage_name)
        //     return {status: false,  log:"stage error"}


        if(global.game_timer[room_name]['end_time'] - Date.now() <= Math.abs(5000))
            return {status: false,  log:"timer less then 5 seconds , please wait"}

        clearTimeout(global.game_timer[room_name]['timer'])
        global.game_timer[room_name]['end_time'] = Date.now()
        this.next_stage(room_name , this.next_stage , this.get_vote_info , this.game_over)


        var data = JSON.stringify({
            "timestamp" : (Date.now() - global.game_list[room_name]['start_time'])/1000 ,
            "skip" : "skip"
        });
        fs.appendFileSync(global.game_list[room_name]['log_file'], data + "\n");

        return{status: true,  log:"ok"}
    },

    game_over : async function(room_name){
        // game over del all game info
        delete global.game_list[room_name]
        delete global.game_timer[room_name]
        // reset the room state
        global.room_list[room_name]['room_state'] = "ready"

        console.log(`${room_name} game over`)
        // if no running game room => timer to 30s
        if(Object.keys(global.game_list).length == 0){
            var check_func = global.grpc_server_check['timer']._onTimeout
            clearInterval(global.grpc_server_check['timer'])
            console.log("no running game room , grpc check timer resume 30s")
            global.grpc_server_check['timer'] = setInterval(check_func , 30 * 1000)
        }
    },

    next_stage : async function(room_name , stage_func , vote_func , game_over_func){

        if(!global.game_list.hasOwnProperty(room_name))
            return
        // vote result stage
        if(Array('vote1' , 'vote2').includes(global.game_list[room_name]['stage'].split('-')[2])){
            global.game_list[room_name]['empty'] = 2
            global.game_list[room_name]['prev_vote'] = global.game_list[room_name]['vote_info']
        }
        else
            global.game_list[room_name]['empty'] = 0

        // set died state
        for(const user of global.game_list[room_name]['died']){
            global.game_list[room_name]['player'][user]['user_state'] = "died"
        }
        
        // check grpc server
        var retries = 20
        while(! global.grpc_server_check['status']){
            retries --
            await sleep(1000)
            console.log("grpc server is not available , retrying")

            if(retries == 0){
                console.log("grpc server is error , end game")
                game_over_func(room_name)
            }
        }
        
        // grpc next_stage func
        const client = new werewolf_kill(config.grpc_server_ip, grpc.credentials.createInsecure());
        client.nextStage({room_name: room_name , room_stage : global.game_list[room_name]['stage']} , function(err, result) {
            
            if(err){
                console.log(err)
                return 
            }
            try {
                // clear prev announcement & information
                global.game_list[room_name]['information'].length = 0
                global.game_list[room_name]['announcement'].length = 0
                global.game_list[room_name]['vote_info'] = {}
                global.game_list[room_name]['died'] = []
                // reset player operation
                for(var [user_id , value]  of Object.entries(global.game_list[room_name]["player"])){
                    value['operation'] = {}
                }

                // set game stage
                global.game_list[room_name]['stage'] = result['stage_name']
                global.game_list[room_name]['stage_description']  = config.stageToDescription[result['stage_name'].split('-')[2]]

                var timer = 5
                var wait_time = 0
                
                
                // stage proccess
                for(var [index , user_stage] of result['stage'].entries()){
                    // died & chat & role_info => announcement
                    if(Array('died' , 'chat' , 'role_info' , 'other').includes(user_stage["operation"])){

                        // seer role_info description
                        if(user_stage["operation"] == 'role_info'){
                            user_name = global.room_list[room_name]["room_user"][user_stage['target']]
                            user_stage["description"] = user_stage["description"] == "0" ? `${user_name}(${user_stage['target']})是壞人` : `${user_name}(${user_stage['target']})是好人`
                        }
                        

                        global.game_list[room_name]['announcement'].push({
                            // role info = user(seer) , target(see player) => anno user(see player) 
                            'user' : user_stage["operation"] == 'role_info' ? user_stage['target'] : user_stage["user"],
                            'operation' : user_stage["operation"],
                            // died => user(user id) descript 
                            'description' : user_stage["operation"] != "died" ? user_stage["description"] : `${global.room_list[room_name]["room_user"][user_stage["user"][0]]}(${user_stage["user"]})${user_stage["description"]}`,
                            // allow => role info : seer  , other -1
                            'allow' : user_stage["operation"] == 'role_info' ? user_stage["user"] : -1
                        })
                        // if someone died next stage => user_state = died
                        if(user_stage["operation"] == "died"){
                            for(const [idx , user] of user_stage['user'].entries()){
                                global.game_list[room_name]['died'].push(user)
                            }
                        }
                        
                        // if have anno wait more second
                        wait_time = config.announcementWaitTime
                    }
                    // vote & dialogue
                    else if(Array('vote' , 'vote_or_not' , 'dialogue').includes(user_stage["operation"])){
                        global.game_list[room_name]['information'].push(user_stage)

                        for(var i of user_stage["user"]){
                            global.game_list[room_name]['player'][i]['operation'][user_stage["operation"]] = 0
                        }

                        var tmp_timer = user_stage["operation"] == "dialogue" ? global.game_list[room_name]['dialogue_time'] : global.game_list[room_name]['operation_time']
                        timer = Math.max(tmp_timer , timer)
                        
                        // update vote info
                        if(Array("werewolf" , "vote1" , "vote2").includes(result['stage_name'].split('-')[2])){
                            setTimeout(vote_func , 1000 , room_name , global.game_list[room_name]['stage'] , vote_func)

                            if(result['stage_name'].split('-')[2] == "werewolf")
                                global.game_list[room_name]['empty'] = 1
                        }
                        else if(user_stage["operation"] == "dialogue" && result['stage_name'].split('-')[2] == 'dialogue')
                            global.game_list[room_name]['stage_description'] = `${global.room_list[room_name]["room_user"][user_stage["user"][0]]}(${user_stage["user"][0]})${global.game_list[room_name]['stage_description']}`
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
                

                // show logs
                var timestamp = (Date.now() - global.game_list[room_name]['start_time'])/1000
                console.log(`${room_name} (${timestamp}) : ${global.game_list[room_name]['stage']} (${global.game_list[room_name]['stage_description'] })`)
                for(const info of global.game_list[room_name]['information'])
                    console.log(`  Info:\n    user : ${info["user"]} , target : ${info["target"]} , info : ${info["operation"]} (${info["description"]})`)
                for(const info of global.game_list[room_name]['announcement'])
                    console.log(`  Anno:\n    user : ${info["user"]} , target : ${info["target"]} , info : ${info["operation"]} (${info["description"]})`)
                // console.log(global.game_list[room_name]['information'])
                // console.log(global.game_list[room_name]['announcement'])
                // suffle announcement
                global.game_list[room_name]['announcement'].sort((a,b) => 0.5 - Math.random());
                
                // save log
                var data = JSON.stringify({
                    "timestamp" : timestamp ,
                    ...global.game_list[room_name]
                });

                fs.appendFileSync(global.game_list[room_name]['log_file'], data + "\n");

                

                if(timer != -1){
                    timer = timer + wait_time
                    global.game_timer[room_name] = {
                        timer : setTimeout(stage_func , timer * 1000, room_name , stage_func , vote_func , game_over_func) ,
                        end_time : Date.now() + timer * 1000,
                    } 
                    global.game_list[room_name]['timer'] = timer 
                }
                    // setTimeout(stage_func , timer * 500, room_name , stage_func , vote_func , game_over_func) 
                else{
                    setTimeout(game_over_func , 10 * 1000 , room_name) 
                    global.game_list[room_name]['timer'] = 10
                }
            }
            catch(e){
                console.log(e)
            }
            

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

        var user_role = global.game_list[room_name]['player'][index]['user_role']
        var teamate = []

        for(const[ user_id , user_info ] of Object.entries(global.game_list[room_name]['player'])){
            if(user_info['user_role'] == user_role && user_role == 'werewolf' && user_id != index)
                teamate.push(user_id)
        }
            
        return {status: true, game_info : {...global.game_list[room_name]['player'][index] , teamate:teamate} , player_id : index , log:"ok"}
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
        var announcement = []
        var vote_info = {}
        var empty = 0
        
        // info
        for( const [index , user_stage] of global.game_list[room_name]["information"].entries()){
            // died player can't get info
            if(user_stage['user'].includes(user_id) && global.game_list[room_name]['player'][user_id]['user_state'] != "died"){
                information.push(user_stage)
                
                // wolf can get vote_info when the stage is werewolf
                if(global.game_list[room_name]['stage'].split('-')[2] == "werewolf"){
                    vote_info = global.game_list[room_name]['vote_info']
                    empty = 1
                }
            }
        }

        // anno
        for( const [index , user_stage] of global.game_list[room_name]["announcement"].entries()){
            
            // died seer can't get role_info 
            if((user_stage['allow'] == user_id && global.game_list[room_name]['player'][user_id]['user_state'] != "died") || user_stage['allow'] == -1)
                announcement.push({
                    'user' : user_stage["user"],
                    'operation' : user_stage["operation"],
                    'description' : user_stage["description"],
                })
            
        }


        var info = {
            stage : global.game_list[room_name]['stage'],
            stage_description : global.game_list[room_name]['stage_description'],
            announcement : announcement,
            information : information,
            timer : global.game_list[room_name]['timer'],
            // empty 0 = no vote , 1 = wolf vote (current stage), 2 = day vote (last stage)
            vote_info : global.game_list[room_name]['empty'] == 2 ? global.game_list[room_name]['prev_vote'] : vote_info,
            // empty = 2 => all player get last stage vote_info
            empty : global.game_list[room_name]['empty'] == 2 ? global.game_list[room_name]['empty'] : empty,
            // player_position : await this.get_player_position(room_name),
        }
        
        return {status: true, player_info : info , log:"ok"}
    },

    check_operation : async function(room_name , user_id , target , operation , stage){

        if(global.game_list[room_name]['stage'] != stage && global.game_list[room_name]['player']['user_state'] == 'died')
            return false


        for( const [index , user_stage] of global.game_list[room_name]["information"].entries()){
            var target_list = user_stage['target']
            // vote_or_not can vote -1
            if(user_stage['operation'] == "vote_or_not")
                target_list.push(-1)

            if(user_stage['user'].includes(user_id) && user_stage['operation'] == operation && user_stage['target'].includes(target))
                return true
            //  dialogue not check target
            else if(user_stage['user'].includes(user_id) && user_stage['operation'] == operation && user_stage['operation'] == "dialogue")
                return true
            
                
        }

        return false

    },

    send_player_operation : async function(room_name, user_name , token , operation , route_back){
        token = token.replace('Bearer ', '')

        if(!await this.check_game_room(room_name))
            return route_back({status: false,  log:"room not found or game is not started"}) 

        if(! global.grpc_server_check['status'])
            return{status: false,  log:"grpc server is not available"}      

        if(!await jwt_op.verify_room_jwt(token , room_name , false , user_name) && !await jwt_op.verify_room_jwt(token , room_name , true, user_name))
            return route_back({status: false,  log:"jwt error"})

        var user_id = global.room_list[room_name]['room_user'].indexOf(user_name);

        if(user_id <= -1)
            return route_back({status: false , log: "user name error"})

        // update position
        global.game_list[room_name]['player'][user_id]['user_position'] = operation["position"]

        var timestamp = (Date.now() - global.game_list[room_name]['start_time'])/1000
        var logs = `${room_name} (${timestamp}) : ${user_name}(${user_id}) => ${operation['operation']}(${operation['target']}) - ${operation['chat']}`

        // check user / targer / operation
        if(! await this.check_operation(room_name , user_id , operation['target'] ,operation['operation'] , operation['stage_name'])){
            console.log(`${logs} ... check return false`)
            return  route_back({status : false , log : "operation error"})
        }
        
        const client = new werewolf_kill(config.grpc_server_ip, grpc.credentials.createInsecure());
        // grpc proto
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
        
        client.sendUserOperation(user_operation , function(err , response){
            if(err){
                console.log(`${logs} ... grpc error`)
                return route_back({status: false,  log:"grpc error"})
            }
            else if(response.result){

                var data = JSON.stringify({
                    "timestamp" : timestamp,
                    ...user_operation
                });
                global.game_list[room_name]['player'][user_id]["operation"][operation['operation']] = 1
                fs.appendFileSync(global.game_list[room_name]['log_file'], data + "\n");
                console.log(`${logs} ... ok`)
                return route_back({status: true,  log:"ok"})
            }
            else{
                console.log(`${logs} ... grpc return false`)
                return route_back({status: false,  log:"grpc operation false"})
            }
        })
        

        

    }
}

