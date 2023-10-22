setInterval(() => {
    $.ajax({
        type:'GET',
        url: `http://140.127.208.185:8001/api/room`,
        success: function(info){
            
            console.log(info)

        },
        error: function(err){
            console.log('error')
        }
    })
} , 100)


setInterval(() => {

    const user_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiJBMTA5NTVQWVNZIiwicm9vbV9uYW1lIjoiQTEwOTU1UFlTWSIsImxlYWRlciI6dHJ1ZSwiaWF0IjoxNjkxNjU0NTcxLCJleHAiOjE3MDAyOTQ1NzF9._6lU40QFRogdrjozyZIF8wVVJetoFUcuxeekJaQ_c6U"

    
    $.ajax({
        type:'GET',
        url: `http://140.127.208.185:8001/api/game/TESTROOM/information/yui`,
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', `Bearer ${user_token}`);
        },
        success: function(info){
            
            console.log(info)
        },
        error: function(err){

            console.log(err)
        }
    })
} , 100) 