var PROTO_PATH = "./protobufs/werewolf_kill.proto"
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
   
});

var werewolf_proto = grpc.loadPackageDefinition(packageDefinition).werewolf_kill;

module.exports = werewolf_proto

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