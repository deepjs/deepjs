/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
define(["require", "deepjs/deep", "deepjs/lib/unit", "deepjs/lib/views/view", "deepjs/lib/stores/collection", "deepjs/lib/stores/object", "deepjs/lib/schema"], function(require, deep, Unit){
	console.log("start app-sndbx");
	var init = function()
	{
		console.log("app-sndbx intialised");
		$("#run-core-units").click(function(e){
			e.preventDefault();
			deep.Unit.run(null, {verbose:false})
			.done(function(report){
				console.log("report : ", report);
				report.reports = null;
				$("#reports-container").html("<pre>"+JSON.stringify(report,null, ' ')+'</pre>');
			});
		});
		$("#run-core-units-verbose").click(function(e){
			e.preventDefault();
			deep.Unit.run(null, {verbose:true})
			.done(function(report){
				console.log("report : ", report);
				report.reports = null;
				$("#reports-container").html("<pre>"+JSON.stringify(report,null, ' ')+'</pre>');
			});
		});
	};
	return init;
});

