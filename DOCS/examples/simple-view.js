
    var form = {
		add : function(id)
        {
            var self = this;
            $("#form-title").html("Add entry ");
            return deep.ui.toJSONBind(deep.Validator.createDefault(entrySchema), "#item-form", entrySchema)
            .done(function(binder){
				$('<button>save</button>')
				.appendTo("#item-form")
				.click(function(e){
					e.preventDefault();
					self.save(true);
				});
			});
        },
        edit : function(id)
        {
            var self = this;
            $("#form-title").html("Edit : "+id);
            return deep.get("entry::"+id)
            .done(function(object){
                return deep.ui.toJSONBind(object, "#item-form", entrySchema, {
                    delegate:function(controller, property)
                    {
                        return self.save();
                    }
                });
            })
            .fail(function(e){
                console.log("error while retrieving datas : ", e.status, e.report || e);
            });
        },
        save : function(post){
            var self = this;
            return deep.ui.fromJSONBind("#item-form", entrySchema)
            .done(function(output){
				console.log("form save output = ", output);
                var d = deep.rest("entry");
                if(post)
					d.post(output);
                else
					d.put(output);
                d.done(function(success){
                    console.log("object saved : ", success);
                    $("#form-title").html("");
                    $("#item-form").html("");
                    timeline.refresh();
                })
                .fail(function(e){
                    console.log("error while sending datas : ", e);
                });
            })
            .fail(function(e){
                console.log("error while collecting datas : ", e.status, e.report || e);
            });
        }
    };
