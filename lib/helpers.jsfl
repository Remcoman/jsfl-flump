
var helpers = (function () {
	var exports = {};
	
	var getFilterRadius = function (el, origin) {
		if(el.elementType !== "instance") {
			return origin;
		}
		
		if(el.filters) {
			el.filters.forEach(function (filter) {
				if(!filter.enabled) {
					return;
				}

				switch(filter.name) {
					case "dropShadowFilter" :
						if(filter.inner) {
							return;
						}
						var angleRad = filter.angle * (Math.PI/180)
						var xOffset = Math.cos(angleRad) * filter.distance;
						var yOffset = Math.sin(angleRad) * filter.distance;
						origin.x = Math.max(origin.x, filter.blurX - xOffset);
						origin.y = Math.max(origin.y, filter.blurY - yOffset);
						break;
					
					case "glowFilter" :
						//TODO
						break;
				}
			});
		}
		
		el.libraryItem.timeline.layers.forEach(function (layer) {
			layer.frames[0].elements.forEach(function (childElement) {
				getFilterRadius(childElement, origin);
			});
		});
		
		return origin;
	}
	
	exports.getPosition = function (el) {
		var m = el.matrix;
		var p = el.getTransformationPoint();
		var tx = p.x * m.a + p.y * m.c + m.tx;
		var ty = p.x * m.b + p.y * m.d + m.ty;
		return {x : tx, y : ty}; 
	}
	
	exports.getTextureOrigin = function (el) {
		var origin = {x : 0, y : 0};
		getFilterRadius(el, origin);
		origin.x += el.x - el.left;
		origin.y += el.y - el.top;
		return origin;
	}
	
	return exports;
})();

