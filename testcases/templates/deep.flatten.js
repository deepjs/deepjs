var a = {
    obj:{},
    myFunc:function(){
        console.log("base myFunc");
        this.obj.a = true;
    }
}

var b = {
	backgrounds:[a],
	myFunc:deep.compose.after(function()
	{
		console.log("myFunc of b : ", this)
		this.obj.b = true;
	})
}

/*
deep(b)
.flatten()
.run("myFunc")
.run(function(){
    var report = deep.utils.deepEqual(this.obj, {
        a:true,
        b:true
    });
     console.log("run test : ", report)
})
*/


deep({
    sub:{
        backgrounds:[b]
    }
    
})
.flatten()
.query("/sub")
.run("myFunc")
.run(function(){
    var report = deep.utils.deepEqual(this.obj, {
        a:true,
        b:true
    });
    console.log("run test : ", report)
})



