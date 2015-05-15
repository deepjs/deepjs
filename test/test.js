/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
if (typeof require !== 'undefined')
	var chai = require("chai"),
		decompose = require("../index");

var expect = chai.expect;

describe("collider replace", function() {

	var a = {
		b: {
			c: [1, 2, 3]
		}
	};
	var c = {
		b: collider.replace([4, 5], "./c")
	};
	compiler.up(a, c);

	it("should", function() {
		expect(JSON.stringify(a)).equals('"{"b":{"c":[4,5]}}"');
	});
});

describe("bottom_ocm", function() {
	var ocm = deep.ocm({
		a: {
			hello: "world"
		}
	});
	compiler.abottom({
		a: {
			second: true
		}
	}, ocm);
	var res = ocm("a");
	it("should", function() {
		expect(b).to.deep.equal({
			second: true,
			hello: "world"
		});
	});
});

describe("flatten ocm 1", function() {
	var autre = {
		test: {
			b: {
				yee: true
			}
		}
	};
	var obj = {
		_backgrounds: [autre],
		test: deep.ocm({
			a: {
				title: "hello a"
			},
			b: {
				_backgrounds: ["this::../a"],
				titleb: "bye"
			}
		})
	};

	/**
                * IE8 : result  {
                "titleb": "bye",
                "yee": true,
                "title": "hello a"
                },
                * @type {[type]}
                */
	var tt = obj.test;
	return deep.nodes(obj)
		.flatten()
		.done(function(success) {
			return tt("b");
		})
		.equal({
			title: "hello a",
			yee: true,
			titleb: "bye"
		});
	it("should", function() {
		expect(something).equals("somethingElse");
	});
});

/*
	replace2: function() {
		var a = {
			b: [1, 2, 3]
		};
		var c = {
			b: deep.collider.replace([4, 5])
		};
		return deep.nodes(a).up(c).equal({
			b: [4, 5]
		});
	},
	remove: function() {
		var a = {
			test: deep.collider.remove()
		};
		return deep.nodes({
				test: {
					myVar: true
				}
			})
			.up(a)
			.equal({});
	},
	remove2: function() {
		var a = {
			test: deep.collider.remove("./myVar")
		};
		return deep.nodes({
				test: {
					myVar: true
				}
			})
			.up(a)
			.equal({
				test: {}
			});
	},
	equal: function() {
		var a = {
			test: deep.collider.equal("hello world")
		};
		return deep.nodes({
				test: "hello world"
			})
			.up(a)
			.equal({
				test: "hello world"
			});
	},
	equal2: function() {
		var a = {
			test: deep.collider.equal("hello world")
		};
		return deep.nodes({
				test: "hello"
			})
			.up(a)
			.fail(function(e) {
				if (e.status == 412)
					return "lolipop";
			})
			.equal("lolipop");
	},
	chainable: function() {
		return deep.nodes({
				test: {
					a: "yep",
					myArray: [67]
				}
			})
			.up({
				test: deep.collider.replace("bloup", "./a")
					.up({
						lolipop: true
					})
					.bottom({
						myArray: [34]
					})
			})
			.equal({
				test: {
					myArray: [34, 67],
					a: "bloup",
					lolipop: true
				}
			});
	}
*/