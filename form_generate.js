// Create a new form, then add a checkbox question, a multiple choice question,
// a page break, then a date question and a grid of questions.
function newGameForm(){
    // get form
    var form = FormApp.openById('1bEYWs1RljyhDcFqzJPFh2Uq6Bqb6rMFTWQfY32tnB7M');
    // read game info
    var form_files = DriveApp.getFilesByName(`form.txt`);
    for(var i=1; i<=10; i++){
        if(form_files.hasNext()){
            file = form_files.next()
            game_info = file.getBlob().getDataAsString().split('\n')
            form.addPageBreakItem().setTitle(`第${i}場遊戲`)
        
            var cur_day = "0";
            var cur_info = ""
            game_info.pop()
            // read all info in the game
            for(var info of game_info){
                var [day , op , chat] = info.split('/')
                // new day item
                if(cur_day != day){
                    info_process(form , cur_info)
                    if(cur_info!= "")
                        cur_info = ""
                    day_init(form , day)
                    cur_day = day
                }
            
                switch (op){
                    case "died_dialogue" :
                    case "dialogue":{
                        info_process(form , cur_info)
                        if(cur_info!= "")
                            cur_info = ""
                        
                        dialogue_process(form , chat)
                        break
                    }
                    case "vote" :
                    case "died" : {
                        cur_info += chat + "\n"
                    }
                }
  
            }

        
        info_process(form , cur_info)
        guess_roles_item(form)
  
        
      }
      
    }
}
function day_init(form , day){
    if(day != "1") guess_roles_item(form)
    var item = form.addSectionHeaderItem().setTitle(`第${day}天`)
}

function dialogue_process(form , chat){
    Logger.log(chat)
    var item = form.addSectionHeaderItem().setTitle(chat.split(':')[0]).setHelpText(chat.split(':')[1])
}

function info_process(form , info){
    if(info != "") {
        Logger.log(info)
        var item = form.addSectionHeaderItem().setTitle("遊戲資訊").setHelpText(info)
    }
}

function guess_roles_item(form){
    var checkboxGridItem = form.addGridItem();
    checkboxGridItem.setTitle('猜測身分').setHelpText("好人及神職為半對喔！")
    .setRows(['0號玩家' , '1號玩家' , '2號玩家' , '3號玩家' , '4號玩家' , '5號玩家' , '6號玩家'])
    .setColumns(['好人' , "神職" ,"狼人" , "預言家" , "女巫" , "獵人" , "平民"])
    .setRequired(true)
}
  
  
  