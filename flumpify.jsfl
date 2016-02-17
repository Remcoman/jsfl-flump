//utilities to include jsfl files
var included = {}, include = function (file) {
	var uri = fl.scriptURI.split("/").slice(0, -1).join("/") + "/" + file;
	if(uri in included) {return;}
	included[uri] = true;
	try {fl.runScript(uri);} catch(e) { throw "Could not load " + uri + " from " + fl.scriptURI;}
}

include("lib/JSON.jsfl");
include("lib/LibraryJSON.jsfl");
include("lib/SymbolBucket.jsfl");
include("lib/path.jsfl");
include("lib/FlumpSpriteSheetExporter.jsfl");
include("lib/flumpifyConfig.jsfl");

// Clear the output panel 
fl.outputPanel.clear();

var processDocument = function (doc) {
	//make sure we have nothing selected
	doc.selectNone();
	doc.exitEditMode();

    //get the name without pixel ratio information & the pixel ratio
    var docPixelRatioName = path.resolvePixelRatio(doc.name);

	//name of fla without the extension
	var outputName = path.basename(docPixelRatioName.path, ".fla");

    //attempt to read flumpify config
    var config = flumpifyConfig.read(doc);
	
    //ask for the output directory if undefined
    if(!config.baseDir) { 
        var initialDir = doc.path ? path.dirname(doc.path) : null;
        config.baseDir = fl.browseForFolderURL("Select the destination folder where the output folder '" + outputName + "' is created", initialDir );
        if(!config.baseDir) { //canceled
            return;
        }    
    }
	else {
		config.baseDir = FLfile.platformPathToURI(path.resolve(path.dirname(doc.path), config.baseDir));
	}
    
    var outputDir = config.baseDir + "/" + outputName;
    
    //create the output folder
    if(!FLfile.exists(outputDir)) {
        fl.trace("creating output folder '" + outputDir + "'");
        FLfile.createFolder(outputDir);
    }

    //collect the symbols (sprites, movieclips) and group them by sprites, movieclips and flipbooks
    fl.trace("collecting symbols...");
    var symbolBucket = SymbolBucket.fromLibrary(doc.library);

    //check if movieclips and/or flipbooks where found
    if(symbolBucket.isValid()) {
        //lets write the spritesheets
        
        var exporter = new FlumpSpriteSheetExporter(doc, config);
        
        var frames = config.scaleFactors
            .map(function (factor) {
                fl.trace("exporting spritesheet for scaleFactor: " + factor);
            
                if(!exporter.export(symbolBucket, outputDir, factor*config.baseScale, path.pixelRatioSuffix(factor))) {
                    fl.trace("Error when outputting spritesheet for scaleFactor " + factor + " " + exporter.error);
                    return null;
                }
            
                return {scaleFactor : factor, frames : exporter.frames};
            })
            .filter(function (frames) {
                return frames !== null;
            });

        if(frames.length) {
            //library json is always at original size 
            var lib = new LibraryJSON(doc);
            lib.write(frames, symbolBucket, config.baseScale);

            FLfile.write(outputDir + "/library.json", lib.toJSON());
        }
        else {
            fl.trace("Nothing to write");
        }
        
        fl.trace("done!");
    }
    else {
        fl.trace("No assets could be exported");
    }
}

var doc = fl.getDocumentDOM();

if(doc) {
	processDocument( fl.getDocumentDOM() );
}
else {
	var fla = fl.browseForFileURL("open", "Select a Flash document", "FLA Document (*.fla)", "fla");
	if(fla) {
		fl.openDocument(fla);
		processDocument( fl.getDocumentDOM() );
	}
}



