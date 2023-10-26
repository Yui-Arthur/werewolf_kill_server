## clone the whole project incude [api server](in this repo [werewolf_kill_server](werewolf_kill_server)) , [frontend](https://github.com/Sunny1928/wolf.git) , [werewolf game server](https://github.com/yeeecheng/werewolf_kill.git) , [agent server](https://github.com/Yui-Arthur/generative_agent_with_werewolf_kill.git)
```git --recurse-submodules clone https://github.com/Yui-Arthur/werewolf_kill_server.git```

## run the project
### use docker-compose
1. put your openai api info in ```secret``` , the format need as same as example.key
2. build the docker image & run the container (first time will run about 20 minute)
```bash
docker-compose up --build
```
3. open http://localhost
4. the all logs will save in ```./logs``` 

### run the server respective
```

```