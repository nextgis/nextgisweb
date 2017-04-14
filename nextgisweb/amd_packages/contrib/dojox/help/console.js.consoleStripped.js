// wrapped by build app
define("dojox/help/console", ["dojo","dijit","dojox","dojo/require!dojox/help/_base"], function(dojo,dijit,dojox){
dojo.provide("dojox.help.console");
dojo.require("dojox.help._base");

dojo.mixin(dojox.help, {
	_plainText: function(str){
		return str.replace(/(<[^>]*>|&[^;]{2,6};)/g, '');
	},
	_displayLocated: function(located){
		var obj = {};
		dojo.forEach(located, function(item){ obj[item[0]] = dojo.isMoz ? { toString: function(){ return "Click to view"; }, item: item[1] } : item[1]; });
		 0 && console.dir(obj);
	},
	_displayHelp: function(loading, obj){
		if(loading){
			var message = "Help for: " + obj.name;
			 0 && console.log(message);
			var underline = "";
			for(var i = 0; i < message.length; i++){
				underline += "=";
			}
			 0 && console.log(underline);
		}else if(!obj){
			 0 && console.log("No documentation for this object");
		}else{
			var anything = false;
			for(var attribute in obj){
				var value = obj[attribute];
				if(attribute == "returns" && obj.type != "Function" && obj.type != "Constructor"){
					continue;
				}
				if(value && (!dojo.isArray(value) || value.length)){
					anything = true;
					 0 && console.info(attribute.toUpperCase());
					value = dojo.isString(value) ? dojox.help._plainText(value) : value;
					if(attribute == "returns"){
						var returns = dojo.map(value.types || [], "return item.title;").join("|");
						if(value.summary){
							if(returns){
								returns += ": ";
							}
							returns += dojox.help._plainText(value.summary);
						}
						 0 && console.log(returns || "Uknown");
					}else if(attribute == "parameters"){
						for(var j = 0, parameter; parameter = value[j]; j++){
							var type = dojo.map(parameter.types, "return item.title").join("|");
							 0 && console.log((type) ? (parameter.name + ": " + type) : parameter.name);
							var summary = "";
							if(parameter.optional){
								summary += "Optional. ";
							}
							if(parameter.repating){
								summary += "Repeating. ";
							}
							summary += dojox.help._plainText(parameter.summary);
							if(summary){
								summary = "  - " + summary;
								for(var k = 0; k < parameter.name.length; k++){
									summary = " " + summary;
								}
								 0 && console.log(summary);
							}
						}
					}else{
						 0 && console.log(value);
					}
				}
			}
			if(!anything){
				 0 && console.log("No documentation for this object");
			}
		}
	}
});

dojox.help.init();
});
