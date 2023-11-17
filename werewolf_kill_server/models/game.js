var config = require('../conf')
var jwt_op = require('./jwt')
var room = require('./room')
var grpc = require('@grpc/grpc-js');
var werewolf_kill = require('./proto')["werewolf"]
var agent = require('./proto')["agent"]
var agent_model = require('./agent')
var fs = require('fs');


function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = {

    check_game_room : async function(room_name){
        return global.game_list.hasOwnProperty(room_name) && global.room_list[room_name]['room_state'] == "started"
    },

    check_grpc_server : async function(){
        var client = new werewolf_kill(config.werewolf_server_ip, grpc.credentials.createInsecure());
        client.checkRoleList({role : [0,0,0,0,0], room_name : "1234"}, function (err, response) {
            if(err){
                global.grpc_server_check['status']['werewolf'] = 0
                console.log(`[${new Date(Date.now())}] - werewolf server is not available`) 
            }
            else{
                global.grpc_server_check['status']['werewolf'] = 1
                console.log(`[${new Date(Date.now())}] - werewolf server is running`) 
            }
        })

        var client = new agent(config.agent_server_ip, grpc.credentials.createInsecure());
        client.get_agent_info({agentID : -1}, function (err, response) {
            if(err){
                global.grpc_server_check['status']['agent'] = 0
                console.log(`[${new Date(Date.now())}] - agent server is not available`) 
            }
            else{
                global.grpc_server_check['status']['agent'] = 1
                console.log(`[${new Date(Date.now())}] - agent server is running`) 
            }
        })

    },

    get_vote_info: async function(room_name , current_stage , vote_func , copy_to_prev = false){
        // grpc vote_info func
        if(!global.game_list.hasOwnProperty(room_name))
            return
        if(current_stage !=  global.game_list[room_name]['stage'])
            return


        const client = new werewolf_kill(config.werewolf_server_ip, grpc.credentials.createInsecure());
        client.voteInfo({room_name: room_name , room_stage : global.game_list[room_name]['stage']} , function(err, result){

            global.game_list[room_name]['vote_info'] = {}

            if(err){
                console.log(err)
                // setTimeout(vote_func , 1000 , room_name , current_stage , vote_func)
            }

            for(const [idx , user_state] of result.state.entries()){
                if(user_state != -2)
                    global.game_list[room_name]['vote_info'][idx] = user_state
            }
            
            // vote1 & vote2 stage will copy the vote info to prev_vote
            if(copy_to_prev)
                global.game_list[room_name]['prev_vote'] = global.game_list[room_name]['vote_info']

            if(current_stage ==  global.game_list[room_name]['stage'])
                setTimeout(vote_func, 1000 , room_name , current_stage , vote_func)
                
        })
        
    },

    skip_stage : async function(room_name , stage_name , token , user_name){
        token = token.replace('Bearer ', '')

        if(!await this.check_game_room(room_name))
            return{status: false,  log:"room not found or game is not started"}  

        if(! global.grpc_server_check['status']['werewolf'])
            return{status: false,  log:"werewolf server is not available"}      

        if(!await jwt_op.verify_room_jwt(token , room_name , false , user_name) && !await jwt_op.verify_room_jwt(token , room_name , true, user_name))
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

        if(global.game_timer[room_name]['end_time'] - Date.now() <= Math.abs(3000))
            return {status: false,  log:"timer less then 3 seconds , please wait"}

        clearTimeout(global.game_timer[room_name]['timer'])
        global.game_timer[room_name]['end_time'] = Date.now()
        this.next_stage(room_name , this.next_stage , this.get_vote_info , this.game_over , agent_model.save_agent_game_results)

        // save log
        var data = JSON.stringify({
            "timestamp" : (Date.now() - global.game_list[room_name]['start_time'])/1000 ,
            "skip" : "skip"
        });
        fs.appendFileSync(global.game_list[room_name]['log_file'], data + "\n");

        return{status: true,  log:"ok"}
    },

    game_over : async function(room_name , save_agent_data_func , result){
        // save agent info
        if(global.game_list[room_name]['save_agent_data'])
            await save_agent_data_func(room_name,result)
        // game over del all game info
        clearInterval(global.game_timer[room_name]['agent_info_timer'])
        delete global.game_list[room_name]
        delete global.game_timer[room_name]
        // reset the room state
        global.room_list[room_name]['room_state'] = "ready"

        console.log(`${room_name} game over`)
        // if no running game room => timer to 60s
        if(Object.keys(global.game_list).length == 0){
            var check_func = global.grpc_server_check['timer']._onTimeout
            clearInterval(global.grpc_server_check['timer'])
            console.log("no running game room , grpc check timer resume 60s")
            global.grpc_server_check['timer'] = setInterval(check_func , 60 * 1000)
        }
    },

    next_stage : async function(room_name , stage_func , vote_func , game_over_func , save_agent_data_func){

        if(!global.game_list.hasOwnProperty(room_name))
            return

        
        // set handover tag => true
        global.game_list[room_name]['is_handover'] = true
        global.game_list[room_name]['last_stage'] = JSON.parse(JSON.stringify(global.game_list[room_name]));

        // set timer end time to prevent skip 2 stage
        global.game_timer[room_name]['end_time'] = Date.now()

        // vote result stage
        if(Array('vote1' , 'vote2').includes(global.game_list[room_name]['stage'].split('-')[2])){
            global.game_list[room_name]['empty'] = 2
            // update vote info & copy to prev_vote
            vote_func(room_name , global.game_list[room_name]['stage'] , vote_func , true)
        }
        // werewolf
        else if(Array('werewolf').includes(global.game_list[room_name]['stage'].split('-')[2])){
            global.game_list[room_name]['empty'] = 1
            // update vote info & copy to prev_vote
            vote_func(room_name , global.game_list[room_name]['stage'] , vote_func , true)
        }
        else
            global.game_list[room_name]['prev_vote'] = {} , global.game_list[room_name]['empty'] = 0

        // set died state
        for(const [user , cnt] of Object.entries(global.game_list[room_name]['died'])){
            if(cnt == 0){
                global.game_list[room_name]['player'][user]['user_state'] = "died"
                delete global.game_list[room_name]['died'][user]
                // console.log(`${room_name} - ${global.game_list[room_name]['player'][user]['user_name']}(${user}) turn died`)
            }
            else
                global.game_list[room_name]['died'][user] = cnt-1
        }
        
        // check werewolf server
        var retries = 20
        while(! global.grpc_server_check['status']['werewolf']){
            retries --
            await sleep(1000)
            console.log("werewolf server is not available , retrying")

            if(retries == 0){
                console.log("werewolf server is error , end game")
                game_over_func(room_name)
            }
        }
        
        // grpc next_stage func
        const client = new werewolf_kill(config.werewolf_server_ip, grpc.credentials.createInsecure());
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
                // global.game_list[room_name]['died'] = []
                // reset player operation
                for(var [user_id , value]  of Object.entries(global.game_list[room_name]["player"])){
                    value['operation'] = {}
                }

                // set game stage
                global.game_list[room_name]['stage'] = result['stage_name']
                global.game_list[room_name]['stage_description']  = config.stageToDescription[result['stage_name'].split('-')[2]]

                var timer = 0
                var wait_time = 0
                var game_result = ""
                
                // stage proccess
                for(var [index , user_stage] of result['stage'].entries()){
                    // check / hunter stage other => stage description
                    if(Array('other').includes(user_stage["operation"])) {
                        var stage_description = user_stage["description"]
                        
                        // replace $ to user_name(user_id)
                        if(user_stage['target'].length != 0)
                            stage_description = stage_description.replace('$' , `${global.room_list[room_name]["room_user"][user_stage["target"][0]]}(${user_stage["target"][0]})`)
                        global.game_list[room_name]['stage_description'] = stage_description  
                        
                        wait_time = config.announcementWaitTime
                    }
                    // died & chat & role_info => announcement
                    else if(Array('died' , 'chat' , 'role_info').includes(user_stage["operation"])){

                        // seer role_info description
                        if(user_stage["operation"] == 'role_info'){
                            user_name = global.room_list[room_name]["room_user"][user_stage['target']]
                            user_stage["description"] = user_stage["description"] == "0" ? `${user_name}(${user_stage['target']})是壞人` : `${user_name}(${user_stage['target']})是好人`
                        }
                        
                        // allow werewolf => wolf , role info => seer , other => -1
                        var allow = 0
                        if(user_stage["operation"] == 'chat' && user_stage['target'].length != 0) allow = user_stage['target']
                        else if(user_stage["operation"] == 'role_info') allow = user_stage["user"]
                        else allow = -1

                        global.game_list[room_name]['announcement'].push({
                            // role info = user(seer) , target(see player) => anno user(see player) 
                            'user' : user_stage["operation"] == 'role_info' ? user_stage['target'] : user_stage["user"],
                            'operation' : user_stage["operation"],
                            // died => user(user id) descript 
                            'description' : user_stage["operation"] != "died" ? user_stage["description"] : `${global.room_list[room_name]["room_user"][user_stage["user"][0]]}(${user_stage["user"]})${user_stage["description"]}`,
                            'allow' : allow
                        })
                        // if someone died next {target} stage => user_state = died
                        if(user_stage["operation"] == "died"){
                            global.game_list[room_name]['died'][user_stage['user'][0] ] =user_stage['target'][0]
                        }
                        
                        // if have anno wait more second
                        wait_time = config.announcementWaitTime
                    }
                    // vote & dialogue 
                    else if(Array('vote' , 'vote_or_not' , 'dialogue' , 'werewolf_dialogue').includes(user_stage["operation"])){
                        global.game_list[room_name]['information'].push(user_stage)

                        // record the operation
                        for(var i of user_stage["user"]){
                            global.game_list[room_name]['player'][i]['operation'][user_stage["operation"]] = 0
                        }
                        // dialogue => dialogue time / other operation (include werewolf_dialogue) => operation_time
                        var tmp_timer = user_stage["operation"] == "dialogue" ? global.game_list[room_name]['dialogue_time'] : global.game_list[room_name]['operation_time']
                        // if dialogue & other operations at same time , set the max of two
                        timer = Math.max(tmp_timer , timer)
                        
                        // werewolf_realtime_vote_info == 1 => werewolf reeltime vote info
                        if(Array("werewolf").includes(result['stage_name'].split('-')[2]) && config.werewolf_realtime_vote_info == 1){
                            
                            setTimeout(vote_func , 500 , room_name , global.game_list[room_name]['stage'] , vote_func)
                            global.game_list[room_name]['empty'] = 1

                        }
                        // stage dialogue need chage stage description => user_name(user_id) description
                        else if(user_stage["operation"] == "dialogue" && result['stage_name'].split('-')[2] == 'dialogue')
                            global.game_list[room_name]['stage_description'] = `${global.room_list[room_name]["room_user"][user_stage["user"][0]]}(${user_stage["user"][0]})${global.game_list[room_name]['stage_description']}`
                    }
                    // end game
                    else{
                        timer = -1    
                        global.game_list[room_name]['announcement'].push({
                            'user' : [],
                            'operation' : "game_over",
                            'description' : user_stage["description"],
                            'allow' : -1
                        })
                        game_result = user_stage["description"]
                        // clear the info
                        global.game_list[room_name]['information'].length = 0    
                        break
                    }
                }
                
                // console.log(result)
                // show logs
                var timestamp = (Date.now() - global.game_list[room_name]['start_time'])/1000
                // basic 
                console.log(`${room_name} (${timestamp}) : ${global.game_list[room_name]['stage']} (${global.game_list[room_name]['stage_description'] }) timer ${timer}s / wait ${wait_time}s`)
                // info
                console.log(` |- Info:`)
                for(const info of global.game_list[room_name]['information'])
                    console.log(`   |- user : ${info["user"]} , target : ${info["target"]} , info : ${info["operation"]} (${info["description"]})`)
                // anno
                console.log(` |- Anno:`)
                for(const info of global.game_list[room_name]['announcement'])
                    console.log(`   |- user : ${info["user"]} , allow : ${info["allow"]} , info : ${info["operation"]} (${info["description"]})`)
                // vote
                console.log(` |- Vote: `)
                var vote_str = ""
                for(const [user , vote] of Object.entries(global.game_list[room_name]['prev_vote']))
                    vote_str += `${user} => ${vote} , `
                if(vote_str != "") console.log(`   |- ${vote_str}`)
                // died
                console.log(` |- Died: `)
                var died_str = ""
                for(const [user , cnt] of Object.entries(global.game_list[room_name]['died']))
                    died_str += `${user}(${cnt}) , `
                if(died_str != "") console.log(`   |- ${died_str}`)

                // suffle announcement
                global.game_list[room_name]['announcement'].sort((a,b) => 0.5 - Math.random());
                // 
                if(global.game_list[room_name]['stage'].split('-')[2] == "werewolf_dialogue")
                    global.game_list[room_name]['stage_description'] += "#" + Math.floor(Math.random() * 1000);
                
                // save log
                var data = JSON.stringify({
                    "timestamp" : timestamp ,
                    ...global.game_list[room_name]
                });

                fs.appendFileSync(global.game_list[room_name]['log_file'], data + "\n");

                
                // game is not end
                if(timer != -1){
                    timer = timer + wait_time
                    global.game_timer[room_name] = {
                        timer : setTimeout(stage_func , timer * 1000, room_name , stage_func , vote_func , game_over_func , save_agent_data_func) ,
                        agent_info_timer : global.game_timer[room_name]['agent_info_timer'],
                        end_time : Date.now() + timer * 1000,
                    } 
                    global.game_list[room_name]['timer'] = timer 
                    
                }
                // end game
                else{
                    // after 10 second => reset the game room 
                    setTimeout(game_over_func , 10 * 1000 , room_name , save_agent_data_func , game_result) 
                    global.game_list[room_name]['timer'] = 10
                }

                // date is ready handover tag => false
                global.game_list[room_name]['is_handover'] = false
                delete global.game_list[room_name]['last_stage']
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

        // werewolf can get teemate
        for(const[ user_id , user_info ] of Object.entries(global.game_list[room_name]['player'])){
            if(user_info['user_role'] == user_role && user_role == 'werewolf' && user_id != index)
                teamate.push(user_id)
        }
            
        return {status: true, game_info : {...global.game_list[room_name]['player'][index] , teamate:teamate} , player_id : index , log:"ok"}
    },

    get_all_information : async function(room_name , token){
        token = token.replace('Bearer ', '')
        if(!await this.check_game_room(room_name))
        return{status: false,  log:"room not found or game is not started"}  
        
        if(!await jwt_op.verify_room_jwt(token , room_name , false , "X") && !await jwt_op.verify_room_jwt(token , room_name , true, "X"))
        return{status: false,  log:"jwt error"}

        var data = global.game_list[room_name]

        if(global.game_list[room_name]['is_handover'])
            data = global.game_list[room_name]['last_stage']

        var vote_info = {}
        var empty = 0

        information = Array.from(data["information"])

        // remove the dead player id from all info
        for(const [idx , info] of Array.from(information).entries()){
            users = info['user']
            
            for(const [idx , user] of users.entries()){
                if(data['player'][user]['user_state'] == "died")
                    information[idx]['user'].splice(info['user'].indexOf(user),1)
            }

            if(information[idx]['user'].length == 0)
                information.splice(idx,1)
        }

        // empty 0 = no vote , 
        // empty 1 = wolf vote (realtime and last stage)
        // empty 2 = day vote (last stage)
        // empty = 1 wolf vote => only werewolf can get vote info
        if(data['empty'] == 1){
            
            // werewolf stage => realtime 
            if(data['stage'].split('-')[2] == "werewolf" && config.werewolf_realtime_vote_info == 1)
                vote_info = data['vote_info'] , empty = 1
            // last stage werewolf vote info (last stage send to front empty = 2)
            else
                vote_info = data['prev_vote'] , empty = 2
        }
        // empty = 2 all player can get vote info
        else if(data['empty'] == 2)
            vote_info = data['prev_vote'] , empty = 2


        var info = {
            stage : data['stage'],
            stage_description : data['stage_description'],
            announcement : data["announcement"],
            information : information,
            agent_info : data['agent_info'],
            timer : data['timer'],            
            vote_info : vote_info,
            empty : empty,
        }
        
        return {status: true, player_info : info , log:"ok"}
        
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

        var data = global.game_list[room_name]

        if(global.game_list[room_name]['is_handover'])
            data = global.game_list[room_name]['last_stage']
        

        var information = []
        var announcement = []
        var vote_info = {}
        var empty = 0
        
        // info
        for( const [index , user_stage] of data["information"].entries()){
            // died player can't get info
            if(user_stage['user'].includes(user_id) && data['player'][user_id]['user_state'] != "died"){
                information.push(user_stage)
            }
        }

        // anno
        for( const [index , user_stage] of data["announcement"].entries()){
            
            // died seer can't get role_info 
            // died werewolf can get werewolf_dialogue
            if((user_stage['allow'] == user_id && data['player'][user_id]['user_state'] != "died") || 
                user_stage['allow'] == -1 || (Array.isArray(user_stage['allow']) && user_stage['allow'].includes(user_id)))
                announcement.push({
                    'user' : user_stage["user"],
                    'operation' : user_stage["operation"],
                    'description' : user_stage["description"],
                })
            
        }

        // empty 0 = no vote , 
        // empty 1 = wolf vote (realtime and last stage)
        // empty 2 = day vote (last stage)
        // empty = 1 wolf vote => only werewolf can get vote info
        if(data['empty'] == 1 && data['player'][user_id]['user_role'] == 'werewolf'){
            
            // werewolf stage => realtime 
            if(data['stage'].split('-')[2] == "werewolf" && config.werewolf_realtime_vote_info == 1)
                vote_info = data['vote_info'] , empty = 1
            // last stage werewolf vote info (last stage send to front empty = 2)
            else
                vote_info = data['prev_vote'] , empty = 2
        }
        // empty = 2 all player can get vote info
        else if(data['empty'] == 2)
            vote_info = data['prev_vote'] , empty = 2


        var info = {
            stage : data['stage'],
            stage_description : data['stage_description'],
            announcement : announcement,
            information : information,
            agent_info : data['agent_info'],
            timer : data['timer'],            
            vote_info : vote_info,
            empty : empty,
        }
        
        return {status: true, player_info : info , log:"ok"}
    },

    check_operation : async function(room_name , user_id , target , operation , stage){

        // server stage and client stage not match
        // or player is died
        // or server is in handover 
        if(global.game_list[room_name]['stage'] != stage || global.game_list[room_name]['player']['user_state'] == 'died' || global.game_list[room_name]['is_handover'])
            return false


        for( const [index , user_stage] of global.game_list[room_name]["information"].entries()){
            var target_list = Array.from(user_stage['target'])
            // vote_or_not can vote -1
            if(user_stage['operation'] == "vote_or_not")
                target_list.push(-1)

            // user have in info user
            // user operation is same with info operation
            // user target is in info target
            if(user_stage['user'].includes(user_id) && user_stage['operation'] == operation && target_list.includes(target))
                return true
            // dialogue / werewolf_dialogue not check target
            // user have in info user
            // user operation is same with info operation
            else if(user_stage['user'].includes(user_id) && user_stage['operation'] == operation && Array("dialogue" , "werewolf_dialogue").includes(user_stage['operation']))
                return true
            
                
        }

        return false

    },

    send_player_operation : async function(room_name, user_name , token , operation , route_back){
        token = token.replace('Bearer ', '')

        if(!await this.check_game_room(room_name))
            return route_back({status: false,  log:"room not found or game is not started"}) 

        if(! global.grpc_server_check['status']['werewolf'])
            return{status: false,  log:"werewolf server is not available"}      

        if(!await jwt_op.verify_room_jwt(token , room_name , false , user_name) && !await jwt_op.verify_room_jwt(token , room_name , true, user_name))
            return route_back({status: false,  log:"jwt error"})

        var user_id = global.room_list[room_name]['room_user'].indexOf(user_name);

        if(user_id <= -1)
            return route_back({status: false , log: "user name error"})

        var timestamp = (Date.now() - global.game_list[room_name]['start_time'])/1000
        var logs = `${room_name} (${timestamp}) : ${user_name}(${user_id}) => ${operation['operation']}(${operation['target']}) - ${operation['chat']}`

        // check user / targer / operation
        if(! await this.check_operation(room_name , user_id , operation['target'] ,operation['operation'] , operation['stage_name'])){
            console.log(`${logs} ... check return false`)
            return  route_back({status : false , log : "operation error"})
        }
        
        const client = new werewolf_kill(config.werewolf_server_ip, grpc.credentials.createInsecure());
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
                // record the operation have been done
                global.game_list[room_name]['player'][user_id]["operation"][operation['operation']] = 1
                // save logs
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

