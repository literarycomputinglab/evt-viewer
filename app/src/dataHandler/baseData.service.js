angular.module('evtviewer.dataHandler')

.service('baseData', function($log, $q, $http, config, xmlParser, evtParser, evtCriticalParser, evtProjectInfoParser, evtPrimarySourcesParser, evtDialog) {
    var baseData     = {},
        state        = {
            XMLDocuments: [],
            XMLStrings: []
        },
        docElements;

    var _console = $log.getInstance('baseData');


    baseData.addXMLString = function(xmlString) {
        var promises = [];
        promises.push(addXMLDocument(xmlString).promise);
        return $q.all(promises);
    };

    baseData.getXML = function() {
      return docElements;
    };

    baseData.getXMLDocuments = function() {
        return state.XMLDocuments;
    };

    baseData.getXMLStrings = function() {
        return state.XMLStrings;
    };
    
    var addXMLDocument = function(doc) {
        var deferred = $q.defer();
        docElements = xmlParser.parse(doc);
        if (docElements.documentElement.nodeName === 'TEI') {
            state.XMLStrings.push(doc);
            loadXIinclude(docElements).promise.then(function(){
                state.XMLDocuments.push(docElements);
                launchXMLParsers(docElements);
                _console.log('XML TEI parsed and stored ', state.XMLDocuments);
                deferred.resolve('success');
            });
        } else {
            _console.error('Something wrong with the XML');
            deferred.resolve('success');
        }
        return deferred;
    };

    var launchXMLParsers = function(docElements) {
        // Parse pages
        // evtParser.parsePages(docElements);

        // Parse Glyphs
        evtParser.parseGlyphs(docElements); //TODO: Decide if it is necessary to move this somewhere else

        // Parse Zones
        evtPrimarySourcesParser.parseZones(docElements); //TODO: Decide if it is necessary to move this somewhere else

        // Parse documents
        evtParser.parseDocuments(docElements);

        // Parse witnesses list
        evtCriticalParser.parseWitnesses(docElements);

        // Parse projet info
        evtProjectInfoParser.parseProjectInfo(docElements);
    };

    /* ************************** */
    /* parseAndLoadXIinclude(doc) */
    /* ************************************************************* */
    /* Function to find <xi:include> nodes and load referenced files */
    /* ************************************************************* */
    // It will replace <xi:include> node with the <text> found in loaded file
    var loadXIinclude = function(doc) {
        var deferred = $q.defer(),
            mainUrl = config.dataUrl,
            includedFilesLoaded = 0,
            filesToInclude = doc.getElementsByTagName('include');
        mainUrl = mainUrl.substring(0, mainUrl.lastIndexOf('/') + 1);
        if (filesToInclude && filesToInclude.length > 0) {
            var totFilesToInclude = filesToInclude.length;
            angular.forEach(filesToInclude, function(element) {
                var fileUrl = mainUrl + element.getAttribute('href'),
                    fileXpointer = element.getAttribute('xpointer');
                $http.get(fileUrl)
                    .then(function(response) {
                        includedFilesLoaded++;
                        var includedDoc = xmlParser.parse(response.data),
                            includedTextElem = includedDoc.getElementsByTagName('text')[0];
                        element.parentNode.replaceChild(includedTextElem, element);
                        if (includedFilesLoaded === totFilesToInclude) {
                            deferred.resolve('success');
                        }
                    }, function(error) {
                        var fallbackElem = element.getElementsByTagName('fallback')[0],
                            errorDialog  = evtDialog.getById('errorMsg');
                        var errorContent = fallbackElem.innerHTML;
                        errorContent += '<div style="text-align:center;">Warning! <br/> EVT could not work properly.</div>';
                        errorDialog.updateContent(errorContent);
                        errorDialog.setTitle(fileXpointer + ' - XI:INCLUDE ERROR');
                        errorDialog.open();
                        deferred.resolve('success');
                    });
            });
        } else {
            deferred.resolve('success');
        }

        return deferred;
    };

    return baseData;
});