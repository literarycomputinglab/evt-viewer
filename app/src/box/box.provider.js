angular.module('evtviewer.box')

.provider('evtBox', function() {

    var defaults = this.defaults;

    this.setDefaults = function(_defaults) {
        defaults = _defaults;
    };

    this.$get = function($log, parsedData, evtCriticalParser, xmlParser, evtInterface) {        
        var box        = {},
            collection = {},
            list       = [],
            idx        = 0;

        var _console = $log.getInstance('box');


        // 
        // Control function
        // 
        function updateContent(newContent) {
            var vm     = this;
            vm.content = newContent;
            
            // _console.log('vm - updating content ' + vm.id);
        }

        function updateState(key, value) {
            // _console.log('vm - updating state '+key+': '+value);
            var vm        = this;
            vm.state[key] = value;
            return vm.state[key];            
        }

        function getState(key) {
            var vm = this;
            return vm.state[key];
        }

        function destroy() {
            var tempId = this.uid;
            // TODO: remove from list and collection
            // this.$destroy();
            delete collection[tempId];
            // _console.log('vm - destroy ' + tempId);
        }

        // Critical edition control
        function toggleCriticalAppFilter(filter, value){
            var vm      = this,
                filters = vm.state.filters;
            if (filters[filter] === undefined ) {
                filters[filter] = {
                    any        : true,
                    totActive  : 0,
                    values     : {
                                    length : 0
                                }
                };
            }
            if ( filters[filter].totActive === undefined ) {
                filters[filter].totActive = 0;
            }

            var values = filters[filter].values;
            if (values[value] === undefined) {
                values[values.length] = value;
                values[value] = { 
                                    name   : value,
                                    active : true 
                                };
                values.length++;
            } else {
                values[value].active = !values[value].active;
            }
            
            if (values[value].active) {
                filters[filter].totActive++;
            } else {
                filters[filter].totActive--;
            }
            
            filters[filter].any = (filters[filter].totActive === 0);
            
            // _console.log('# toggleCriticalAppFilter ', vm.state.filters);
        }

        function clearFilter(filter){
            var vm = this;
            vm.state.filters[filter].values    = { length: 0 };
            vm.state.filters[filter].totActive = 0;
            // _console.log('# toggleCriticalAppFilter ', filter);
        }


        function toggleFilterBox() {
            var vm = this;
            if (vm.state.filterBox !== undefined) {
                vm.state.filterBox = !vm.state.filterBox;
            }
        }
        // 
        // Box builder
        // 

        box.build = function(scope, vm) {
            var currentId   = vm.id || idx++,
                currentType = vm.type || 'default',
                topMenuList = { 
                    selectors : [],
                    buttons   : []
                },
                bottomMenuList = { 
                    selectors      : [],
                    buttonSwitches : []
                },
                content,
                state      = {},
                appFilters = [];

            var scopeHelper = {};

            if (typeof(collection[currentId]) !== 'undefined') {
                return;
            }
            
            // _console.log('vm - building box for ' + currentId);
            var newContent;
            switch (currentType) {
                case 'image':
                    topMenuList.selectors.push({ id:'page', type: 'page' });
                    topMenuList.buttons.push({ title:'Thumbnails', label: 'Thumbs', icon: 'thumbs', type: 'thumbs' });
                    content = '<img src="" />';
                    break;
                case 'text':
                    topMenuList.selectors.push({ id:'document', type: 'document' });
                    topMenuList.selectors.push({ id:'editionLevel', type: 'edition'});
                    topMenuList.buttons.push({ title: 'Add Witness', label: '', icon: 'add', type: 'addWit'});
                    state.docId   = evtInterface.getCurrentDocument();
                    if (state.docId !== undefined) {
                        if ( vm.edition !== undefined && vm.edition === 'critical') {
                            newContent = parsedData.getCriticalText(state.docId);   
                        }
                        if ( newContent !== undefined && newContent !== '') {
                            content = newContent.innerHTML;
                        } else {
                            content = 'Text of '+scope.vm.edition+' edition not available.';
                        }    
                    }

                    state.filters = {};
                    state.filterBox = false;
                    break;
                case 'witness':
                    topMenuList.selectors.push({ id:'witnesses_'+currentId, type: 'witness', witness: vm.witness});
                    topMenuList.selectors.push({ id:'page_'+currentId, type: 'witness-page', witness: vm.witness});
                    topMenuList.buttons.push({ title: 'Remove Witness', label: '', icon: 'remove', type: 'removeWit'});
                    appFilters    = parsedData.getCriticalEntriesFilters();
                    state.filters = {};
                    state.filterBox = false;
                     
                    if ( vm.witness !== undefined ) {
                        newContent = parsedData.getWitnessText(vm.witness) || undefined;
                        if ( newContent === undefined ) {
                            var documents  = parsedData.getDocuments(),
                                currentDoc = '';
                            if (documents.length > 0) {
                                currentDoc = documents[documents[0]];
                            }
                            if (currentDoc !== undefined) {
                                newContent = evtCriticalParser.parseWitnessText(xmlParser.parse(currentDoc.content), vm.witness);
                            }
                        }
                        
                        if ( newContent !== undefined && newContent !== '') {
                            content = newContent;
                        } else {
                            content = 'Testo non disponibile.';
                        }
                    }

                    break;
            }

            scopeHelper = {
                // expansion
                uid                     : currentId,
                defaults                : angular.copy(defaults),

                // model
                topMenuList             : topMenuList,
                bottomMenuList          : bottomMenuList,
                content                 : content,
                state                   : state,
                appFilters              : appFilters,

                // function
                updateContent           : updateContent,
                updateState             : updateState,
                getState                : getState,
                destroy                 : destroy,
                toggleCriticalAppFilter : toggleCriticalAppFilter,
                toggleFilterBox         : toggleFilterBox,
                clearFilter             : clearFilter
            };

            collection[currentId] = angular.extend(vm, scopeHelper);
            list.push({
                id   : currentId,
                type : currentType
            });

            return collection[currentId];
        };


        //
        // Service function
        // 

        box.getById = function(currentId) {
            if (collection[currentId] !== 'undefined') {
                return collection[currentId];
            }
        };

        box.getList = function() {
            return list;
        };

        box.getListByType = function(type) {
            var listType = [];
            for (var i in collection) {
                if (collection[i].type === type) {
                    listType.push(collection[i]);
                }
            }
            return listType;
        };

        return box;
    };

});