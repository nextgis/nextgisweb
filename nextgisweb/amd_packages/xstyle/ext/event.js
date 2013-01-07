define(['../elemental'], function(elemental){
	var module, hasAddEventListener = !!document.addEventListener;
	return module = {
		onProperty: function(name, value, rule){
			elemental.addRenderer(name, value, rule, function(element){
				module.on(element, name.slice(2), function(e){
	console.log("execute event", value);
				});
			});
		},
		on: hasAddEventListener ? function(target, event, listener){
			// this function can be overriden to provide better event handling
			target.addEventListener(event, listener, false);
		} : 
		function(target, event, listener){ 
			target.attachEvent(event, listener);
		}
	};
});