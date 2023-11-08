var grpc = require('@grpc/grpc-js');
var agent = require('./proto')["agent"]
var jwt_op = require('./jwt')
var config = require('../conf')

module.exports = {

    build_key_words: async function(){        
        var mapping_dict = {
            "good" : ["好人"],
            "god" : ["神","神職","神明"],
            "seer" : ["預言家"],
            "witch" :["女巫"],
            "hunter" : ["獵人"],
            "village" : ["平民" , "民" , "村民"],
            "werewolf" : ["狼","狼人","壞人"],
        }

        for(const [label , key_words] of Object.entries(mapping_dict)){
            for(const key_word of key_words)
                global.mapping_keywords[key_word] = label
        }
        
    },

    agent_check_room : async function(room_name) {
        return global.room_list.hasOwnProperty(room_name) && global.room_list[room_name]['room_state'] != "started" && !(global.room_list[room_name]['room_user'].length == global.room_list[room_name]['game_setting']['player_num'])
    },

    create_agent: async function(room_name , user_name, token , agent_setting , route_back){
        const client = new agent(config.agent_server_ip, grpc.credentials.createInsecure());

        agent_type = agent_setting['agent_type']
        agent_name = agent_setting['agent_name']
        api_json = agent_setting['api_json']
        color = agent_setting['color']
        prompt_dir = agent_setting['prompt_dir']
        

        token = token.replace('Bearer ', '')

        if(!await this.agent_check_room(room_name))
            return route_back({status: false,  log:"room not found or room is full" })

        if(!await jwt_op.verify_room_jwt(token , room_name , true , user_name))
            return route_back({status: false,  log:"jwt error"})
        
        if(! global.grpc_server_check['status']['agent'])
            return route_back({status: false,  log:"agent server is not available"})

        client.create_agent({roomName : room_name, agentType : agent_type, agentName : agent_name, apiJson : api_json,
                            color: color,promptDir: prompt_dir} , function(err, response){
            
            if(err){
                console.log(`[${new Date(Date.now())}] - create agent ${agent_name} failed , ${err.message}`) 
                return route_back({status: false,  log:"create agent failed"})
            }
            else{
                console.log(`[${new Date(Date.now())}] - create agent ${agent_name} success ID : ${response["agentID"]}`) 
                global.room_list[room_name]['agent'][agent_name] = response["agentID"]
                return route_back({status: true,  log:"ok" , agentID : response["agentID"] })
                
            }                    
        });
    },

    delete_agent : async function(room_name , user_name, token , agent_name , route_back){
        const client = new agent(config.agent_server_ip, grpc.credentials.createInsecure());
        token = token.replace('Bearer ', '')
        if(!await jwt_op.verify_room_jwt(token , room_name , true , user_name))
            return route_back({status: false,  log:"jwt error"})

        if(! global.grpc_server_check['status']['agent'])
            return route_back({status: false,  log:"agent server is not available"})

        client.delete_agent({agentID : global.room_list[room_name]['agent'][agent_name]} , function(err, response){

            if(err){
                console.log(`[${new Date(Date.now())}] - delete agent ${agent_name} failed , ${err.message}`) 
                return route_back({status: false,  log:"delete agent failed"})
            }
            else{
                console.log(`[${new Date(Date.now())}] - delete agent ${agent_name} success`) 
                delete global.room_list[room_name]['agent'][agent_name]
                return route_back({status: true,  log:"ok"})
            }                    
        });
    },


    process_agent_info : function(room_name , agent_name , response){
        var partially_correct_check = {
            "good" : ["seer" , "witch" , "village" , "hunter"],
            "god" : ["seer" , "witch" , "hunter"]
        }

        var acc_cnt = 0
        var ret_guess_roles = {}
        
        if(! response.hasOwnProperty("confidence"))
            response['confidence'] = {"info" : Array(parseInt(global.game_list[room_name]['player_num'])).fill("-0.01")};
                    
        for(const [player_id , guess_role] of response['guess_roles']['info'].entries()){
            // console.log(global.mapping_keywords[guess_role] , global.game_list[room_name]['player'][player_id]['user_role'])
            
            agent_guess = global.mapping_keywords[guess_role] 
            actual_role = global.game_list[room_name]['player'][player_id]['user_role']

            // info guess roles format
            ret_guess_roles[player_id] = [guess_role , config.role_en2ch[actual_role] , parseFloat((parseFloat(response['confidence']["info"][player_id]) * 100).toFixed(2))]

            // can't find key_word or current player is agent
            if(! global.mapping_keywords.hasOwnProperty(guess_role) || global.room_list[room_name]['room_user'].indexOf(agent_name) == player_id)
                ret_guess_roles[player_id].push(0)
            // All correct
            else if(agent_guess == actual_role)
                acc_cnt+=1 , ret_guess_roles[player_id].push(1)
            // partially correct
            else if(partially_correct_check.hasOwnProperty(agent_guess) && partially_correct_check[agent_guess].includes(actual_role))
                acc_cnt+=0.5 , ret_guess_roles[player_id].push(0.5)
            else
                ret_guess_roles[player_id].push(0)
        }

        var acc = parseFloat((acc_cnt / (parseInt(global.game_list[room_name]['player_num'])-1) * 100).toFixed(2))
        var token_used = parseInt(response['token_used']['info'])

        delete response['token_used']
        delete response['guess_roles']
        delete response['confidence']

        for(const [key , value] of Object.entries(response))
            response[key] = value["info"][0]
        
        var agent_info_format = {
            "detail" : {
                "token" : token_used,
                "role_accuracy" : acc
            },
            "guess_roles" : ret_guess_roles,
            ...response
        }

        global.game_list[room_name]['agent_info'][agent_name] = agent_info_format
    },

    update_agent_info : async function(room_name , process_agent_info){
        const client = new agent(config.agent_server_ip, grpc.credentials.createInsecure());
        if(! global.grpc_server_check['status']['agent'])
            return 

        for(const [agent_name,agent_id] of Object.entries(global.game_list[room_name]['agent'])){

            client.get_agent_info({agentID : agent_id} , function(err, response){
    
                if(err){
                    console.log(`[${new Date(Date.now())}] - get agent ${agent_name} info failed , ${err.message}`) 
                }
                else{
                    console.log(`[${new Date(Date.now())}] - get agent ${agent_name} info success`) 
                    process_agent_info(room_name , agent_name , response['agentInfo'])
                }                    
            });
        }

    }

}