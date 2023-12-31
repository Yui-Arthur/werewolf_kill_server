var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken')
var config = require('../conf')
const saltRounds = 10;
var randomstring = require("randomstring");

module.exports = {


    create_room_jwt : async function(user_name , room_name , leader){
        return jwt.sign({ "user_name" : user_name , "room_name" : room_name , "leader" : leader}, config.SERECT, { expiresIn: '100d' })
    },

    verify_room_jwt : async function(token , room_name , leader , user_name = null){
        
        if(config.jwt_open == 0)
            return true

        try{
            decode = jwt.verify(token , config.SERECT)
            user_name = user_name != null ? user_name : decode.user_name;
            // console.log(decode)

            // master token
            if(decode.room_name == "A10955PYSY" && decode.leader == true && decode.user_name == "A10955PYSY")
                return true;

            if(decode.room_name == room_name && decode.leader == leader && decode.user_name == user_name)
                return true;
            else
                return false;
            
        } catch(e){
            console.log(e)
            return false;
        }
        
        
    },

}
