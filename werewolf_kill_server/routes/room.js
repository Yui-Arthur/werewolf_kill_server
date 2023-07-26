var express = require('express');
var room = require('../models/room');
var router = express.Router();

router.route('/api/room')
    .get(async function(req, res) {
        try{
            res.status(200).json(global.room_list)
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
    })
router.route('/api/room/:room_name')
    .get(async function(req, res) {
        try{
            res.status(200).json(global.room_list[req.params.room_name])
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
    })
    .post(async function(req, res) {
        try{
            if(!await room.check_room(req.params.room_name)){
                res.status(404).json({
                    "Error" : "Room not found"
                })
                
            }else{
                if(await room.game_setting(req.header('Authorization') , req.params.room_name , req.body))
                    res.sendStatus(200)
                else
                    res.status(500).json({
                        "Error" : "jwt error"
                    })
            }
            

        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
    })

router.route('/api/create_room')
    .get(async function(req, res) {
        try{
            
            ret = await room.create_room(req.body.user_name)
            room_name = ret[0]
            user_token =  ret[1]
    
            res.status(200).json({
                "room_name" : room_name,
                "user_token" : user_token
            })

            console.log(global.room_list)
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
        
        
    })

router.route('/api/join_room/:room_name')
    .get(async function(req, res) {
        try{
            
            if(await room.check_room(req.params.room_name) && !await room.is_full(req.params.room_name)){
                user_token = await room.join_room(req.body.user_name , req.params.room_name)
                
                res.status(200).json({
                    "user_token" : user_token
                })
            }
            else{
                res.status(404).json({
                    "Error" : "Room not found"
                })
            }
            
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
        
        
    })

router.route('/api/quit_room/:room_name')
    .get(async function(req, res) {
        try{
            
            if(await room.check_room(req.params.room_name)){
                if(await room.quit_room(req.params.room_name , req.body.user_name , req.header('Authorization')))
                    res.sendStatus(200)
                else
                    res.status(500).json({
                        "Error" : "jwt error"
                    })
            }
            else{
                res.status(404).json({
                    "Error" : "Room not found"
                })
            }
            
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
        
        
    })

// router.route('/api/start_game/:room_name')
//     .get(async function(req,res)){
        
//     }


module.exports = router;