include("JSON.jsfl");
include("helpers.jsfl");
include("path.jsfl");
include("customEaseToJSON.jsfl");
include("motionXMLToJSON.jsfl");
include("shapeToJSON.jsfl");

/**
 * This class writes the timeline and the frames collected from the FlumpSpriteSheetExporter to a library.json file.
 */
var LibraryJSON = (function () {
	
	var degreesToRadian = function (angle) {
		return angle * (Math.PI/180);
	}
	
	var roundBy = function (num, decimals) {
		var x = Math.pow(10, decimals);
		return Math.round(num * x) / x;
	}
	
	var getKeyframes = function(frames) {
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
	
	var exports	= function (doc, config) {		
		this.movies = [];
		this.textureGroups = [];
		this.config = config; //not used
		this.frameRate = doc.frameRate;
		this.baseScaleTextureFramesBySymbol = null;
		this.baseScale = 1;
	}

	exports.prototype = {
		/**
		* Groups the frames by img. The result will be: {img : [frame, frame]}
		* @private
		*/
		_groupTextureFramesByImg : function (frames) {
			var group = {};
			frames.forEach(function (frame) {
				var frameList = group[frame.img];
				if(!frameList) {
					frameList = group[frame.img] = [];
				}
				frameList.push(frame);
			});
			return group;
		},

		/**
		 * Groups the frames by symbol. The result will be: {symbol : frame}
		 * @private
		 */
		_groupTextureFramesBySymbol : function (frames) {
			var group = {};
			frames.forEach(function (frame) {
				group[frame.symbol] = frame;
			});
			return group;
		},

		/**
		 * Get the texture frames for the base scale (100%)
		 * When scale factor 1 is include it will just return frames for the scale factor. If not then we return an interpolated list of frames.
		 * @private
		 */
		_getBaseScaleTextureFrames : function () {
			if(this.textureFrames[0].scaleFactor === 1) {
				return this.textureFrames[0].frames; //exact match found!
			}
			else {
				var scale = 1 / this.textureFrames[0].scaleFactor,
					scaleArray = function (a) {return a * scale;}

				return this.textureFrames[0].frames.map(function (frame) {
					return {
						img : frame.img,
						rect : frame.rect.map(scaleArray),
						symbol : frame.symbol,
						origin : frame.origin.map(scaleArray)
					}
				});
			}
		},
		
		_writeFlipbookFrames : function (layerJSON, movieId, layer) {
			layer.frames.forEach(function (frame, index) {
				var origin = this.baseScaleTextureFramesBySymbol[movieId + "#" + index].origin;
				
				var kfJSON = {
					duration : 1, 
					index : index, 
					ref : movieId + "#" + index,
					tweened : false,
					pivot : [roundBy(origin[0], 4), roundBy(origin[1], 4)]
				};

				if(frame.name) {
					kfJSON.label = frame.name;
				}
				
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
				
				var skewX1 = 0, skewX2 = 0;
				var skewY1 = 0, skewY2 = 0;
				
				if(kfJSON.skew) {
					skewX1 = kfJSON.skew[0];
					skewY1 = kfJSON.skew[1];
				}
				
				if(nextKfJSON.skew) {
					skewX2 = nextKfJSON.skew[0];
					skewY2 = nextKfJSON.skew[1];
				}

				if (skewX1 + Math.PI < skewX2) {
					skewX2 += -Math.PI * 2;
				}
				else if (skewX1 - Math.PI > skewX2) {
					skewX2 += Math.PI * 2;
				}

				if (skewY1 + Math.PI < skewY2) {
					skewY2 += -Math.PI * 2;
				}
				else if (skewY1 - Math.PI > skewY2) {
					skewY2 += Math.PI * 2;
				}
				
				if(skewX2 !== 0 || skewY2 !== 0) {
					if(!nextKfJSON.skew) {
						nextKfJSON.skew = [0,0];
					}
					nextKfJSON.skew[0] = skewX2;
					nextKfJSON.skew[1] = skewY2;
				}
			}
		},

		_applyAdditionalRotation : function (jsonKeyFrames, flashKeyFrames) {
			var additionalRotation = 0;

			for(var i= 0, c = jsonKeyFrames.length-1;i < c;i++) {
				var kfJSON = jsonKeyFrames[i],
					nextKfJSON = jsonKeyFrames[i+1],
					flashKf = flashKeyFrames[i].frame;
				
				var skewX1 = 0, skewX2 = 0;
				var skewY1 = 0, skewY2 = 0;
				
				if(kfJSON.skew) {
					skewX1 = kfJSON.skew[0];
					skewY1 = kfJSON.skew[1];
				}
				
				if(nextKfJSON.skew) {
					skewX2 = nextKfJSON.skew[0];
					skewY2 = nextKfJSON.skew[1];
				}

				if(flashKf.motionTweenRotate !== "none" && flashKf.motionTweenRotate !== "auto") {
					var direction = flashKf.motionTweenRotate === "clockwise" ? 1 : -1;
					
					if(nextKfJSON.scale) {
						direction *= sign(nextKfJSON.scale[0]) * sign(nextKfJSON.scale[1]);
					}

					while (direction < 0 && skewX1 < skewX2) {
						skewX2 -= Math.PI * 2;
					}
					while (direction > 0 && skewX1 > skewX2) {
						skewX2 += Math.PI * 2;
					}
					while (direction < 0 && skewY1 < skewY2) {
						skewY2 -= Math.PI * 2;
					}
					while (direction > 0 && skewY1 > skewY2) {
						skewY2 += Math.PI * 2;
					}
					
					additionalRotation += flashKf.motionTweenRotateTimes * Math.PI * 2 * direction;
					
					if(!nextKfJSON.skew) {
						nextKfJSON.skew = [0,0];
					}
					nextKfJSON.skew[0] = skewX2;
					nextKfJSON.skew[1] = skewY2;
				}

				if(additionalRotation) {
					if(!nextKfJSON.skew) {
						nextKfJSON.skew = [0,0];
					}
					nextKfJSON.skew[0] += additionalRotation;
					nextKfJSON.skew[1] += additionalRotation;
				}
			}
		},

		_getScaled : function (value) {
			return value * this.baseScale;
		},
		
		_createKeyFrameJSON : function (frame, index) {
			if(!frame.elements.length) {
				return null;
			}
			
			var element = frame.elements[0];
		
			if(!element.libraryItem) {
				return null;
			}
			
			var kfJSON = {};
			
			kfJSON.duration = frame.duration;
			kfJSON.index = index;
			kfJSON.ref = element.libraryItem.name;
			
			var pos = helpers.getPosition(element);
			kfJSON.loc = [roundBy(this._getScaled(pos.x), 3), roundBy(this._getScaled(pos.y), 3)];
			
			if(element.scaleX !== 1 || element.scaleY !== 1) {
				kfJSON.scale = [roundBy(element.scaleX, 4), roundBy(element.scaleY, 4)];
			}
			
			if(element.skewX !== 0 || element.skewY !== 0) {
				kfJSON.skew = [roundBy(degreesToRadian(element.skewX), 4), roundBy(degreesToRadian(element.skewY), 4)];
			}
			
			if(element.colorAlphaPercent !== 100) {
				kfJSON.alpha = roundBy(element.colorAlphaPercent / 100, 4);
			}
			
			if(!element.visible) {
				kfJSON.visible = false;
			}
			
			if(frame.name) {
				kfJSON.label = frame.name;
			}
			
			var pivot = this._getScaledPivot(element);
			kfJSON.pivot = [roundBy(pivot.x, 4), roundBy(pivot.y, 4)];

			if(frame.tweenType !== "none") {
				if(frame.isMotionObject()) {
					kfJSON.motionEase = motionXMLToJSON(frame);
					kfJSON.ease = 0;
				}
				else if(frame.hasCustomEase) {
					kfJSON.customEase = customEaseToJSON(frame);
					kfJSON.ease = 0;
				}
				else {
					kfJSON.ease = -frame.tweenEasing / 100; //flump gets the acceleration which is the inverse of tweenEasing
				}
			}
			else {
				kfJSON.tweened = false;
			}
			
			return kfJSON;
		},
		
		_getScaledPivot : function (element) {
			var transformPoint = element.getTransformationPoint();
			transformPoint.x = this._getScaled(transformPoint.x);
			transformPoint.y = this._getScaled(transformPoint.y);

			var frameOrigin = [0,0];
			if(this.baseScaleTextureFramesBySymbol[element.libraryItem.name]) {
				frameOrigin = this.baseScaleTextureFramesBySymbol[element.libraryItem.name].origin;
			}

			return {x : frameOrigin[0] + transformPoint.x, y : frameOrigin[1] + transformPoint.y};
		},
		
		_writeKeyFrames : function (layerJSON, layer) {
			var keyframes = getKeyframes(layer.frames);

			keyframes.forEach(function (kf) {
				var kfJSON = this._createKeyFrameJSON(kf.frame, kf.index);
				if(kfJSON) {
					layerJSON.keyframes.push(kfJSON);
				}
			}, this);

			this._normalizeSkewsInKeyFrames(layerJSON.keyframes);
			this._applyAdditionalRotation(layerJSON.keyframes, keyframes);
		},

		_writeInterpolatedFrames : function (layerJSON, layer) {
			var transform = {},
				transformPoint = null,
				rootMatrix = null,
				flashKeyFrame = null,
				prevKeyframeProps = {},
				newKeyframeProps = {};
				
			if(!layerJSON.compactKeyframes) {
				layerJSON.compactKeyframes = [];
			}

			var writeProps = function (isLast) {
				var elementsIndex = layerJSON.compactKeyframes.length, //where to write the indicator
					elements = 0; //which elements (bitwise flag)

				if(newKeyframeProps.x !== prevKeyframeProps.x || newKeyframeProps.y !== prevKeyframeProps.y) {
					layerJSON.compactKeyframes.push( newKeyframeProps.x, newKeyframeProps.y );
					elements |= 1;
				}

				if(newKeyframeProps.scaleX !== prevKeyframeProps.scaleX || newKeyframeProps.scaleY !== prevKeyframeProps.scaleY) {
					layerJSON.compactKeyframes.push( newKeyframeProps.scaleX, newKeyframeProps.scaleY );
					elements |= 2;
				}

				if(newKeyframeProps.skewX !== prevKeyframeProps.skewX || newKeyframeProps.skewY !== prevKeyframeProps.skewY) {
					layerJSON.compactKeyframes.push( newKeyframeProps.skewX, newKeyframeProps.skewY );
					elements |= 4;
				}

				if(newKeyframeProps.alpha !== prevKeyframeProps.alpha) {
					layerJSON.compactKeyframes.push( newKeyframeProps.alpha );
					elements |= 8;
				}

				if(elements === 0 && !isLast) { //nothing to write
					return;
				}
				else if((newKeyframeProps.index - prevKeyframeProps.index) > 1) { //we skipped a couple of keyframes
					elements |= 16;
					layerJSON.compactKeyframes.push( newKeyframeProps.index - prevKeyframeProps.index );
				}

				var temp = prevKeyframeProps;
				prevKeyframeProps = newKeyframeProps;
				newKeyframeProps = temp;

				layerJSON.compactKeyframes[elementsIndex] = elements;
			}

			//TODO maybe we can sample for each second frame instead of each frame?
			layer.frames.forEach(function (frame, index) {
				
				if(typeof frame.startFrame === "undefined") {
					return; //empty frame!
				}
				
				if(frame.startFrame === index) { //keyframe
					var kfJSON = this._createKeyFrameJSON(frame, index);
					
					if(kfJSON) {
						transformPoint = frame.elements[0].getTransformationPoint();
						rootMatrix = frame.elements[0].matrix;
						kfJSON.compactIndex = layerJSON.compactKeyframes.length;
						layerJSON.keyframes.push(kfJSON);
					}
					
					flashKeyFrame = frame;
					
					return;
				}
				
				if(frame.tweenType === "none") {
					return;
				}
				
				var offset = (index - flashKeyFrame.startFrame) - 1;

				//getGeometricTransform returns a relative matrix :-(
				var elMatrix = helpers.matrixMultiply(flashKeyFrame.tweenObj.getGeometricTransform(offset), rootMatrix);
				
				//convert a matrix to scaleX, scaleY etc...
				helpers.matrixToTransform(elMatrix, transformPoint, transform);
				
				newKeyframeProps.x      = roundBy(this._getScaled(transform.x), 3);
				newKeyframeProps.y      = roundBy(this._getScaled(transform.y), 3);
				newKeyframeProps.scaleX = roundBy(transform.scaleX, 3);
				newKeyframeProps.scaleY = roundBy(transform.scaleY, 3);
				newKeyframeProps.skewX  = roundBy(transform.skewX, 3);
				newKeyframeProps.skewY  = roundBy(transform.skewY, 3);

				var alpha = flashKeyFrame.tweenObj.getColorTransform(offset).colorAlphaPercent;
				newKeyframeProps.alpha = roundBy(alpha / 100, 4);

				newKeyframeProps.index = index;

				writeProps(index === layer.frames.length-1);
			}, this);
		},
		
		_writeLayer : function (movieJSON, layer, isFlipbookLayer) {
			var layerJSON = {name : layer.name, keyframes : []};

			if(layer.animationType === "motion object" || layer.layerType === "guided") {
				this._writeInterpolatedFrames(layerJSON, layer);
			}
			else if(!!isFlipbookLayer) {
				layerJSON.flipbook = true;
				this._writeFlipbookFrames(layerJSON, movieJSON.id, layer);
			}
			else {
				this._writeKeyFrames(layerJSON, layer);
			}
			
			movieJSON.layers.push(layerJSON);
		},
		
		_writeMovies : function () {
			this.symbolBucket.movies.forEach(function (movieSymbol) {
				var movieJSON = {layers : [], id : movieSymbol.name};
				var hasFlipbook = this.symbolBucket.hasFlipbook(movieSymbol.name);
				
				var layers = movieSymbol.timeline.layers;

				//todo rename duplicates?

				for(var i=layers.length-1;i >= 0;i--) {
					if(this._isValidLayer(layers[i], hasFlipbook)) {
						this._writeLayer(movieJSON, layers[i], hasFlipbook && i === 0);
					}
				}
				
				this.movies.push(movieJSON);
			}, this);
		},

		_writeAtlas : function (textureGroupJSON, img, frames) {
			var atlasJSON = {
				file : img,
				textures : frames.map(function (frame) {
					return {origin : frame.origin, rect : frame.rect, symbol : frame.symbol};
				})
			};
			textureGroupJSON.atlases.push(atlasJSON);
		},

		_writeTextureGroups : function () {
			this.textureFrames.forEach(function (framesForScaleFactor) {
				var textureGroupJSON = {scaleFactor : framesForScaleFactor.scaleFactor, atlases : []},
					framesByImg = this._groupTextureFramesByImg(framesForScaleFactor.frames);

				for(var img in framesByImg) {
					this._writeAtlas(textureGroupJSON, img, framesByImg[img]);
				}

				this.textureGroups.push(textureGroupJSON);
			}, this);
		},

		_isValidElement : function (element) {
			return element.instanceType === "symbol" && this.symbolBucket.has(element.libraryItem.name);
		},
		
		_isValidLayer : function (layer, hasFlipbook) {
			if(!hasFlipbook) {
				var everyKeyframeHasElement = getKeyframes(layer.frames).every(function (keyframe) {
					return !keyframe.frame.elements.length || this._isValidElement(keyframe.frame.elements[0]);
				}, this);

				if(!everyKeyframeHasElement) {
					return false;
				}
			}

			return layer.layerType === "normal" || layer.layerType === "masked" || layer.layerType === "guided";
		},

		_sortTextureFrames : function (textureFrames) {
			textureFrames = textureFrames.concat();
			textureFrames.sort(function (a, b) {
				return a.scaleFactor - b.scaleFactor;
			});
			return textureFrames;
		},
		
		write : function (textureFrames, symbolBucket, baseScale) {
			if(!textureFrames.length) {
				return false;
			}

			this.symbolBucket = symbolBucket;
			this.textureFrames = this._sortTextureFrames(textureFrames);
			this.baseScale = baseScale;

			this.baseScaleTextureFramesBySymbol = this._groupTextureFramesBySymbol( this._getBaseScaleTextureFrames() );
			
			this._writeTextureGroups();
			this._writeMovies();

			return true;
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

