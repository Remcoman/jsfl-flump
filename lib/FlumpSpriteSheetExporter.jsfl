include("path.jsfl");
include("helpers.jsfl");
include("JSON.jsfl");


/**
 * This class writes all the collected sprites, flipbooks and movies from the symbolbucket
 * to one or multiple spritesheets. 
 *
 * It uses the builtin SpriteSheetExporter from Flash to create the spritesheets with a json metadata file.
 * It then processes the metadata file and removes it (we keep the image file).
 *
 * The result will be:
 *  - one or more image files (named atlas0.png, atlas1.png etc)
 *  - an frames array which contains all the metadata (rect, origin etc)
 */
var FlumpSpriteSheetExporter = (function () {

    /**
     *
     * @param {object} options
     * @constructor
     */
	var SpriteSheetWriter = function (options) {
        
		this.outputDir = options.outputDir;
		this.sprites = options.sprites;
		this.flipbooks = options.flipbooks;
		this.fileNameSuffix = options.fileNameSuffix;
        this.maxSize = options.maxSize;
        this.padding = options.padding;
        
        this.metadataPaths = [];
		this.exporter = new SpriteSheetExporter();
	}
	
	SpriteSheetWriter.prototype = {
		
		_writeSingle : function () {
			this.exporter.beginExport();
			
			//reset all the values
			this.exporter.layoutFormat = "JSON";
			this.exporter.allowRotate = false;
			this.exporter.allowTrimming = true;
			this.exporter.algorithm = "maxRects";
			this.exporter.borderPadding = this.exporter.shapePadding = this.padding;
			this.exporter.maxSheetHeight = this.exporter.maxSheetWidth = this.maxSize;
			
			//write sprites until there is no more space
			while(this.sprites.length) {
				var element = this.sprites.shift();
				
				fl.trace("adding sprite '" + element.name.slice(0, -1) + "' to spritesheet");
				
				this.exporter.addSymbol(element, element.name);

				if(this.exporter.overflowed) {
					fl.trace("spritesheet overflowed!");
					this.sprites.unshift(element);
					this.exporter.removeSymbol(element.name);
					break;
				}
			}
			
			//write flipbooks until there is no more space
			while(this.flipbooks.length) {
				var element = this.flipbooks.shift();
				
				fl.trace("adding flipbook '" + element.name.slice(0, -1) + "' to spritesheet");
				this.exporter.addSymbol(element, element.name, 0, element.libraryItem.timeline.frameCount);

				if(this.exporter.overflowed) {
					fl.trace("spritesheet overflowed!");
					this.flipbooks.unshift(element);
					this.exporter.removeSymbol(element.name);
					break;
				}
			}
			
			var spriteSheetPath = this.outputDir + "/atlas" + this.metadataPaths.length + this.fileNameSuffix;
			this.metadataPaths.push(spriteSheetPath + ".json");
			
			fl.trace("writing '" + spriteSheetPath + "'");
			
			this.exporter.exportSpriteSheet(spriteSheetPath, {format:"png", bitDepth:32, backgroundColor:"#00000000"}, true);
		},
	
		write : function () {
			var i = 0;
			while(i++ < 10 && (this.sprites.length || this.flipbooks.length)) {
				this._writeSingle();
			}
		}
	}
	
	
	var exports = function (doc, config) {
		this.tempSymbols = [];
		this.doc = doc;
        this.config = config;
		this.spriteTextureOrigins = {};
		this.flipbookTextureOrigins = {};
	}
	
	exports.prototype = {
		_createTempSymbol : function (name, copyOf) {
			var symbol;
			if(copyOf) {
				this.doc.library.duplicateItem(copyOf);
				symbol = this.doc.library.getSelectedItems()[0];
				symbol.name = name;
			}
			else {
				this.doc.library.addNewItem("movie clip", name);
				symbol = this.doc.library.getSelectedItems()[0];
			}
			this.tempSymbols.push(name);
			return symbol;
		},
		
		_deleteTempSymbols : function () {
			this.tempSymbols.forEach(function (name) {
				this.doc.library.deleteItem(name);
			}, this);
			this.tempSymbols.length = 0;
		},
		
		_addItemToDoc : function (symbolName, scale) {
			this.doc.library.addItemToDocument({x : 0, y : 0}, symbolName);
			var item = this.doc.selection[0];
            item.scaleX = item.scaleY = scale;
			item.name = this._symbolNameToInstanceName(symbolName) + "_"; //we append a _ because spritesheet exporter always adds 0000 after name
			return item;
		},
		
		_symbolNameToInstanceName : function (symbolName) {
			return symbolName.split("/").join("$");
		},
		
		_instanceNameToSymbolName : function (instanceName) {
			return instanceName.split("$").join("/");
		},
		
		_prepareTemporaryTimeline : function (symbolBucket, scale) {
			if(this.doc.library.itemExists("__temp")) {
				this.doc.library.deleteItem("__temp");
			}
			
			//create a __temp movieclip
			this._createTempSymbol("__temp");
			this.doc.library.editItem("__temp");

            //2 layers. layer 1 is for the sprites, layer 2 is for flipbooks
			var tl = this.doc.getTimeline();
			tl.layers[0].name = "sprites";
			tl.addNewLayer("flipbooks", "normal", false);
			
			//add all sprites to layer 0
			tl.setSelectedLayers(0, true);
			symbolBucket.sprites.forEach(function (symbol) {
				this._addItemToDoc(symbol.name, scale);
			}, this);
			
			//add all flipbooks to layer 1
			tl.setSelectedLayers(1, true);
			symbolBucket.flipbooks.forEach(function (symbol) {
				if(symbol.timeline.layerCount > 1) { //we only want the first layer so we make a copy where only the first layer is available
					symbol = this._createTempSymbol(symbol.name + "__flipbook", symbol.name);
					//delete all layers except the first
					for(var i=1, c = symbol.timeline.layerCount;i < c;i++) {
						symbol.timeline.deleteLayer(i);
					}
				}
				this._addItemToDoc(symbol.name, scale);
			}, this);
		},
		
		_extractTextureOrigins : function () {
			var tl = this.doc.getTimeline();

			tl.layers[0].frames[0].elements.forEach(function (element) {
				this.spriteTextureOrigins[element.libraryItem.name] = helpers.getTextureOrigin(this.doc, element);
			}, this);
			
			tl.layers[1].frames[0].elements.forEach(function (element) {
				this.flipbookTextureOrigins[element.libraryItem.name] = helpers.getTextureOriginInner(this.doc, element);
			}, this);
		},
        
		_writeSpriteSheets : function (outputDir, spriteSheetSuffix) {
			var tl = this.doc.getTimeline();
			
			//add all the sprites and flipbooks to the spritesheet
			var writer = new SpriteSheetWriter({
                outputDir      : outputDir,
                sprites        : tl.layers[0].frames[0].elements,
                flipbooks      : tl.layers[1].frames[0].elements,
                fileNameSuffix : spriteSheetSuffix,
                maxSize        : this.config.maxSize,
                padding        : this.config.padding
            });
			
			writer.write();
			
			return writer.metadataPaths;
		},
		
		_cleanup : function (metadataPaths) {
			fl.trace("removing temporary symbols and metadata");
			
			this._deleteTempSymbols();
			metadataPaths.forEach(function (path) {
				FLfile.remove(path);
			});
		},
		
		_readFrames : function (symbolBucket, metadataPaths) {
			var frames = [], frameNumberRegex = new RegExp("(.+)_([0-9]+)$");
			
			metadataPaths.forEach(function (path) {
				var metadata = JSON.decode( FLfile.read(path) );
				
				for(var name in metadata.frames) {
					var regexpMatch  = name.match(frameNumberRegex),
						symbolName   = this._instanceNameToSymbolName(regexpMatch[1]),
						frameNum     = parseInt(regexpMatch[2], 10),
						frameRect    = metadata.frames[name].frame,
						origin;
					
					var frame = {
						img : metadata.meta.image,
						rect : [frameRect.x, frameRect.y, frameRect.w, frameRect.h]
					}
					
					//flash puts 0000 after name. Is this the frame number?
					if(symbolBucket.hasFlipbook(symbolName)) { //symbol is flipbook
						frame.symbol = symbolName + "#" + frameNum;
						origin = this.flipbookTextureOrigins[symbolName][frameNum];
					}
					else {
						frame.symbol = symbolName;
						origin = this.spriteTextureOrigins[symbolName];
					}
					
					frame.origin = [origin.x, origin.y];
					
					fl.trace("got frame '" + frame.symbol + "' for image " + metadata.meta.image);
					
					frames.push(frame);
				}
			}, this);
			
			return frames;
		},

		export : function (symbolBucket, outputDir, scale, spriteSheetSuffix) {
			this._prepareTemporaryTimeline(symbolBucket, scale);
			this._extractTextureOrigins();
			var metadataPaths = this._writeSpriteSheets(outputDir, spriteSheetSuffix);
			var frames = this._readFrames(symbolBucket, metadataPaths);
			this._cleanup(metadataPaths);
            
            return frames;
		}
	}
	
	return exports;
})();
