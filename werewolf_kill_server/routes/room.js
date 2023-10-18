var express = require('express');
var room = require('../models/room');
var router = express.Router();
var config = require('../conf');

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
            var color = ["#fda4af" , "#f9a8d4" , "#f0abfc" , "#d8b4fe" , "#c4b5fd" , "#818cf8" , "#93c5fd"]
            // clear timer
            for(const [room_name, timer] of Object.entries(global.game_timer)){
                clearInterval(timer["timer"])
                delete global.game_timer[room_name]
            }
            
            global.room_list = {}
            global.room_list["TESTROOM"] = {
                "room_name": "TESTROOM",
                "room_leader": "yui",
                "room_user": [
                    "yui" , "pinyu" , "yeeecheng" , "sunny" , "a" , "b" //, "c"
                ],
                "user_color" : [
                    "#fda4af" , "#f9a8d4" , "#f0abfc" , "#d8b4fe" , "#c4b5fd" , "#818cf8" //, "#93c5fd"
                ],
                "room_state" : "ready",
                "game_setting": config.default_setting[7],
                "last_used" : Date.now()
            }

            for(var i = 0; i <5; i++){
                for(var j = 5; j <= 6 ; j++)
                    global.room_list[`TESTROOM_${i}_${j}`] = {
                        "room_name": `TESTROOM_${i}_${j}`,
                        "room_leader": "Player_1",
                        "room_user": Array.from({length: j}, (_, i) => `Player_${i + 1}`),
                        "user_color" : Array.from({length: j}, (_, i) => color[i]),
                        "room_state" : "ready",
                        "game_setting": config.default_setting[7],
                        "last_used" : Date.now()
                    }
            }

            res.sendStatus(200)
            
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
    })


module.exports = router;