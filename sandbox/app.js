/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
define(["require", "deepjs/deep", "deepjs/deep-unit"], function(require, deep, Unit){
	console.log("start app-sndbx");
	var init = function()
	{
		console.log("app-sndbx intialised");
		$("#run-core-units").click(function(e){
			e.preventDefault();
			Unit.run(deep.coreUnits)
			.done(function(report){
				console.log("report : ", report);
				$("#reports-container").html("<pre>"+JSON.stringify(report,null, ' ')+'</pre>');
			});
		});
	};
	return init;
});

