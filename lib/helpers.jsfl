
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

	exports.matrixToTransform = function (matrix, transformPoint, outTransform) {
		outTransform.skewY = Math.atan2(matrix.b, matrix.a);
		outTransform.skewX = Math.atan2(-matrix.c, matrix.d);
		outTransform.scaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
		outTransform.scaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);
		outTransform.x = transformPoint.x * matrix.a + transformPoint.y * matrix.c + matrix.tx;
		outTransform.y = transformPoint.x * matrix.b + transformPoint.y * matrix.d + matrix.ty;
		
		return outTransform;
	}
	
	exports.matrixMultiply = function (m1,m2) {
		var m3 = {a : 1, b : 0, c : 0, d : 1, tx : 0, ty : 0};
		
		var a1 = m1.a;
		var b1 = m1.b;
		var c1 = m1.c;
		var d1 = m1.d;
		if (m2.a != 1 || m2.b != 0 || m2.c != 0 || m2.d != 1) {
			m3.a  = a1*m2.a+c1*m2.b;
			m3.b  = b1*m2.a+d1*m2.b;
			m3.c  = a1*m2.c+c1*m2.d;
			m3.d  = b1*m2.c+d1*m2.d;
		}
		m3.tx = a1*m2.tx+c1*m2.ty+m1.tx;
		m3.ty = b1*m2.tx+d1*m2.ty+m1.ty;
		
		return m3;
	}

	/**
	 * @param el
	 * @returns {{x: number, y: number}}
	 */
	exports.getPosition = function (el) {
		var m = el.matrix;
		var p = el.getTransformationPoint();
		var tx = p.x * m.a + p.y * m.c + m.tx;
		var ty = p.x * m.b + p.y * m.d + m.ty;
		return {x : tx, y : ty}; 
	}

	/**
	 * @param doc
	 * @param el
	 * @returns {Array}
	 */
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

	/**
	 * @param doc
	 * @param el
	 * @returns {{x: number, y: number}}
	 */
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
		catch(e) {}

		//cleanup
		doc.library.deleteItem(duplicate.libraryItem.name);
		
		return {x : originX, y : originY};
	}
	
	return exports;
})();

