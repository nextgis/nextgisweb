// TODO: eventually maybe we can probably get rid of put-selector dependency
define(['../elemental', 'put-selector/put'], function(elemental, put){
	var nextId = 0;
	return {
		onProperty: function(name, value, rule){
			elemental.addRenderer(name, value, rule, function(element){
				var lastElement = element;
				for(var i = 0, l = value.length;i < l; i++){
					var part = value[i];
					if(part.eachProperty){
						put(lastElement, part.selector);
						elemental.update(lastElement);
					}else if(typeof part == 'string'){
						if(part.charAt(0) == '='){
							part = part.slice(1); // remove the '=' at the beginning					
						}
						var children = part.split(',');
						for(var j = 0, cl = children.length;j < cl; j++){
							var child = children[j].trim();
							if(child){
								lastElement = put(j == 0 ? lastElement : element, child);
								elemental.update(lastElement);
							}
						}
					}else{
						lastElement.appendChild(document.createTextNode(part));
					}			
				}
			});
		}
	}
});