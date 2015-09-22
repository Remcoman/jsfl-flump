include("JSON.jsfl");
include("helpers.jsfl");
include("path.jsfl");
include("motionXMLToJSON.jsfl");

var LibraryJSON = (function () {
	
	var degreesToRadian = function (angle) {
		return angle * (Math.PI/180);
	}
	
	var roundBy = function (num, decimals) {
		var x = Math.pow(10, decimals);
		return Math.round(num * x) / x;
	}
	
	var getKeyframes = function(frames){
		var kfs = [];
		frames.forEach(function (frame, index) {
			if(index == frame.startFrame) {
				kfs.push({frame : frame, index : index});
			}
		});
		return kfs;
	}

	var sign = function (n) {
		return (n > 0 ? 1 : (n < 0 ? -1 : 0));
	}
	
	var exports	= function (doc) {		
		this.movies = [];
		this.textureGroups = [];
		this.frameRate = doc.frameRate;
	}

	exports.prototype = {
		_groupTextureFramesByImg : function () {
			var group = {};
			this.textureFrames.forEach(function (frame) {
				var frameList = group[frame.img];
				if(!frameList) {
					frameList = group[frame.img] = [];
				}
				frameList.push(frame);
			});
			return group;
		},
		
		_groupTextureFramesBySymbol : function () {
			var group = {};
			this.textureFrames.forEach(function (frame) {
				group[frame.symbol] = frame;
			});
			return group;
		},
		
		_writeAtlas : function (textureGroupJSON, img, frames) {
			var atlasJSON = {file : img, textures : []};
			
			frames.forEach(function (frame) {
				atlasJSON.textures.push({
					origin : frame.origin, 
					rect : frame.rect,
					symbol : frame.symbol
				});
			});

			textureGroupJSON.atlases.push(atlasJSON);
		},
		
		_writeFlipbookFrames : function (layerJSON, movieId, layer) {
			layer.frames.forEach(function (frame, index) {
				var origin = this.textureFramesBySymbol[movieId + "#" + index].origin;
				
				var kfJSON = {
					duration : 1, 
					index : index, 
					ref : movieId + "#" + index,
					tweened : false,
					pivot : [roundBy(origin.x, 4), roundBy(origin.y, 4)]
				};
				
				layerJSON.keyframes.push(kfJSON);
			}, this);
		},

		/**
		 * Based on code of https://github.com/tconkling/flump/blob/master/exporter/src/main/as/flump/xfl/XflLayer.as
		 * @private
		 */
		_normalizeSkewsInKeyFrames : function (jsonKeyFrames) {
			for(var i= 0, c = jsonKeyFrames.length-1;i < c;i++) {
				var kfJSON = jsonKeyFrames[i],
					nextKfJSON = jsonKeyFrames[i+1];

				if (kfJSON.skew[0] + Math.PI < nextKfJSON.skew[0]) {
					nextKfJSON.skew[0] += -Math.PI * 2;
				}
				else if (kfJSON.skew[0] - Math.PI > nextKfJSON.skew[0]) {
					nextKfJSON.skew[0] += Math.PI * 2;
				}

				if (kfJSON.skew[1] + Math.PI < nextKfJSON.skew[1]) {
					nextKfJSON.skew[1] += -Math.PI * 2;
				}
				else if (kfJSON.skew[1] - Math.PI > nextKfJSON.skew[1]) {
					nextKfJSON.skew[1] += Math.PI * 2;
				}
			}
		},

		_applyAdditionalRotation : function (jsonKeyFrames, flashKeyFrames) {
			var additionalRotation = 0;

			for(var i= 0, c = jsonKeyFrames.length-1;i < c;i++) {
				var kfJSON = jsonKeyFrames[i],
					nextKfJSON = jsonKeyFrames[i+1],
					flashKf = flashKeyFrames[i];

				if(flashKf.motionTweenRotate !== "none") {
					var direction = flashKf.motionTweenRotate === "clockwise" ? 1 : -1;
					direction *= sign(nextKfJSON.scale[0]) * sign(nextKfJSON.scale[1]);

					while (direction < 0 && kfJSON.skewX < nextKfJSON.skewX) {
						nextKfJSON.skewX -= Math.PI * 2;
					}
					while (direction > 0 && kfJSON.skewX > nextKfJSON.skewX) {
						nextKfJSON.skewX += Math.PI * 2;
					}
					while (direction < 0 && kfJSON.skewY < nextKfJSON.skewY) {
						nextKfJSON.skewY -= Math.PI * 2;
					}
					while (direction > 0 && kfJSON.skewY > nextKfJSON.skewY) {
						nextKfJSON.skewY += Math.PI * 2;
					}

					additionalRotation += flashKf.motionTweenRotateTimes * Math.PI * 2 * direction;
				}

				nextKfJSON.skew[0] += additionalRotation;
				nextKfJSON.skew[1] += additionalRotation;
			}
		},
		
		_writeKeyFrames : function (layerJSON, layer) {
			var keyframes = getKeyframes(layer.frames);

			keyframes.forEach(function (kf) {
				var frame = kf.frame;
				var kfJSON = {duration : frame.duration, index : kf.index};
				
				layerJSON.keyframes.push(kfJSON);
				
				if(!frame.elements.length) {
					return;
				}
				
				var element = frame.elements[0];
			
				if(!element.libraryItem) {
					return;
				}
				
				kfJSON.ref = element.libraryItem.name;
				
				var pos = helpers.getPosition(element);
				kfJSON.loc = [roundBy(pos.x, 3), roundBy(pos.y, 3)];
				
				if(element.scaleX !== 1 || element.scaleY !== 1) {
					kfJSON.scale = [roundBy(element.scaleX, 4), roundBy(element.scaleY, 4)];
				}
				
				if(element.skewX !== 0 || element.skewY !== 0) {
					kfJSON.skew = [roundBy(degreesToRadian(element.skewX), 4), roundBy(degreesToRadian(element.skewY), 4)];
				}
				
				if(element.colorAlphaPercent !== 100) {
					kfJSON.alpha = roundBy(element.colorAlphaPercent / 100, 4);
				}
				
				if(kf.name) {
					kfJSON.label = kf.name;
				}
				
				var transformPoint = element.getTransformationPoint();
				kfJSON.pivot = [roundBy(transformPoint.x, 4), roundBy(transformPoint.y, 4)];

				if(frame.tweenType !== "none") {
					if(frame.isMotionObject()) {
						kfJSON.motionEase = motionXMLToJSON(frame.getMotionObjectXML());
						kfJSON.ease = 0;
					}
					else if(frame.hasCustomEase) {
						//kfJSON.customEase = ;
					}
					else {
						kfJSON.ease = -frame.tweenEasing / 100; //flump gets the acceleration which is the inverse of tweenEasing
					}
				}
				else {
					kfJSON.tweened = false;
				}

				if(!element.visible) {
					kfJSON.visible = false;
				}
			}, this);

			this._normalizeSkewsInKeyFrames(layerJSON.keyframes);
			this._applyAdditionalRotation(layerJSON.keyframes, keyframes);
		},

		_writeInterpolatedFrames : function (layerJSON, layer) {
			var transform = {},
				pivot = {},
				flashKeyFrame = null,
				kfJSON = {};

			layer.frames.forEach(function (frame, index) {
				if(!frame.startFrame) {
					return; //empty frame!
				}

				if(frame.startFrame === index) { //keyframe
					var element = frame.elements[0];

					kfJSON.ref = element.libraryItem.name;
					kfJSON.visible = element.visible;

					var transformPoint = element.getTransformationPoint();
					pivot.x = transformPoint.x;
					pivot.y = transformPoint.y;
					kfJSON.pivot = [roundBy(pivot.x, 4), roundBy(pivot.y, 4)];

					flashKeyFrame = frame;
				}

				if(frame.tweenType === "none") {
					return;
				}

				var matrix = flashKeyFrame.tweenObj.getGeometricTransform(index - flashKeyFrame.startFrame);
				helpers.matrixToTransform(matrix, pivot, transform);

				var colorTransform = flashKeyFrame.tweenObj.getColorTransform(index - flashKeyFrame.startFrame);

				var fJSON = {
					tweened : false,
					index : index,
					duration : 1,
					pivot : kfJSON.pivot,
					ref : kfJSON.ref
				};

				if(!kfJSON.visible) {
					fJSON.visible = false;
				}

				fJSON.loc = [roundBy(transform.x, 3), roundBy(transform.y, 3)];

				if(transform.scaleX !== 1 || transform.scaleY !== 1) {
					fJSON.scale = [roundBy(transform.scaleX, 4), roundBy(transform.scaleY, 4)];
				}

				if(transform.skewX !== 0 || transform.skewY !== 0) {
					fJSON.skew = [roundBy(transform.skewX, 4), roundBy(transform.skewY, 4)];
				}

				if(colorTransform.colorAlphaPercent !== 100) {
					fJSON.alpha = roundBy(colorTransform.colorAlphaPercent / 100, 4);
				}

				layerJSON.keyframes.push(fJSON);
			});
		},
		
		_writeLayer : function (movieJSON, layer, isFlipbookLayer) {
			var layerJSON = {name : layer.name, keyframes : []};

			if(layer.layerType === "guided") {
				//for guided layers we will just write every keyframe to the json. Is there a better way?
				this._writeInterpolatedFrames(layerJSON, layer);
			}
			else if(!!isFlipbookLayer) {
				layerJSON.flipbook  = true;
				this._writeFlipbookFrames(layerJSON, movieJSON.id, layer);
			}
			else {
				this._writeKeyFrames(layerJSON, layer);
			}
			
			movieJSON.layers.push(layerJSON);
		},
		
		_writeTextureGroups : function () {
			var textureGroupJSON = {scaleFactor : 1, atlases : []};

			for(var img in this.textureFramesByImg) {
				this._writeAtlas(textureGroupJSON, img, this.textureFramesByImg[img]);
			}
			
			this.textureGroups.push(textureGroupJSON);
		},
		
		_writeMovies : function () {
			this.symbolBucket.movies.forEach(function (movieSymbol) {
				var movieJSON = {layers : [], id : movieSymbol.name};
				var hasFlipbook = this.symbolBucket.hasFlipbook(movieSymbol.name);
				
				movieSymbol.timeline.layers.forEach(function (layer, index) {
					if(this._isValidLayer(layer)) {
						this._writeLayer(movieJSON, layer, hasFlipbook && index === 0);
					}
				}, this);
				
				this.movies.push(movieJSON);
			}, this);
		},
		
		_isValidLayer : function (layer) {
			return layer.layerType === "normal" || layer.layerType === "masked" || layer.layerType === "guided";
		},
		
		write : function (symbolBucket, textureFrames) {
			this.symbolBucket = symbolBucket;
			this.textureFrames = textureFrames;
			
			this.textureFramesByImg = this._groupTextureFramesByImg(); //{img : [frame, frame]}
			this.textureFramesBySymbol = this._groupTextureFramesBySymbol(); //{symbolId : frame}
			
			this._writeTextureGroups();
			this._writeMovies();
		},
		
		toJSON : function () {
			return JSON.encode({
				movies : this.movies,
				textureGroups : this.textureGroups,
				frameRate : this.frameRate
			});
		}
	}
	
	return exports;
})();

