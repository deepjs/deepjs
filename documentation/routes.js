/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../deep"], function(require, deep) {

	// sitemap of content that is used to produce routed views tree (IOC from deep-routes).
	return {
		home: {
			navigation: false,
			route: "/$",
			how: '<div/>'
		},
		layers: {
			subs: {
				overview: {
					route: "/layers/$",
					how: "docs::/pages/layers/overview.html"
				},
				"up-bottom": {
					how: "docs::/pages/layers/up-bottom.html"
				},
				compositions: {
					how: "docs::/pages/layers/compositions.html"
				},
				colliders: {
					how: "docs::/pages/layers/colliders.html"
				},
				flatten: {
					how: "docs::/pages/layers/flatten.html"
				},
				shared: {
					how: "docs::/pages/layers/shared.html"
				},
				classes: {
					how: "docs::/pages/layers/classes.html"
				}
			}
		},
		queries: {
			subs: {
				overview: {
					route: "/queries/$",
					how: "docs::/pages/queries/overview.html"
				},
				query: {
					separated: true,
					how: "docs::/pages/queries/deep-query.html"
				},
				rql: {
					how: "docs::/pages/queries/rql.html"
				},
				traversal: {
					separated: true,
					how: "docs::/pages/queries/traversal.html"
				},
				selectors: {
					how: "docs::/pages/queries/selectors.html"
				},
				descriptors: {
					separated: true,
					how: "docs::/pages/queries/nodes.html"
				}
			}
		},
		chains: {
			subs: {
				overview: {
					route: "/chains/$",
					how: "docs::/pages/chains/overview.html"
				},
				fundamentals: {
					how: "docs::/pages/chains/base.html"
				},
				promise: {
					how: "docs::/pages/chains/promises.html"
				},
				identities: {
					how: "docs::/pages/chains/identities.html"
				},
				deep: {
					separated: true,
					label: "deep chain",
					how: "docs::/pages/chains/deep.html"
				},
				patterns: {
					separated: true,
					label: "usage patterns",
					how: "docs::/pages/chains/subtilities.html"
				},
				others: {
					separated: true,
					label: "other chains",
					how: "docs::/pages/chains/others.html"
				}
			}
		},
		context: {
			subs: {
				overview: {
					route: "/context/$",
					how: "docs::/pages/context/overview.html"
				},
				base: {
					how: "docs::/pages/context/base.html"
				},
				logger: {
					how: "docs::/pages/context/logger.html"
				}
			}
		},
		protocols: {
			subs: {
				overview: {
					route: "/protocols/$",
					how: "docs::/pages/protocols/overview.html"
				},
				base: {
					how: "docs::/pages/protocols/base.html"
				},
				natives: {
					how: "docs::/pages/protocols/natives.html"
				},
				templates: {
					separated: true,
					how: "docs::/pages/protocols/templates.html"
				},
				nodejs: {
					how: "docs::/pages/protocols/nodejs.html"
				},
				browser: {
					how: "docs::/pages/protocols/browser.html"
				}
			}
		},
		sheets: {
			subs: {
				overview: {
					route: "/sheets/$",
					how: "docs::/pages/sheets/overview.html"
				},
				base: {
					how: "docs::/pages/sheets/base.html"
				},
				sheeter: {
					label: "deep-sheeter",
					how: "docs::/pages/sheets/sheeter.html"
				}
			}
		},
		ocm: {
			subs: {
				concepts: {
					route: "/ocm/$",
					how: "docs::/pages/ocm/introduction.html"
				},
				modes: {
					how: "docs::/pages/ocm/modes.html"
				},
				compilation: {
					how: "docs::/pages/ocm/compilation.html"
				},
				classes: {
					how: "docs::/pages/ocm/classes.html"
				},
				design: {
					separated: true,
					label: "design patterns",
					how: "docs::/pages/ocm/design.html"
				},
			}
		},
		utils: {
			subs: {
				log: {
					how: "docs::/pages/utils/log.html"
				},
				interpret: {
					how: "docs::/pages/utils/interpret.html"
				},
				deepLoad: {
					how: "docs::/pages/utils/deepload.html"
				},
				"json-schema": {
					how: "docs::/pages/utils/schema.html"
				},
				errors: {
					how: "docs::/pages/utils/errors.html"
				},
				"media-cache": {
					label: "media cache",
					how: "docs::/pages/protocols/cache.html"
				},
				tests: {
					how: "docs::/pages/tests.html",
					run: function(verbose) {
						var $ = deep.$();
						deep.Unit.run(null, {
							verbose: verbose ? true : false
						})
						.done(function(report) {
							// console.log("report : ", report);
							report.reports = null;
							$("#reports-container").html("<div>Tests result : <pre class='dp-box'>" + JSON.stringify(report, null, ' ') + '</pre></div>')
								.slideDown(200);
						});
					}
				}
			}
		},
		restful: {
			separated: true,
			subs: {
				overview: {
					route: "/restful/$",
					how: "docs::/pages/restful/overview.html"
				},
				collection: {
					how: "docs::/pages/restful/collection.html"
				},
				object: {
					how: "docs::/pages/restful/object.html"
				},
				validation: {
					how: "docs::/pages/restful/validation.html"
				},
				constraints: {
					how: "docs::/pages/restful/constraints.html"
				},
				relations: {
					how: "docs::/pages/restful/relations.html"
				},
				ocm: {
					how: "docs::/pages/restful/ocm.html"
				},
				chain: {
					label: "restful chain",
					how: "docs::/pages/restful/chain.html"
				},
				wrappers: {
					separated: true,
					how: "docs::/pages/restful/wrappers.html"
				}
			}
		},
		views: {
			separated: true,
			subs: {
				overview: {
					route: "/views/$",
					how: "<div>views basics</div>"
				},
				api: {
					how: "docs::/pages/views/api.html"
				},
				"dom-protocol": {
					label: "dom.xxx",
					how: "docs::/pages/views/dom-protocol.html"
				},
				directives: {
					how: "docs::/pages/views/directives.html"
				},
				concurrency: {
					how: "docs::/pages/views/concurrency.html"
				},
				"dom-sheeter": {
					label: "dom.sheeter",
					how: "docs::/pages/views/dom-protocol.html"
				}
			}
		},
		routes: {
			subs: {
				overview: {
					route: "/routes/$",
					how: "<div>routes basics</div>"
				},
				path: {
					how: "docs::/pages/routes/path.html"
				},
				map: {
					how: "docs::/pages/routes/map.html"
				},
				ocm: {
					how: "docs::/pages/routes/ocm.html"
				}
			}
		},
		more: {
			separated: true,
			subs: {
				overview: {
					route: "/more/$",
					how: '<div>you could install one of the 5 environnements or try online one of the 2 other sandboxes (autobahn and browser)</div>'
				},
				environnements: {
					how: "docs::/pages/more/environnements.html"
				},
				sandboxes: {
					how: "docs::/pages/more/sandboxes.html"
				},
				tutorials: {
					how: "docs::/pages/more/tutorials.html"
				},
				discussions: {
					how: "docs::/pages/more/discussions.html"
				}
			}
		}
	};
});