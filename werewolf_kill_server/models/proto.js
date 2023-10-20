var WEREWOLF_PROTO_PATH = "./protobufs/werewolf_kill.proto"
var AGENT_PROTO_PATH = "./protobufs/agent.proto"
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
const werewolfPackageDefinition = protoLoader.loadSync(WEREWOLF_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
   
});
const agentPackageDefinition = protoLoader.loadSync(AGENT_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
   
});

var werewolf_proto = grpc.loadPackageDefinition(werewolfPackageDefinition).werewolf_kill;
var agent_proto = grpc.loadPackageDefinition(agentPackageDefinition).agent;

module.exports = {
    "werewolf" : werewolf_proto,
    "agent" : agent_proto  
} 

// async function stage(room_name){
//     const client = new werewolf_proto('localhost:50051', grpc.credentials.createInsecure());
//     client.nextStage({room_name: room_name , room_stage : ""} , function(err, result) {
//         console.log(result);
//     });
// }
// module.exports = {
//     check_role_list : check_role_list
    
// }

// check_role_list([1,1,3,3,1] , "123")
// start_game([1,1,2,2,1] , "123")
// stage("TESTROOM")