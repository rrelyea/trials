
    export function getPhaseInfo(lastPhase, firstPhase, studyType) {
        var phaseInfo = {group: lastPhase};

        if (lastPhase !== null) {
            switch (lastPhase) {
                case 'Phase 1':
                    phaseInfo.order = "1X";
                    break;
                case 'Early Phase 1':
                    phaseInfo.order = "1A";
                    break;
                case 'Phase 2':
                    if (firstPhase == 'Phase 1') {
                        phaseInfo.order = "2A";
                        phaseInfo.group = "Phase 1/2";
                    } else {
                        phaseInfo.order = "2X";
                    }
                    break;
                case 'Phase 3':
                    if (firstPhase == 'Phase 2') {
                        phaseInfo.order = "3A";
                        phaseInfo.group = "Phase 2/3";
                    } else {
                        phaseInfo.order = "3X";
                    }
                    break;
                case 'Phase 4':
                    phaseInfo.order = "4X";
                    break;
                case 'Not Applicable':
                    phaseInfo.order = "0N";
                    break;
                default:
                    if (studyType == "Observational") {
                        phaseInfo.order = "0O";
                        phaseInfo.group = "Observational";
                    } else if (studyType == "Expanded Access") {
                        phaseInfo.order = "5X";
                        phaseInfo.group = "Expanded Access";
                    } else {
                        phaseInfo.order = "0X";
                    }
                    break;
            }
        }

        return phaseInfo;
    }

    export function sortKeys(obj_1) {
        var key = Object.keys(obj_1)
        .sort(function order(key1, key2) {
            // sort in reverse order
            if (key1 < key2) return +1;
            else if (key1 > key2) return -1;
            else return 0;
        }); 
          
        // Taking the object in 'temp' object
        // and deleting the original object.
        var temp = {};
          
        for (var i = 0; i < key.length; i++) {
            temp[key[i]] = obj_1[key[i]];
            delete obj_1[key[i]];
        } 
    
        // Copying the object from 'temp' to 
        // 'original object'.
        for (var j = 0; j < key.length; j++) {
            obj_1[key[j]] = temp[key[j]];
        } 
        return obj_1;
    }