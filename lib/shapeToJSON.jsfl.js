/**
 * User: remcokrams
 * Date: 27-09-15
 * Time: 22:27
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
			json = [];

		do {
			var halfEdge = iterator.current();
			var edge = halfEdge.getEdge();

			if(edge.isLine) { //just a simple line add the point
				var vertex = halfEdge.getVertex();
				addPoint(json, vertex.x, vertex.y);
			}
			else {
				var points = el.getCubicSegmentPoints(edge.cubicSegmentIndex);

				//first point is the "move to" or "line to" point
				var p = points.shift();
				addPoint(json, p.x, p.y);

				json.push({
					x1 : points[0].x,
					y1 : points[0].y,

					x2 : points[1].x,
					y2 : points[1].y,

					x : points[2].x,
					y : points[2].y
				});

				iterator.next();
			}

		} while(iterator.next());
	}
})();