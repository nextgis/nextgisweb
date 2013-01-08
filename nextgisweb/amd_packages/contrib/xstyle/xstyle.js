if(typeof define == "undefined"){
	(function(){
		// pseudo passive loader
		var modules = {};
		define = function(id, deps, factory){
			for(var i = 0;i < deps.length; i++){
				deps[i] = modules[deps[i]];
			}
			modules[id] = factory.apply(this, deps);
		};
		require = function(deps){
			define("", deps, factory);
		};
	})();
}
define("xstyle/xstyle", ["require"], function (require) {
	"use strict";
	var cssScan = /\s*([^{\}\(\)\/\\'":;]*)(?::\s*([^{\}\(\)\/\\'";]*))?([{\}\(\)\/\\'";]|$)/g;
									// name: value 	operator
	var singleQuoteScan = /((?:\\.|[^'])*)'/g;
	var doubleQuoteScan = /((?:\\.|[^"])*)"/g;
	var commentScan = /\*\//g;
	var nextId = 0;
	var undef, testDiv = document.createElement("div");
	function search(tag){
		var elements = document.getElementsByTagName(tag);
		for(var i = 0; i < elements.length; i++){
			checkImports(elements[i]);
		}
	}
	function toStringWithoutCommas(){
		return this.join('');
	}
	function arrayWithoutCommas(array){
		array.toString = toStringWithoutCommas;
		return array;
	}
	var ua = navigator.userAgent;
	var vendorPrefix = ua.indexOf("WebKit") > -1 ? "-webkit-" :
		ua.indexOf("Firefox") > -1 ? "-moz-" :
		ua.indexOf("MSIE") > -1 ? "-ms-" :
		ua.indexOf("Opera") > -1 ? "-o-" : "";
	function checkImports(element, callback, fixedImports){
		var sheet = element.sheet || element.styleSheet;
		var needsParsing = sheet.needsParsing, // load-imports can check for the need to parse when it does it's recursive look at imports 
			cssRules = sheet.rules || sheet.cssRules;
		function fixImports(){
			// need to fix imports, applying load-once semantics for all browsers, and flattening for IE to fix nested @import bugs
			require(["./load-imports"], function(load){
				load(element, function(){
					checkImports(element, callback, true);
				});
			});
		}
		if(sheet.imports && !fixedImports && sheet.imports.length){
			// this is how we check for imports in IE
			return fixImports();
		}
		if(!needsParsing){
			for(var i = 0; i < cssRules.length; i++){								
				var rule = cssRules[i];
				if(rule.href && !fixedImports){
					// it's an import (for non-IE browsers)
					return fixImports();
				}
				if(rule.selectorText && rule.selectorText.substring(0,2) == "x-"){
					// an extension is used, needs to be parsed
					needsParsing = true;
					if(/^'/.test(rule.style.content)){
						// this means we are in a built sheet, and can directly parse it
						// TODO: parse here
					}
				}
			}
		}
		if(needsParsing){
			// ok, determined that CSS extensions are in the CSS, need to get the source and really parse it
			parse(sheet.localSource || sheet.ownerElement.innerHTML, sheet, callback);
		}
	}
	function parse(textToParse, styleSheet, callback) {
		// normalize the stylesheet.
		if(!styleSheet.addRule){
			// only FF doesn't have this
			styleSheet.addRule = function(selector, style, index){
				return this.insertRule(selector + "{" + style + "}", index >= 0 ? index : this.cssRules.length);
			}
		}
		if(!styleSheet.deleteRule){
			styleSheet.deleteRule = styleSheet.removeRule;
		}
	
	
		var handlers = {property:{}};
		function addHandler(type, name, module){
			var handlersForType = handlers[type] || (handlers[type] = {});
			handlersForType[name] = module;
		}
		function addExtensionHandler(type){
			if(!handlers[type]){
				handlers[type] = {};
			}
			addHandler("selector", 'x-' + type, {
				onRule: function(rule){
					rule.eachProperty(function(name, value){
						var asString = value.toString();
						do{
							var parts = asString.match(/([^, \(]+)(?:[, ]+(.+))?/);
							if(!parts){
								return;
							}
							var first = parts[1];
							if(first == 'require'){
								return addHandler(type, name, value[1].args[0]);
							}if(first == "default"){
								if((type == "property" && typeof testDiv.style[name] == "string")){
									return;
								}
								if(type == "pseudo"){
									try{
										document.querySelectorAll("x:" + name);
										return;
									}catch(e){}
								}
							}else if(first == "prefix"){
								if(typeof testDiv.style[vendorPrefix + name] == "string"){
									return addHandler(type, name, 'xstyle/xstyle');
								}
							}else{
								return addHandler(type, name, function(){
									return value;
								});
							}
						}while(asString = parts[2]);
	/*						var ifUnsupported = value.charAt(value.length - 1) == "?";
							value = value.replace(/require\s*\(|\)\??/g, '');
							if(!ifUnsupported || typeof testDiv.style[name] != "string"){ // if conditioned on support, test to see browser has that style
								// not supported as a standard property, now let's check to see if we can support it with vendor prefixing
								if(ifUnsupported && typeof testDiv.style[vendorPrefix + name] == "string"){
									// it does support vendor prefixing, fix it with that
									value = 'xstyle/xstyle';
								}
								addHandler(type, name, value);
							}*/
					});
				}
			});
		}
		addExtensionHandler("property");
		addExtensionHandler("function");
		addExtensionHandler("pseudo");
		var waiting = 1;
		var baseUrl = (styleSheet.href || location.href).replace(/[^\/]+$/,'');
		var properties = [], values = [];
		var valueModules = {};
		
		var convertedRules = [];
		var valueRegex = new RegExp("(?:^|\\W)(" + values.join("|") + ")(?:$|\\W)");
		function Rule(){}
		Rule.prototype = {
			eachProperty: function(onProperty){
				var properties = this.properties || 0;
				for(var i = 0; i < properties.length; i++){
					var name = properties[i];
					onProperty(name || 'unnamed', properties[name]);
				}
			},
			fullSelector: function(){
				return (this.parent ? this.parent.fullSelector() : "") + (this.selector || "") + " ";  
			},
			newRule: function(name){
				return (this.rules || (this.rules = {}))[name] = new Rule();
			},
			newCall: function(name){
				return new Call(name);
			},
			addSheetRule: function(selector, cssText){
console.log("add", selector, cssText);
				if(cssText){
					styleSheet.addRule ?
						styleSheet.addRule(selector, cssText) :
						styleSheet.insertRule(selector + '{' + cssText + '}', styleSheet.cssRules.length);
				}
			},
			onRule: function(){
				if(!this.parent.root){
					this.addSheetRule(this.selector, this.cssText);
				}
			},
			addProperty: function(name, property){
				if(!name && property[0].charAt(0) == '='){
					name = "-x-content";
					property[0] = property[0].slice(1);
				}
				var properties = (this.properties || (this.properties = []));
				properties.push(name);
				properties[name] = property;
			},
			cssText: ""
		};
		function Call(value){
			this.caller = value;
			this.args = [];
		}
		var CallPrototype = Call.prototype = new Rule;
		CallPrototype.addProperty = function(name, value){
			this.args.push(value);
		};
		CallPrototype.toString = function(){
			return '(' + this.args + ')'; 
		};
		
		var target, root = new Rule;
		root.root = true;
		root.css = textToParse;
		root.parse = parseSheet;
		
		function onProperty(name, value) {
			//TODO: delete the property if it one that the browser actually uses
			// this is called for each CSS property
			if(name){
				var propertyName = name;
				do{
					var handlerForName = handlers.property[name];
					if(handlerForName){
						return handler(handlerForName, "onProperty", propertyName, value);
					}
					name = name.substring(0, name.lastIndexOf("-"));
				}while(name);
			}
		}
		function onCall(identifier, value){
			var handlerForName = handlers['function'][identifier];
			if(handlerForName){
				handler(handlerForName, "onCall", identifier, value, value.args);
			}
		}
		function onRule(selector, rule){
			rule.onRule();
			var handlerForName = handlers.selector[selector];
			if(handlerForName){
				handler(handlerForName, "onRule", rule);
			}
		}
		function onPseudo(pseudo, rule){
			var handlerForName = handlers.pseudo[pseudo];
			if(handlerForName){
				handler(handlerForName, "onPseudo", pseudo, rule);
			}
		}
		
		function handler(module, type, name, value){
			if(module){
				var rule = target;
				var ruleHandled = function(text){
					if(text){
						/* TODO: is the a way to determine the index deterministically?
						var cssRules = styleSheet.rules || styleSheet.cssRules;
						for(var index = rule.index || 0; index < cssRules.length; index++){
							if(cssRules[index].selectorText == rule.fullSelector(){
								break;
							}
						}*/
						/* TODO: merge IE filters
						if(isIE){
							var filters = [];
							convertedText = convertedText.replace(/filter: ([^;]+);/g, function(t, filter){
								filters.push(filter);
								return "";
							});
							if(filters.length){
								console.log("filters", filters);
								convertedText = "zoom: 1;filter: " + filters.join("") + ";" + convertedText;
							}
						}
						*/
						styleSheet.addRule(rule.fullSelector(), text);
					}
					finishedLoad();
				};
				
				waiting++;
				var onLoad = function(module){
					try{
						var result = module[type](name, value, rule, styleSheet);
						if(result && result.then){
								// a promise, return immediately defer handling
							result.then(ruleHandled, handleError);
						}else{
							ruleHandled(result);
						}
						var noError = true;
					}finally{
						if(!noError){
							handleError();
						}
					}
					function handleError(error){
						// Add some error handling to give developers a better idea of where error occurs.
						// TODO: Add line number, and file name
						console.error("Error occurred processing " + type.slice(2) + ' ' + name + ' in rule ' + rule.selector + ' {' + rule.cssText);
						if(error){
							console.error(error);
						}
					}
				}
				typeof module == "string" ? require([module], onLoad) : onLoad(module);					
			}
		}
		var stack = [root];
		function parseSheet(textToParse, styleSheet){
			// parse the CSS, finding each rule
			function addInSequence(operand){
				if(sequence){
					// we had a string so we are accumulated sequences now
					sequence.push ? operand && sequence.push(operand) : typeof sequence == 'string' && typeof operand == 'string' ? sequence += operand : sequence = arrayWithoutCommas([sequence, operand]);				
				}else{
					sequence = operand;
				}
			}
			target = root;
			cssScan.lastIndex = 0; // start at zero
			var ruleIndex = 0;
			while(true){
				var match = cssScan.exec(textToParse);
				var operator = match[3],
					first = match[1].trim(),
					value = match[2],
					name, sequence, assignNextName;
					value = value && value.trim();
				if(assignNextName){
					// first part of a property
					name = typeof value == 'string' && first;
					sequence = value = value || first;
					if(name || operator != '/'){
						// as long we haven't hit an initial comment, we have the assigned property name now, and don't need to assign again
						assignNextName = false;
					}
				}else{
					// subsequent part of a property
					value = value ? first + ':' + value : first;
					addInSequence(value);	
				}
				switch(operator){
					case "'": case '"':
						var quoteScan = operator == "'" ? singleQuoteScan : doubleQuoteScan;
						quoteScan.lastIndex = cssScan.lastIndex;
						var parsed = quoteScan.exec(textToParse);
						if(!parsed){
							error("unterminated string");
						}
						var str = parsed[1];
						cssScan.lastIndex = quoteScan.lastIndex;
						// push the string on the current value and keep parsing
						addInSequence(new String(str));
						continue;
					case '/':
						// we parse these in case it is a comment
						if(textToParse[cssScan.lastIndex] == '*'){
							// it's a comment, scan to the end of the comment
							commentScan.lastIndex = cssScan.lastIndex + 1;
							commentScan.exec(textToParse);
							cssScan.lastIndex = commentScan.lastIndex; 
						}else{
							// not a comment, keep the operator in the accumulating string
							addInSequence('/');
						}
						continue;
					case '\\':
						// escaping sequence
						var lastIndex = quoteScan.lastIndex++;
						addInSequence(textToParse.charAt(lastIndex));
						continue;
					case '(': case '{':
						var newTarget;
						if(operator == '{'){
							assignNextName = true;					
							addInSequence(newTarget = target.newRule(value));
							if(target.root){
								newTarget.cssRule = styleSheet.cssRules[ruleIndex++];
							}
							// todo: check the type
							if(sequence[0].charAt(0) == '='){
								sequence.creating = true;
							}
						}else{
							addInSequence(newTarget = target.newCall(value));
						}
						newTarget.parent = target;
						if(sequence.creating){
							newTarget.selector = '.x-generated-' + nextId++;
						}else{
							newTarget.selector = target.root ? value : target.selector + ' ' + value;
						}
						target.currentName = name;
						target.currentSequence = sequence;
						stack.push(target = newTarget);
						target.operator = operator;
						target.start = cssScan.lastIndex,
						target.selector && target.selector.replace(/:([-\w]+)/, function(t, pseudo){
							onPseudo(pseudo, target);
						});
						name = null;
						sequence = null;
						continue;
				}
				if(sequence){
					var first = sequence[0];
					if(first.charAt && first.charAt(0) == "@"){
						// directive
						if(sequence[0].slice(1,7) == "import"){
							var importedSheet = styleSheet.cssRules[ruleIndex++].styleSheet;
							waiting++;
							// preserve the current index, as we are using a single regex to be shared by all parsing executions
							var currentIndex = cssScan.lastIndex;
							parseSheet(importedSheet.localSource, importedSheet);
							cssScan.lastIndex = currentIndex;
						}
					}else{ 
						target.addProperty(name, sequence);
					}
				}
				name = null;
	//			}
				switch(operator){
					case '}': case ')':
						var ruleText = textToParse.slice(target.start, cssScan.lastIndex - 1);
						target.cssText = ruleText;
						if(operator == '}'){
							onRule(target.selector, target);
							if(target.selector.slice(0,2) != "x-"){
								target.eachProperty(onProperty);
							}
						}else{
							onCall(target.caller, target);
						}
						stack.pop();
						target = stack[stack.length - 1];				
						sequence = target.currentSequence;
						name = target.currentName;
						break;
					case "":
						// no operator means we have reached the end
						callback && callback();
						return;
					case ';':
						sequence = null;
						assignNextName = true;
				}
			}
		}
		parseSheet(textToParse,styleSheet);
		function finishedLoad(){
			if(--waiting == 0){
				if(callback){
					callback(styleSheet);
				}
			}
		}		
		finishedLoad(target);
	}
	search('link');
	search('style');
	var xstyle =  {
		process: checkImports,
		vendorPrefix: vendorPrefix,
		onProperty: function(name, value){
			// basically a noop for most operations, we rely on the vendor prefixing in the main property parser 
			if(name == "opacity" && vendorPrefix == "-ms-"){
				return 'filter: alpha(opacity=' + (value * 100) + '); zoom: 1;';
			}
			return vendorPrefix + name + ':' + value + ';';
		},
		onCall: function(name, rule){
			// handle extends(selector)
			var args = rule.args;
			var extendingRule = rule.parent;
			var parentRule = extendingRule;
			do{
				var baseRule = parentRule.rules && parentRule.rules[args[0]];
				parentRule = parentRule.parent;
			}while(!baseRule);
			var newText = baseRule.cssText;
			extendingRule.cssText += newText;
			extendingRule.properties = Object.create(baseRule.properties);
			baseRule.eachProperty(function(name, value){
				if(name){
					var ruleStyle = extendingRule.cssRule.style;
					if(!ruleStyle[name]){
						ruleStyle[name] = value;
					}
				}
			});
		},
		parse: parse
	};
	return xstyle;

});
