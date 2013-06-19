deep("js::deep/deep2")
.done(function(deep){
    //console.profile("deep2");
    smart = deep.ocm("smart");
    
    smart
    .add("app", "brol",{
        //backgrounds:["smart-common/login"],
        "public":{
            myProp:"from app pub"
        },
        user:{
            myProp:"from app user"
        },
        admin:{
            myProp:"from app admin"
        }
    })
    .add("gui",{
        "public":{
            test:["pub"]
        },
        user:{
            backgrounds:["this::../public"],
            test:["usr"]
        },
        admin:{
            backgrounds:["this::../user"],
            test:["adm"]
        },
        dev:{
            test:["dev"]
        }
    })
    .stores()
    .up({
        "public":{
            campaign:{
                schema:{
                    type:"string"
                },
                get:function(id, options)
                {
                    return "GET campaign : "+id;
                }
            }
        },
        user:{
            campaign:{
                backgrounds:["this::../../public/campaign"],
                post:function(obj, options)
                {
                    return deep(obj, this.schema)
                    .validate()
                    .delay(1000)
                    .done(function(){
                        return "POST campaign : "+JSON.stringify(obj);
                    });
                }
            }
        }
    });
    
    smart.flatten()
    .done(function(s)
    {
      //  console.log("flattened : ",s);
        //
        deep.generalMode("public");
        //
        console.log("gui pub ? ",smart().gui.test);
        ///
        console.log("gui usr,dev ? ",smart("user", "dev").gui.test); 
        //
        console.log("gui pub ? ",smart().gui.test);
        //
        smart.mode("admin");
        console.log("gui admin ? ",smart().gui.test); 
        //
        smart.mode(null);
        console.log("gui pub ? ",smart().gui.test); 
        //
        deep.mode("admin","dev")
        .delay(100)
        .done(function(s){
            console.log("gui admin/dev ? ",smart().gui.test);
            deep("smart.gui::/test").log()
        });
        //
        console.log("gui pub ? ",smart().gui.test);
        //
        deep("smart.gui::/test").log()
        
        deep("smart.campaign::1").log()
        
        //
        deep("yessssss").mode("user").store("smart.campaign").post().log()
        //
        deep("smart.campaign::1").log()
        deep("store::smart.campaign").log("__________ PUB CAMPAIGN STORE : ").log();
        
        //
        deep.generalMode("user");
        //
        
        deep("store::smart.campaign").log("__________ USR CAMPAIGN STORE : ").log();
        deep.store("smart.campaign").post("roooooooooooo").log();  
        //
        smart().store("campaign").post("riiiiiii").log();
        
        //________________________________ APP
        deep("brol::/myProp").log();
        deep("smart.app::/myProp").log();
    });
   // console.profileEnd("deep2");
}) 