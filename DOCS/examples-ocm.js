    var smart = deep.ocm("smart");
    smart.add("gui",{
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
    .storesUp({
        "public":{
            campaign:{
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
                    return "POST campaign : "+JSON.stringify(obj);
                }
            }
        }
    })
    .flatten()
    .done(function(s){
        
        deep.generalMode("public");
        console.log("flattened : ",s);
        console.log("gui pub ? ",smart().gui.test);
        console.log("gui usr,dev ? ",smart("user", "dev").gui.test); 
        console.log("gui pub ? ",smart().gui.test);
        smart.mode("admin");
        console.log("gui admin ? ",smart().gui.test); 
        smart.mode(null);
        console.log("gui pub ? ",smart().gui.test); 
        
        deep.mode("admin","dev")
        .done(function(s){
            console.log("gui admin/dev ? ",smart().gui.test);
            deep("smart.gui::/test").log()
        });
        
        console.log("gui pub ? ",smart().gui.test);
        
        deep("smart.gui::/test").log().log("________")
        deep("smart.campaign::1").log()
        deep("yeessssss").mode("user").store("smart.campaign").post().log()
        deep("smart.campaign::1").log()
        deep("store::smart.campaign").log();
        deep.generalMode("user");
        deep("store::smart.campaign").log();
        deep.store("smart.campaign").post("roooooooooooo").log();    
        smart().store("campaign").post("riiiiiii").log()
        
        
    });