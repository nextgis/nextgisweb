/*
    Handles CSS variables per http://dev.w3.org/csswg/css-variables/
*/
define([],function(vendor){
	return {
		onFunction: function(name, value, rule){
			return rule.get('var-' + value);
		}
	};
});

