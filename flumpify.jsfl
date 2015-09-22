//utilities to include jsfl files
var included = {}, include = function (file) {
	var uri = fl.scriptURI.split("/").slice(0, -1).join("/") + "/" + file;
	if(uri in included) {return;}
	included[uri] = true;
	try {fl.runScript(uri);} catch(e) { throw "Could not load " + uri + " from " + fl.scriptURI;}
}

include("lib/LibraryJSON.jsfl");
include("lib/SymbolBucket.jsfl");
include("lib/path.jsfl");
include("lib/FlumpSpriteSheetExporter.jsfl");

// Clear the output panel 
fl.outputPanel.clear();

var processDocument = function (doc) {
	//make sure we have nothing selected
	doc.selectNone();
	doc.exitEditMode();

	//name of fla without the extension
	var outputName = path.basename(doc.name, ".fla");

	//ask for the output directory
	var initialDir = doc.path ? path.dirname(doc.path) : null;
	var baseDir = fl.browseForFolderURL("Select the destination folder where the output folder '" + outputName + "' is created", initialDir );

	if(baseDir) {
		var outputDir = baseDir + "/" + outputName;
		
		//create the output folder
		if(!FLfile.exists(outputDir)) {
			fl.trace("creating output folder '" + outputDir + "'");
			FLfile.createFolder(outputDir);
		}

		//collect the symbols (sprites, movieclips) and group them by sprites, movieclips and flipbooks
		fl.trace("collecting symbols");
		var symbolBucket = SymbolBucket.fromLibrary(doc.library);

		//check if movieclips and/or flipbooks where found
		if(symbolBucket.isValid()) {
			//lets write the spritesheets
			fl.trace("exporting spritesheet");
			var exporter = new FlumpSpriteSheetExporter(doc);
			exporter.export(symbolBucket, outputDir);

			var lib = new LibraryJSON(doc);
			lib.write(symbolBucket, exporter.frames);

			FLfile.write(outputDir + "/library.json", lib.toJSON());
			
			fl.trace("done!");
		}
		else {
			fl.trace("No assets could be exported");
		}
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



