
var helpers = (function () {
	var exports = {};
	
	/**
	 *
	 * @param {Object} matrix
	 * @param {{x : number, y : number}} transformPoint
	 * @param {Object} outTransform
	 * @returns {Object}
	 */
	exports.matrixToTransform = function (matrix, transformPoint, outTransform) {
		outTransform.skewY = Math.atan2(matrix.b, matrix.a);
		outTransform.skewX = Math.atan2(-matrix.c, matrix.d);
		outTransform.scaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
		outTransform.scaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);
		outTransform.x = transformPoint.x * matrix.a + transformPoint.y * matrix.c + matrix.tx;
		outTransform.y = transformPoint.x * matrix.b + transformPoint.y * matrix.d + matrix.ty;
		
		return outTransform;
	}

	/**
	 *
	 * @param {Object} m1
	 * @param {Object} m2
	 * @returns {Object}
	 */
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

		doc.selectNone();
		doc.selection = [el]; //doc.selection adds to current selection!

		doc.clipCopy();
		doc.clipPaste(true);

		try {
			doc.convertSelectionToBitmap(); //convert! now we know the size of the element with the filters and strokes
			var duplicate = doc.selection[0]; //this should be the bitmap
			originX = x - duplicate.left;
			originY = y - duplicate.top;
		}
		catch(e) {
			fl.trace(e.message);
		}

		doc.library.deleteItem(duplicate.libraryItem.name);
		
		return {x : originX, y : originY};
	}
	
	return exports;
})();

