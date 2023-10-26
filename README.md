## Clone the whole project , including the following repo
### 1. api server(in this repo [werewolf_kill_server](werewolf_kill_server)) 
### 2. [Wolf frontend](https://github.com/Sunny1928/wolf.git)
### 3. [Werewolf game grpc server](https://github.com/yeeecheng/werewolf_kill.git)
### 4. [Agent grpc server](https://github.com/Yui-Arthur/generative_agent_with_werewolf_kill.git)
```
git --recurse-submodules clone https://github.com/Yui-Arthur/werewolf_kill_server.git
```

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
1. api server 
```bash
cd werewolf_kill_server 
node app.js # localhost:8001
```
2. werewolf game grpc server
```bash
cd werewolf_kill
python server.py # localhost:50051
```
3. agent grpc server
```bash
cd generative_agent_with_werewolf_kill
python server.py # localhost:50051
```
4. open http://localhost:8001