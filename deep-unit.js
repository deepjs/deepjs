if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","./deep"], function (require, deep) {

    function Unit(unit, options){
        if(unit)
            deep.utils.up(unit, this);
        this.options = options || {};
        //console.log("Unit created : ", this);
        this.tests  = this.tests || {};
    }

    Unit.prototype = {
        _deep_unit_:true,
        title:"Generic tests",
        stopOnError:true,
        options:null,
        setup : function(options){

        },
        clean : function(options){

        },
        run : function(tests, options){
            options = options || {};
            tests = tests || [];
            if(!tests.forEach)
                tests = [tests];
            var context = options.context || this.options.context || {};
            //console.log("unit context : ", context);
            var functions = deep.query(this.tests, "./["+tests.join(",")+"]", { resultType:"full" });
            var numberOfTests = functions.length;
            var stopOnError = this.stopOnError;
            if(typeof options.stopOnError !== 'undefined')
                stopOnError = options.stopOnError;
            if(console.group)
                console.group("unit : "+this.title);
            console.log("\n\n**********************************************************");
            console.log("*****  deep-unit : will run : ", this.title, " *****");
            console.log("\tStop on error ? ", stopOnError );
            console.log("\tNumber of tests : ",functions.length,"\n" );
            //console.log("\tContext : ",context,"\n\n" );
            var self = this;

            var results = [];
            var errors = [];
            var d = deep.when(this.setup(context, options));

            var applyTest = function(fn){
                console.log("\n- unit test runned : ", fn.key);
                console.time(fn.key);
                return deep.when(fn.value.call(context))
                .always(function(s,e){
                    console.timeEnd(fn.key);
                    if(e)
                    {
                        console.error("****** test failed ! ******* : ",fn.key, " error : ", e);
                        errors.push({
                            unit:self.title,
                            test:fn.key,
                            error:e
                        });
                    }
                    else
                        console.log("\tok !");
                });
            };
            var done = function(r){
                results.push(r);
                if(functions.length > 0)
                    d.when(applyTest(functions.shift())).done(done).fail(fail);
            };
            var fail = function(error){
                //console.log("_______________________________________________ unit test fail : ",error);
                results.push(error);
  
                deep.utils.dumpError(error);
                if(!stopOnError && functions.length > 0)
                    d.when(applyTest(functions.shift())).done(done).fail(fail);
                return true;
            };
            d.done(function(){
                console.log("\tsetup done.");
                console.time("unit");
                this.when(applyTest(functions.shift()))
                .done(done)
                .fail(fail);
            })
            .always(function(s,e)
            {
                //console.log("_______________________________________________ unit test result : ",s,e);
                console.log("\n*************", self.title, " : time ****************");
                console.timeEnd("unit");
                if(e || results.length < numberOfTests || errors.length > 0)
                    console.warn("*************",self.title," : FAILED **************");
                else
                    console.log("*************",self.title," : PASSED **************");
                
                if(errors.length > 0)
                {
                    console.log("\n\tErrors : ");
                    console.log("\t", e || errors);
                }

                console.log("\n\tNumber of tests : ", numberOfTests);
                console.log("\tsuccess : ", results.length-errors.length,"/",numberOfTests);
                console.log("\tfails : ", errors.length,"/",numberOfTests);
                console.log("\tommited : ", numberOfTests-results.length,"/",numberOfTests);
                
                return self.clean(context, options);
            })
            .always(function(s,e){
                if(e)
                    console.log("error while cleanin test : ",self.title, " : ", e);
                console.log("\n**************", self.title, " cleaned **************");
                console.log("***********************************************************");
                if(console.groupEnd)
                    console.groupEnd();
                return {
                    title:self.title,
                    numberOfTests:numberOfTests,
                    success:results.length-errors.length,
                    fails:errors.length,
                    ommited:numberOfTests-results.length,
                    //results:results,
                    errors:errors,
                    valid:((errors.length === 0) && (results.length == numberOfTests))
                };
            });
            return d;
        }
    };

  
    Unit.run = function(units, options){
        console.log("\n*******************************************************************");
        console.log("*************************** Units Bunch ****************************");
        var alls = [];
        units.forEach(function(unit){
            if(typeof unit === 'string')
                alls.push(deep.get(unit));
            else
                alls.push(unit);
        });
        var report = {
            errors:[],
            numberOfUnits:units.length,
            numberOfTests:0,
            success:0,
            fails:0,
            ommited:0
        };
        if(alls.length === 0)
            return deep.when(report);
        return deep.all(alls)
        .done(function(units){
            //console.log("units loaded : ", units);
            var results = [];
            var errors = [];
            var doTest = function(unit){
                console.log("*************** will do unit : ", unit.title);
                return deep.when(unit.run("*",options));
            };
            console.time("bunch");
            var d = deep.when(doTest(units.shift()));
            var always = function(s,e){
                if(e)
                    report.errors.push(e);
                report.success += s.success;
                report.fails += s.fails;
                report.ommited += s.ommited;
                report.numberOfTests += s.numberOfTests;
                report.errors = report.errors.concat(s.errors);
                results.push(s);
                if(units.length > 0)
                    d.when(doTest(units.shift())).always(always);
                return true;
            };
            return d.always(always)
            .always(function(s,e){
                console.log("\n\n\n*******************************************************************");
                console.log("************************** Bunch time : ***************************");
                console.timeEnd("bunch");
                if(e)
                    console.log("error while executings tests bunch : ", e);
                console.log("*******************************************************************");
                console.log("********** tests bunch arrived to end : final report : ************");
                console.log("\n",report,"\n");
                console.log("*******************************************************************\n");
                return report;
            });
        })
        .fail(function(error){
            console.error("deep : Unit bunch failed to load : ", e);
        });
    };

    deep.Unit = Unit;

    return Unit;
});

