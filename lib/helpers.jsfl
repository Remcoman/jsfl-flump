﻿
var helpers = (function () {
	var exports = {};
	
	var getFilterRadius = function (el, origin) {
		if(el.elementType !== "instance") { //this element can't have filters
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
						var angleRad = filter.angle * (Math.PI/180);
						var xOffset = Math.cos(angleRad) * filter.distance;
						var yOffset = Math.sin(angleRad) * filter.distance;
						origin.x = Math.max(origin.x, filter.blurX - xOffset); //for blurX = 60, origin.x = 60
						origin.y = Math.max(origin.y, filter.blurY - yOffset);
						break;
					
					case "glowFilter" :
						//TODO
						break;
				}
			});
		}
		
		if(el.libraryItem.symbolType === "movie clip") {
			el.libraryItem.timeline.layers.forEach(function (layer) {
				layer.frames[0].elements.forEach(function (childElement) {
					getFilterRadius(childElement, origin);
				});
			});
		}
		
		return origin;
	}
	
	var hasStrokesOrFilters = function (el) {
		if(el.filters && el.filters.length) {
			return true;
		}
		
		if(el.elementType === "shape") {
			return el.edges.some(function (edge) {
				return edge.stroke.thickness > 0;
			});
		}
		
		if(el.libraryItem && el.libraryItem.timeline) {
			return el.libraryItem.timeline.layers.some(function (layer) {
				return layer.frames[0].elements.some(hasStrokesOrFilters);
			});
		}
		
		return false;
	}	
	
	exports.getPosition = function (el) {
		var m = el.matrix;
		var p = el.getTransformationPoint();
		var tx = p.x * m.a + p.y * m.c + m.tx;
		var ty = p.x * m.b + p.y * m.d + m.ty;
		return {x : tx, y : ty}; 
	}
	
	exports.getTextureOriginInner = function (doc, el) {
		var x = el.x, y = el.y, origins = [];
		
		for(var i=0, c = el.libraryItem.timeline.layers[0].frameCount;i < c;i++) {
			doc.selection = [el];
			doc.clipCopy();
			doc.clipPaste(true);
			
			try {
				var duplicate = doc.selection[0];
				duplicate.symbolType = "graphic";
				duplicate.firstFrame = i;
				
				doc.convertSelectionToBitmap(); //convert! now we know the size of the element with the filters and strokes
				var bmp = doc.selection[0]; //this should be the bitmap
				
				origins.push({x : x - bmp.left, y : y - bmp.top});
				
				//cleanup
				doc.library.deleteItem(bmp.libraryItem.name);
			}
			catch(e) {}
		}
		
		return origins;
	}
	
	//get the real texture origins by copying the element and then converting that object to a bitmap.
	exports.getTextureOrigin = function (doc, el) {
		var x = el.x, y = el.y, originX = 0, originY = 0;
		
		//if(!hasStrokesOrFilters(el) {
			//return {x : x - el.left, y : y - el.top};
		//}

		doc.selection = [el];
		doc.clipCopy();
		doc.clipPaste(true);
		
		try {
			doc.convertSelectionToBitmap(); //convert! now we know the size of the element with the filters and strokes
			var duplicate = doc.selection[0]; //this should be the bitmap
			originX = x - duplicate.left;
			originY = y - duplicate.top;
		}
		catch(e) {} //make sure 

		//cleanup
		doc.library.deleteItem(duplicate.libraryItem.name);
		
		return {x : originX, y : originY};
	}
	
	return exports;
})();

