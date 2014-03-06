/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require", "../deep"], function (require, deep) {

    function Unit(unit){
        if(unit)
            deep.utils.up(unit, this);
        //console.log("Unit created : ", this);
        this.tests  = this.tests || {};
    }

    Unit.prototype = {
        _deep_unit_:true,
        title:"Generic tests",
        stopOnError:false,
        options:null,
        setup : function(options){
        },
        clean : function(options){
            delete this.context;
        },
        run : function(tests, options)
        {
            options = options || {};
            tests = tests || [];
            if(!tests.forEach)
                tests = [tests];
            //console.log("unit context : ", context);
            var functions = deep.query(this.tests, "./["+tests.join(",")+"]", { resultType:"full" });
            var numberOfTests = functions.length;
            var stopOnError = this.stopOnError;
            if(typeof options.stopOnError !== 'undefined')
                stopOnError = options.stopOnError;
            if(options.verbose !== false)
            {
                if(console.group)
                    console.group("unit : "+this.title);

                console.log("\n\n**********************************************************");
                console.log("*****  lib/unit : will run : ", this.title, " *****");
                console.log("\tStop on error ? ", stopOnError );
                console.log("\tNumber of tests : ",functions.length,"\n" );
            }
            //console.log("\tContext : ",context,"\n\n" );
            var errors = [];
            var self = this;
            
            if(functions.length === 0)
            {
                if(options.verbose !== false)
                {
                    console.log("**********************************************************");
                    console.log("************* Nothing to do : aborting unit **************");
                    console.log("**********************************************************");
                    if(console.groupEnd)
                        console.groupEnd();
                }
                return {
                    title:self.title,
                    numberOfTests:0,
                    success:0,
                    failure:0,
                    ommited:0,
                    errors:errors,
                    valid:true
                };
            }
            var results = [];
            var d = deep.when(this.setup(options));
            var closure = {};
            var applyTest = function(fn)
            {
                if(options.verbose !== false)
                {
                    console.log("\n- unit test runned : ", fn.key);
                    if(console.time)
                        console.time(fn.key);
                }
                closure.fn = fn;
                return deep.when(fn.value.call(self.context))
                .always(function(s,e){
                    if(options.verbose !== false && console.time)
                        console.timeEnd(fn.key);
                    if(options.verbose !== false)
                        if(e)
                            console.error("****** test failed ! ******* : ",fn.key, " error : ", e, e.report);
                        else
                            console.log("\tok !");
                });
            };
            var done = function(r)
            {
                results.push(r);
                if(functions.length > 0)
                    d.when(applyTest(functions.shift())).done(done).fail(fail);
            };
            var fail = function(error)
            {
                results.push(error);
                 errors.push({
                            unit:self.title,
                            test:closure.fn.key,
                            error:error
                        });
                //deep.utils.dumpError(error);
                if(!stopOnError && functions.length > 0)
                    d.when(applyTest(functions.shift())).done(done).fail(fail);
                return true;
            };
            d.always(function(){
                if(options.verbose !== false)
                {
                    console.log("\tsetup done.");
                    if(console.time)
                        console.time("unit");
                }
            })
            .done(function(context)
            {
                self.context = context || {};
                
                this.when(applyTest(functions.shift()))
                .done(done)
                .fail(fail);
            })
            .always(function(s,e)
            {
                //console.log("_______________________________________________ unit test result : ",s,e);
                if(options.verbose !== false)
                {
                    console.log("\n*************", self.title, " : time ****************");
                    if(console.time)
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
                    console.log("\tfailure : ", errors.length,"/",numberOfTests);
                    console.log("\tommited : ", numberOfTests-results.length,"/",numberOfTests);
                }
                return self.clean();
            })
            .always(function(s,e)
            {
                if(options.verbose !== false)
                {
                    if(e)
                        console.log("error while cleanin test : ",self.title, " : ", e);
                    console.log("\n**************", self.title, " cleaned **************");
                    console.log("***********************************************************");
                    if(console.groupEnd)
                        console.groupEnd();
                }
                return {
                    title:self.title,
                    numberOfTests:numberOfTests,
                    success:results.length-errors.length,
                    failure:errors.length,
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
        options = options || {};
        //if(options.verbose !== false)
        //{
            console.log("\n*******************************************************************");
            console.log("*************************** Units Bunch ****************************");
        //}
        units = units || deep.coreUnits;
        var alls = [];
        if(!units.forEach)
            units = [units];
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
            failure:0,
            ommited:0
        };
        if(alls.length === 0)
            return deep.when(report);
        return deep.all(alls)
        .done(function(units){
            //console.log("units loaded : ", units);
            if(options.profile)
                console.profile("bunch");
            var results = [];
            var errors = [];
            var doTest = function(unit){
                unit = new deep.Unit(unit);
                if(options.verbose !== false)
                    console.log("\n\n\n*************** Executing unit : ", unit.title);
                return deep.when(unit.run("*",options));
            };
            var startTime = new Date().getTime();

            //if(options.verbose !== false)
            if(console.time)
                console.time("bunch");
            var d = deep.when(doTest(units.shift()));
            var always = function(s,e){
                if(e)
                    report.errors.push(e);
                report.success += s.success;
                report.failure += s.failure;
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
                if(options.profile)
                    console.profileEnd("bunch");
                report.time = new Date().getTime() - startTime;
                //if(options.verbose !== false)
                //{
                    console.log("\n\n\n___________________________________________________________________");
                    console.log("\n*******************************************************************");
                    console.log("************************** Bunch time : ***************************");
                    if(console.time)
                        console.timeEnd("bunch");
                    if(e)
                        console.log("error while executings tests bunch : ", e);
                    console.log("*******************************************************************");
                    console.log("********** tests bunch arrived to end : final report : ************");
                    //console.log("\n",report,"\n");
                    console.log("\n\tErrors: ");
                    report.errors.forEach(function (e) {
                        console.log(e.unit+":"+e.test, e.error.toString());
                        if(e.error && e.error.report)
                            console.log("report : ", report.toString());

                    });
                    console.log("\tNumber of units : ", report.numberOfUnits);
                    console.log("\tNumber of tests : ", report.numberOfTests);
                    console.log("\tsuccess : ", report.success,"/",report.numberOfTests);
                    console.log("\tfailure : ", report.failure,"/",report.numberOfTests);
                    console.log("\tommited : ", report.ommited,"/",report.numberOfTests);
                    console.log("\ttime : ", report.time);
                    //console.log(JSON.stringify(report, null, ' '));
                    console.log("\n*******************************************************************");
                    console.log("*******************************************************************");
                    console.log("___________________________________________________________________\n\n");
                //}
                return report;
            });
        })
        .fail(function(error){
            console.error("deep : Unit bunch failed to load : ", error);
        });
    };

    deep.Unit = Unit;

    return Unit;
});

