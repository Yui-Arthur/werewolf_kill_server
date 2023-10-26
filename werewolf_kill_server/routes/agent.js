var express = require('express');
var agent = require('../models/agent');
var router = express.Router();

router.route('/api/agent/:room_name/:user_name')
    .post(async function (req, res){
        try{
            result =  await agent.create_agent(req.params.room_name, req.params.user_name , req.header('Authorization') , req.body , function (result){
                if(result.status)
                res.status(200).json(result)
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

router.route('/api/agent/:room_name/:user_name/:agent_id')
    .delete(async function (req, res){
        try{
            result =  await agent.delete_agent(req.params.room_name, req.params.user_name , req.header('Authorization') , req.params.agent_id , function (result){
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


module.exports = router;