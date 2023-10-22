var express = require('express');
var game = require('../models/game');
var router = express.Router();

router.route('/api/game/:room_name')
    .get(async function (req, res){
        try{
            if(await game.check_game_room(req.params.room_name))
                res.status(200).json(global.game_list[req.params.room_name])
            else
                res.status(404).json({
                    "Error" : "Room not found"
                })
            
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
    })

router.route('/api/game/:room_name/role/:user_name')
    .get(async function (req, res){

        try{     
            result =  await game.get_role(req.params.room_name, req.params.user_name , req.header('Authorization'))
            if(result.status)
                res.status(200).json({
                    game_info : result.game_info,
                    player_id : result.player_id
                })
            else
                res.status(500).json({
                    Error : result.log
                })
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
        

    })

router.route('/api/game/:room_name/information/')
    .get(async function (req, res){

        try{     
            result =  await game.get_all_information(req.params.room_name, req.header('Authorization'))
            if(result.status)
                res.status(200).json(result.player_info)
            else
                res.status(500).json({
                    Error : result.log
                })
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
        

})

router.route('/api/game/:room_name/information/:user_name')
    .get(async function (req, res){

        try{     
            result =  await game.get_information(req.params.room_name, req.params.user_name , req.header('Authorization'))
            if(result.status)
                res.status(200).json(result.player_info)
            else
                res.status(500).json({
                    Error : result.log
                })
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
        

    })

router.route('/api/game/:room_name/operation/:user_name')
    .post(async function (req , res){

        try{     
            game.send_player_operation(req.params.room_name, req.params.user_name , req.header('Authorization') , req.body , function (result){

                if(result.status)
                    res.sendStatus(200)
                else
                    res.status(500).json({
                        Error : result.log
                    })
            })
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }

    })

router.route('/api/game/:room_name/skip/:stage/:user_name')
    .get(async function (req , res){

        try{     
            result = await game.skip_stage(req.params.room_name, req.params.stage  , req.header('Authorization') , req.params.user_name)

            if(result.status)
                res.sendStatus(200)
            else
                res.status(500).json({
                    Error : result.log
                })
            
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }

    })



module.exports = router;