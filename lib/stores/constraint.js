
{
		_deep_sheet_:true,
		"dq.up::./post":deep.compose.before(function (content, opt) {
			var schema = this.schema;
			if(schema)
			{
				if(schema._deep_ocm_)
					schema = schema("post");
				if(opt.ownerRestiction || schema.ownerRestiction)
				{
					if(!deep.context || !deep.context.session || !deep.context.session.user)
						return deep.errors.Owner();
					if(!content[opt.ownerRestiction || schema.ownerRestiction])
						content[opt.ownerRestiction || schema.ownerRestiction] = deep.context.session.user.id;
					else if(content[opt.ownerRestiction || schema.ownerRestiction] !== deep.context.session.user.id)
						return deep.errors.Owner();
				}
				deep.nodes.applyTransformers(content, schema);
				var report = null;
				if(this.validate)
					report = this.validate(content, schema, opt);
				else
					report = deep.validate(content, schema);
				if(!report.valid)
					return deep.errors.PreconditionFail("post failed", report);
			}
			return deep.Arguments([content, opt]);
		})
		.around(filterPrivate("post"))
}