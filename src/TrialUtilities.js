    async function GetData(url) {
        return fetch(url)
        .then(response => response.json())
    }

    export async function fetchPubMedData(query) {
        var pubmedUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=' + query;
        return await GetData(pubmedUrl);
    }

    export async function fetchTrialsData(query) {
      document.title = "'" + query + "' Trials";
      var moreToGet = 1;
      var maxRank = 999;
      var minRank = 1;
      var trials = {};
      var trialCount = 0;
  
      while (moreToGet > 0) {
        var url = 'https://clinicaltrials.gov/api/query/study_fields?expr='+query+'&fields=NCTId,Condition,BriefTitle,StudyType,Phase,OverallStatus,WhyStopped,LeadSponsorName,InterventionName,StudyFirstPostDate,StartDate,StartDateType,LastUpdatePostDate,PrimaryCompletionDate,CompletionDate&fmt=JSON&min_rnk='+minRank.toString()+'&max_rnk='+maxRank.toString();
        var data = await GetData(url);
        if ('StudyFields' in data.StudyFieldsResponse) {
            trialCount = data.StudyFieldsResponse.NStudiesFound;
            data.StudyFieldsResponse.StudyFields.forEach((trial) => {
            var LastUpdatePostDate = trial.LastUpdatePostDate !== null ? new Date(trial.LastUpdatePostDate) : null;
            var CompletionDate = null
            if (trial.CompletionDate.length !== 0) {
              CompletionDate = trial.CompletionDate;
            } else if (trial.PrimaryCompletionDate.length !== 0) {
              CompletionDate = trial.PrimaryCompletionDate;
            } else if (trial.LastUpdatePostDate.length !== 0) {
              CompletionDate = trial.LastUpdatePostDate;
            }
            trial.endDate = CompletionDate;
            trial.phaseInfo = getPhaseInfo(trial.Phase[trial.Phase.length-1], trial.Phase[0], trial.StudyType);

            switch (trial.OverallStatus.toString()) 
            {
                case "Enrolling by invitation":
                case "Recruiting":
                case "Active, not recruiting":
                    trial.OverallStatusStyle = "Active";
                    break;
                case "Unknown status":
                    trial.OverallStatusStyle = "Unknown";
                    break;
                default:
                    trial.OverallStatusStyle = trial.OverallStatus;
                    break;
            }
  
            var datestring = LastUpdatePostDate !== null ? (LastUpdatePostDate.getFullYear() + ("0" + (LastUpdatePostDate.getMonth() + 1)).slice(-2)) : "        ";
            var key = trial.phaseInfo.order +"-"+ datestring + trial.LeadSponsorName + trial.NCTId;
            trial.key = key;
            trials[key] = trial;
          });
        }
  
        if (trialCount > maxRank && maxRank < 5000)
        {
          minRank = minRank + 999;
          maxRank = maxRank + 999;
          moreToGet = 1;
        }
        else
        {
          moreToGet = 0;
        }
      }
      
      return trials;
    }

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