var grpc = require('@grpc/grpc-js');
var agent = require('./proto')["agent"]
var jwt_op = require('./jwt')
var config = require('../conf')

module.exports = {

    create_agent: async function(room_name , user_name, token , agent_setting , route_back){
        const client = new agent(config.agent_server_ip, grpc.credentials.createInsecure());

        agent_type = agent_setting['agent_type']
        agent_name = agent_setting['agent_name']
        key_path = agent_setting['key_path']
        color = agent_setting['color']
        prompt_dir = agent_setting['prompt_dir']
        

        token = token.replace('Bearer ', '')
        if(!await jwt_op.verify_room_jwt(token , room_name , true , user_name))
            return route_back({status: false,  log:"jwt error"})

        client.create_agent({roomName : room_name, agentType : agent_type, agentName : agent_name,
                             keyPath : key_path , color: color,promptDir: prompt_dir} , function(err, response){
            
            if(err){
                console.log(`[${new Date(Date.now())}] - create agent failed , ${err.message}`) 
                return route_back({status: false,  log:"create agent failed"})
            }
            else{
                console.log(`[${new Date(Date.now())}] - create agent success : ${response["agentID"]}`) 
                return route_back({status: true,  log:"ok" , agentID : response["agentID"] })
                
            }                    
        });
    },

    delete_agent : async function(room_name , user_name, token , agent_id , route_back){
        const client = new agent(config.agent_server_ip, grpc.credentials.createInsecure());
        token = token.replace('Bearer ', '')
        if(!await jwt_op.verify_room_jwt(token , room_name , true , user_name))
            return route_back({status: false,  log:"jwt error"})

            client.delete_agent({agentID : agent_id} , function(err, response){

            if(err){
                console.log(`[${new Date(Date.now())}] - delete agent ${agent_id} failed , ${err.message}`) 
                return route_back({status: false,  log:"delete agent failed"})
            }
            else{
                console.log(`[${new Date(Date.now())}] - delete agent ${agent_id} success`) 
                return route_back({status: true,  log:"ok"})
            }                    
        });
    }

}