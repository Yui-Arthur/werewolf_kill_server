var grpc = require('@grpc/grpc-js');
var agent = require('./proto')["agent"]
var jwt_op = require('./jwt')
var config = require('../conf')

module.exports = {

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
                console.log(`[${new Date(Date.now())}] - create agent failed , ${err.message}`) 
                return route_back({status: false,  log:"create agent failed"})
            }
            else{
                console.log(`[${new Date(Date.now())}] - create agent success : ${response["agentID"]}`) 
                global.room_list[room_name]['agent'].push(response["agentID"])
                return route_back({status: true,  log:"ok" , agentID : response["agentID"] })
                
            }                    
        });
    },

    delete_agent : async function(room_name , user_name, token , agent_id , route_back){
        const client = new agent(config.agent_server_ip, grpc.credentials.createInsecure());
        token = token.replace('Bearer ', '')
        if(!await jwt_op.verify_room_jwt(token , room_name , true , user_name))
            return route_back({status: false,  log:"jwt error"})

        if(! global.grpc_server_check['status']['agent'])
            return route_back({status: false,  log:"agent server is not available"})

        client.delete_agent({agentID : agent_id} , function(err, response){

            if(err){
                console.log(`[${new Date(Date.now())}] - delete agent ${agent_id} failed , ${err.message}`) 
                return route_back({status: false,  log:"delete agent failed"})
            }
            else{
                console.log(`[${new Date(Date.now())}] - delete agent ${agent_id} success`) 
                var index = global.room_list[room_name]['agent'].indexOf(agent_id);
                global.room_list[room_name]['agent'].splice(index, 1)
                return route_back({status: true,  log:"ok"})
            }                    
        });
    },

    update_agent_info : async function(room_name){
        const client = new agent(config.agent_server_ip, grpc.credentials.createInsecure());
        if(! global.grpc_server_check['status']['agent'])
            return 

        for(const agent_id of global.game_list[room_name]['agent']){

            client.get_agent_info({agentID : agent_id} , function(err, response){
    
                if(err){
                    console.log(`[${new Date(Date.now())}] - get agent ${agent_id} info failed , ${err.message}`) 
                }
                else{
                    console.log(`[${new Date(Date.now())}] - get agent ${agent_id} info success`) 
                    global.game_list[room_name]['agent_info'][agent_id] = response['agentInfo']
                }                    
            });
        }

    }

}