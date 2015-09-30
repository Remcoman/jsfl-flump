/**
 * Converts shapes to json
 */
var shapeToJSON = (function () {

	var addPoint = function (jsonArray, x,y) {
		var p = {x : x, y : y, type : jsonArray.length === 0 ? "M" : "L"};
		jsonArray.push(p);
	}

	var createHalfEdgesIterator = function (contour) {
		var firstHalfEdge = contour.getHalfEdge(), //get the start half edge
			halfEdge = firstHalfEdge;

		return {
			next : function () {
				if(halfEdge) {
					if(contour.orientation === 1) {
						halfEdge = halfEdge.getNext();
					}
					else {
						halfEdge = halfEdge.getPrev();
					}

					if(halfEdge.id === firstHalfEdge.id) {
						halfEdge = null;
					}
				}

				return halfEdge;
			},

			current : function () {
				return halfEdge;
			}
		}
	}

	return function (el) {
		var contour = el.contours[0], //TODO more contours?
			iterator = createHalfEdgesIterator(contour),
			json = [], point,
            halfEdge, edge;

		do {
			halfEdge = iterator.current();
			edge = halfEdge.getEdge();

			if(edge.isLine) { //just a simple line add the point
                point = halfEdge.getVertex();
				addPoint(json, point.x, point.y);
			}
			else {
				var points = el.getCubicSegmentPoints(edge.cubicSegmentIndex);

				//first point is the "move to" or "line to" point
                point = points.shift();
				addPoint(json, point.x, point.y);

                //now add the cubic bezier
				json.push({
                    type : "C",

					x1 : points[0].x,
					y1 : points[0].y,

					x2 : points[1].x,
					y2 : points[1].y,

					x : points[2].x,
					y : points[2].y
				});

                //we need to go to the other half edge (we don't want to stay on this edge
				iterator.next();
			}

		} while(iterator.next());
	}
})();