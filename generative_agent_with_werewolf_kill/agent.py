
import requests
import threading
import logging
import openai
import sys      

class agent():
    def __init__(self , openai_token = None , pyChatGPT_token = None , 
                 server_url = "140.127.208.185" , agent_name = "Agent1" , room_name = "TESTROOM" , 
                 color = "f9a8d4"):
        
        self.record = []
        self.server_url = server_url
        self.name = agent_name
        self.room = room_name
        self.color = color
        self.user_token = None
        self.role = None
        self.chat_func = None
        self.current_info = None
        self.logger = logging.getLogger(__name__)

        # if pyChatGPT_token is not None: self.__pyChatGPT_init__(pyChatGPT_token)
        if openai_token is not None: self.__openai_init__(openai_token)
        
        self.__logging_setting__()
        self.__join_room__()
        self.__check_room_state__()

    def chat(self , prompt):
        print(self.chat_func(prompt))


    def __openai_init__(self , openai_token):
        """openai api setting , can override this"""
        openai.api_type = "azure"
        openai.api_base = "https://werewolf-kill-agent.openai.azure.com/"
        openai.api_version = "2023-07-01-preview"
        openai.api_key = openai_token

        self.chat_func = self.__openai_send__

    def __openai_send__(self , prompt):
        """openai api send prompt , can override this."""
        response = openai.ChatCompletion.create(
            engine="test",
            messages = [
                {"role":"system","content":"You are an AI assistant that helps people find information."},
                {"role":"user","content":prompt}
            ],
            temperature=0.7,
            max_tokens=800,
            top_p=0.95,
            frequency_penalty=0,
            presence_penalty=0,
            stop=None)
        
        return response['choices'][0]['message']['content']
    
    def __process_data__(self , data):
        """the data proccess , must override this."""
        print(data)
        pass

    def __logging_setting__(self):
        """logging setting , can override this."""
        log_format = logging.Formatter('[%(asctime)s] [%(levelname)s] - %(message)s')
        self.logger.setLevel(logging.DEBUG)

        handler = logging.FileHandler(filename=f'logs/{self.name}_{self.room}.log', encoding='utf-8' , mode="w")
        handler.setLevel(logging.DEBUG)   
        handler.setFormatter(log_format)
        self.logger.addHandler(handler)   

        handler = logging.StreamHandler(sys.stdout)    
        handler.setLevel(logging.DEBUG)                                        
        handler.setFormatter(log_format)    
        self.logger.addHandler(handler)   

        logging.getLogger("requests").propagate = False

    def __join_room__(self):

        try :
            r = requests.get(f'{self.server_url}/api/join_room/{self.room}/{self.name}/{self.color}' , timeout=5)
            if r.status_code == 200:
                self.user_token = r.json()["user_token"]
                self.logger.debug("Join Room Success")
                self.logger.debug(f"User Token : {self.user_token}")
            else:
                self.logger.warning(f"Join Room Error : {r.json()}")
        
        except :
            self.logger.warning("Server Error")

    def quit_room(self):
        r = requests.get(f'{self.server_url}/api/quit_room/{self.room}/{self.name}' , headers ={
            "Authorization" : "Bearer {self.user_token}"
        })

        if r.status_code != 200:
            self.logger.warning(f"Quit Room Error : {r.json()}")

    def __check_room_state__(self):
        try:
            r = requests.get(f'{self.server_url}/api/room/{self.room}' , timeout=3)

            if r.status_code == 200 and r.json()["room_state"] == "started":
                self.logger.debug("Game Start")
                self.__get_role__()
                self.__check_game_state__()
            else:
                threading.Timer(5.0, self.__check_room_state__).start()
        except:
            self.logger.warning("Server Error")

    def __check_game_state__(self):
        try:
            r = requests.get(f'{self.server_url}/api/game/{self.room}/information/{self.name}' ,  headers ={
            "Authorization" : "Bearer {self.user_token}"
            } , timeout=3)

            if r.status_code == 200:
                if self.current_info != r.json():
                    self.current_info = r.json()
                    self.logger.debug(r.json())
                    self.__process_data__(self.current_info) 
            else:
                self.logger.warning(r.json())

            threading.Timer(1.0, self.__check_game_state__).start()
        except:
            self.logger.warning("Server Error")

    def __get_role__(self):
        try:
            r = requests.get(f'{self.server_url}/api/game/{self.room}/role/{self.name}' , headers ={
                "Authorization" : "Bearer {self.user_token}"
            } , timeout=5)

            if r.status_code == 200:
                self.role = r.json()["game_info"]["user_role"]
                self.logger.debug(f"Agent Role: {self.role}")
            else:
                self.logger.warning(f"Get role Error : {r.json()}")
        except:
            self.logger.warning("Server Error")

    
    

class yui_agent(agent):
    def __init__(self, openai_token=None, pyChatGPT_token=None):
        super().__init__(openai_token, pyChatGPT_token)
    
    

if __name__ == "__main__":
    a = agent(server_url = "http://localhost:8001" , openai_token="")
    # a.chat("""""")