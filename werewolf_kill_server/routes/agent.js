var express = require('express');
var agent = require('../models/agent');
var router = express.Router();

router.route('/api/agent/:room_name/:user_name')
    .post(async function (req, res){
        try{
            result =  await agent.create_agent(req.params.room_name, req.params.user_name , req.header('Authorization') , req.body , function (result){
                if(result.status)
                // res.status(200).json(result)
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

router.route('/api/agent/:room_name/:user_name/:agent_name')
    .delete(async function (req, res){
        try{
            result =  await agent.delete_agent(req.params.room_name, req.params.user_name , req.header('Authorization') , req.params.agent_name , function (result){
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

router.route('/api/agent/:room_name/:save_record_or_not')
    .get(async function (req, res){
        try{
            if(global.game_list.hasOwnProperty(req.params.room_name)){
                global.game_list[req.params.room_name]['save_agent_data'] = (req.params.save_record_or_not === "1")
                res.sendStatus(200)
            }
            else
                res.sendStatus(500)
                
        } catch(e){
            console.log(e);
            res.sendStatus(500)
        }
    })

module.exports = router;