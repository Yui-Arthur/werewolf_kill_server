module.exports = {
    SERECT : 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCgUZvDTzzU+0zgQMYsSdw5DL4fj3td7VGoea4rC0pvOMCqn5oE1MHOOfSK6m18VhJHPxIbozA3r98eZ+wNOD154CQQHM+YdWcj4LD9bUKtEmjjt7WmvT1LOlwXAyn7Fr1HxNlCnC89ZJS8M8Yv2aBY3tjLWEpFO1B+g+DW/SC08ud8EL0qpoCXUA2Dds9cYyhK5OjM1EQnsYO4rek1BJgzz6Tets4NvEOL8aaizkM41zRF/gC46YChlPN7T6AGmJANGLNyaOC8noxPTqWQcIc10nFklH/J4TnLYEKMf9SyZ4P/GUiASZjQwYcmmo5yfLteabhUhjglOyKjUMQEPPs9AgMBAAECggEBAIBMzzsezrAj7QIK1I3dDkEZ0Y2wZiplIlSSDLCl+IvJ/2aNE9WJ7w/7kZkaw0QeHcKm1vcHQi9OsGDFCkQKHijLGBFM/VYlnsU3rG0kY5feg9K50sX97G+n5MsF3TL0n8Yv4y9LjwKy29VCGflxUMHOlfEmV0nQjjqxj9599Q7ZkeTKia47iATqT9uM/M9re+RRQodzYIzeTxhcTdc9r6sejM6q75JxE1sqaWkKjisWBSwUFpRzBd//uzZadeKnZnAcBTwLDeW6h0nFcN0wSil4+D49y65DY8OSxFUIeS9wdMWNFfmnIVaDCRT3J3gobBVsLHX1XIzJNGdWtzyGcAECgYEAy4oLaY/TvtwSbtcu2Bnzj4ywKxNrlVaWLKoS6w/QYSWIGVSeul0eqwxXlcI8yj0FcqEisouZVCgm+u8ixBcYEfxYMeVL5G+1vfYVaieac4g5K9dhvbmdBu669R4unB0ZfLpE7ocMosmlOz0zA+/wmGO5Cc4cSlmlng/LchTXx90CgYEAyaPJHyjG7wZvqAQTrbXSaVbl/Iyhf308oPtWjM9l2cQEu+UJ3zjQBIYsPXQSr9ufigdyfK5IFFPqetxaQGGxLiLbvFGGNgKFP2k/0X96gxLz2uoufg+RbRZ7t3Kgz1lHmpuB50uQ3Gx1VBKjYVtD9HG/Ms9Y0EOrERGrmCDDeuECgYBtnCirL25LgT5X/H/YlpkofA4/FFVCdf+ni+tmNPz14/1YDs7v88fZO2tLVe/gxV3Srl3+ItlujbT4O6HQUdN/lBJ2xFHLcjFAXG6J3Uv63ahUKMgVIQkkO5no+NkG71DTb4hBn+65F7hon3uCqks59bInSpzHmWFsLntUM09E7QKBgQCnv+TAUXI+xIH7q3ibmZo1HKA1HOH2aEAaRT7Z4mj/Y/30OzWdSWx1dxIzBe/N8c6mTE/Ivk0k7DM0h0FmMl/u2/0mjEQ1hp9IA82eAonvpcLNqumG4ni/4maGVYzHM6VIUHsf61PWrTxm9yKJCh5crIy+PpXKnaEhkCvLYeZ+wQKBgGr7tv0n82u2rKNiKNHsqqwDGJgbPXwLt31FLjNeHoUAMDDntY5D6hR+NjcAkKHXiM2Rhi+gjYqWQnFOaSbX0L4giBCXqaYlIhseCtEvGCjJZLPo4qjLJo0+AfeLfQfMZEVeXb4UgQECl6w4I6kOlkFwA8g/ODlnAUdEd8oZeef9',
    corsOptions:{
        
        "origin"                : "*",
        "methods"               : "GET,HEAD,PUT,PATCH,POST,DELETE",
        "preflightContinue"     : false,
        "optionsSuccessStatus"  : 204,
        "credentials"           : true
        
    },
    default_setting :{
        6 : {
            "player_num": 6,
            "operation_time" : 30,
            "dialogue_time" : 60,
            "seer" : 1,
            "witch" : 1,
            "village" : 2,
            "werewolf" : 2,
            "hunter" : 0
        },
        7 : {
            "player_num": 7,
            "operation_time" : 100,
            "dialogue_time" : 100,
            "seer" : 1,
            "witch" : 1,
            "village" : 2,
            "werewolf" : 2,
            "hunter" : 1
        },
        8 : {
            "player_num": 8,
            "operation_time" : 30,
            "dialogue_time" : 60,
            "seer" : 1,
            "witch" : 1,
            "village" : 2,
            "werewolf" : 3,
            "hunter" : 1
        },
        9 : {
            "player_num": 9,    
            "operation_time" : 30,
            "dialogue_time" : 60,
            "seer" : 1,
            "witch" : 1,
            "village" : 3,
            "werewolf" : 3,
            "hunter" : 1 
        }
    },
    roleToIndex : {
        "seer" : 0,
        "witch" : 1,
        "village" : 2,
        "werewolf" : 3,
        "hunter" : 4
    },
    indexToRole : {
        0 : "seer",
        1 : "witch",
        2 : "village",
        3 : "werewolf",
        4 : "hunter"
    },
    stageToDescription : {
        "werewolf_dialogue" : "狼人進行討論" ,
        "werewolf" : "狼人請殺人",
        "seer" : "預言家請睜眼，確認查驗身份",
        "witch" : "女巫請睜眼，請問要使用解藥，還是毒藥",
        "dialogue" : "玩家進行討論",
        "vote1" : "玩家進行投票",
        "vote2" : "上局平票，玩家進行第二輪投票",
        "check" : "TBD",
        "hunter" : "TBD",

    },
    role_en2ch : {
        "seer" : "預言家",
        "witch" : "女巫",
        "village" : "村民",
        "werewolf" : "狼人",
        "hunter" : "獵人"
    },
    announcementWaitTime : 5,
    werewolf_server_ip : process.env.werewolf_server_ip || "localhost:50051" ,
    agent_server_ip : process.env.agent_server_ip || "localhost:50052" ,
    jwt_open :  process.env.jwt_open || 0,
    werewolf_realtime_vote_info : process.env.werewolf_realtime_vote_info != undefined ? process.env.werewolf_realtime_vote_info : 1,
    master_token : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiJBMTA5NTVQWVNZIiwicm9vbV9uYW1lIjoiQTEwOTU1UFlTWSIsImxlYWRlciI6dHJ1ZSwiaWF0IjoxNzAwNDIxMTcwLCJleHAiOjE3MDkwNjExNzB9.HuIaq2bjJVxEtqSPDYbnaP1Qtsad56JYpnd9wrC0vGQ",
    agent_record_path : process.env.agent_record_path || "agent_record/record.jsonl",
}