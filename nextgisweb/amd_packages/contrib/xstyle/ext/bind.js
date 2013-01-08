define(['dbind/bind', 'xstyle/elemental'], function(bind, elemental){
	return module = {
		onProperty: function(name, value, rule){
			if(name == 'bind'){
				// TODO: integrate this so we don't need a different propery name.
				rule.then = function(callback){
						require(value[1].args, function(module){
							callback(bind(module));
						});
					};
			}else{
				var target, variables = [], id = 0, variableLength = 0, waiting = 1, callbacks = [];
				// create a then function for chaining
				rule.then = function(callback){
					if(callbacks){
						callbacks.push(callback);
					}else{
						callback(target);
					}
				}
				function done(){
					if(--waiting == 0){
						if(expression.length > variableLength){
							// it's a full expression, so we create a time-varying bound function with the expression
							target = bind(new Function('return ' + expression)).to(variables);
						}else{
							target = variables[0];
						}
						// and we render any matches
						elemental.addRenderer(name, value, rule, function(element){
							bind(element).to(target);
						});
						for(var i = 0;i < callbacks.length; i++){
							callbacks[i](target);
						}
						callbacks = null;
					}
				}
				var expression = [];
				var parts = value.sort ? value : [value];
				// deal with an array, converting strings to JS-eval'able strings
				for(var i = 0;i < parts.length;i++){
					var part = parts[i];
					expression.push(part instanceof String ? addString(part) : 
						// find all the variables in the expression
						part.replace(/[\w_\.]+/g, function(variable){
							var position = id++;
							// for each reference, we break apart into variable reference and property references after each dot
							var parts = variable.split('.');
							var ruleParent = rule;
							while(!target && (ruleParent = ruleParent.parent)){
								// find the first target referenced
								target = ruleParent.rules[parts[0]];
							}
							if(!target){
								target = window[parts[0]];
							}
							waiting++;
							// wait for each reference
							bind.when(target, function(target){
								for(var i = 1; i < parts.length; i++){
									target = target.get(parts[i]);
								}
								variables[position] = target;
								done();
							});
							return addArgument(position);
							// we will reference the variable a function argument in the function we will create
						})
					);
				}
				expression = expression.join('');
				function addString(part){
					var position = id++;
					variables[position] = part.toString();
					return addArgument(position);
				}
				function addArgument(position){
					var replacement = 'arguments[' + position + ']';
					variableLength += replacement.length;
					return replacement;
				}
				done();
			}
		}
	};
});