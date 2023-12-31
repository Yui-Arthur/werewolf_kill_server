var express = require('express');
var room = require('../models/room');
var router = express.Router();
var config = require('../conf');
const { agent } = require('../models/proto');

/**
 *  get all rooms
 *  rerturn all room info
 * */ 
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
    /**
     *  get specific room info
     *  rerturn room info
     * */ 
    .get(async function(req, res) {
        try{
            if(global.room_list.hasOwnProperty(req.params.room_name))
                res.status(200).json(global.room_list[req.params.room_name])
            else
                res.status(404).json({
                    "Error" : "Room not found"
                })
            
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
    })
    /**
     *  setting specific room
     *  rerturn OK or Error
     * */ 
    .post(async function(req, res) {
        try{
            room.game_setting(req.header('Authorization') , req.params.room_name , req.body , function(result){
                if(result.status)
                    res.sendStatus(200)
                else
                    res.status(500).json({
                        "Error" : result.log
                    })
            })
            
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
    })

router.route('/api/room/:room_name/:player_number')
    /**
     *  setting specific room with player number
     *  rerturn OK or Error
     * */ 
    .get(async function(req, res) {
            try{
                result = await room.change_player_number(req.header('Authorization') , req.params.room_name , req.params.player_number)
                if(result.status)
                    res.sendStatus(200)
                else
                    res.status(500).json({
                        "Error" : result.log
                    })
                
            } catch(e){
                console.log(e);
                res.sendStatus(500)
            }
        
    })

router.route('/api/create_room/:user_name/:user_color')
    /**
     *  create new room
     *  rerturn random room number & leader user_token
     * */ 
    .get(async function(req, res) {
        try{
            
            ret = await room.create_room(req.params.user_name , req.params.user_color)
            room_name = ret[0]
            user_token =  ret[1]
    
            res.status(200).json({
                "room_name" : room_name,
                "user_token" : user_token
            })
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
        
        
    })

router.route('/api/join_room/:room_name/:user_name/:user_color')
    /**
     *  join room 
     *  rerturn user_token
     * */ 
    .get(async function(req, res) {
        try{
            
            
            result = await room.join_room(req.params.user_name , req.params.room_name , req.params.user_color)
            
            if(result.status)
                res.status(200).json({
                    "user_token" : result.token
                })
            
            else
                res.status(500).json({
                    "Error" : result.log
                })
            
            
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
        
        
    })

router.route('/api/quit_room/:room_name/:user_name')
    /**
     *  quit room or kick someount out of room
     *  rerturn OK or Error
     * */ 
    .get(async function(req, res) {
        try{
            
            result = await room.quit_room(req.params.room_name , req.params.user_name , req.header('Authorization'))
            if(result.status)
                res.sendStatus(200)
            else
                res.status(500).json({
                    "Error" : result.log
                })
            
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
        
        
    })

router.route('/api/start_game/:room_name')
    /**
     *  start the specific room 
     *  rerturn OK or Error
     * */ 
    .get(async function(req,res){
        try{
            
            room.start_game(req.params.room_name , req.header('Authorization') , function(result){
                if(result.status)
                    res.sendStatus(200)
                else
                    res.status(500).json({
                        "Error" : result.log
                    })
            })
            

        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
    })

router.route('/api/reset/')
    /**
     *  reset all room
     *  rerturn OK or Error
     * */ 
    .get(async function(req,res){
        try{
            room.reset_room(function(result){
                if(result.status)
                    res.sendStatus(200)
                else
                    res.status(500).json({
                        "Error" : result.log
                    })
            })
            
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
    })


module.exports = router;