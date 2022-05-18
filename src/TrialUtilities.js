    export async function GetData(url) {
        return fetch(url)
        .then(response => response.json())
    }

    export async function fetchPubMedData(query) {
        var pubmedUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=' + query;
        return await GetData(pubmedUrl);
    }

    export async function fetchTrialsData(query, dataAnnotations) {     
      var moreToGet = 1;
      var maxRank = 999;
      var minRank = 1;
      var trials = [];
      var trialCount = 0;
  
      var annotationsByTrial = {};
      if (dataAnnotations != null) {
        for (var i = 0; i < dataAnnotations.data.length; i++) {
            annotationsByTrial[dataAnnotations.data[i].trial] = dataAnnotations.data[i];
        }
      }

      while (moreToGet > 0) {
        var url = 'https://clinicaltrials.gov/api/query/study_fields?expr='+query+'&fields=NCTId,Condition,LocationFacility,BriefTitle,StudyType,Phase,OverallStatus,WhyStopped,LeadSponsorName,InterventionName,StudyFirstPostDate,StartDate,StartDateType,LastUpdatePostDate,PrimaryCompletionDate,CompletionDate&fmt=JSON&min_rnk='+minRank.toString()+'&max_rnk='+maxRank.toString();
        var data = await GetData(url);
        if (data.StudyFieldsResponse != null && 'StudyFields' in data.StudyFieldsResponse) {
            trialCount = data.StudyFieldsResponse.NStudiesFound;
            data.StudyFieldsResponse.StudyFields.forEach((trial) => {
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
            trial.closed = getClosedInfo(trial);
            switch (trial.OverallStatus.toString()) 
            {
                case "Enrolling by invitation":
                case "Not yet recruiting":
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

            if (trial.NCTId in annotationsByTrial) {
                trial.annotations = annotationsByTrial[trial.NCTId];
            } 

            trials.push(trial);
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

    export function getClosedInfo(trial) {
        return  !(trial.OverallStatus.toString() != "Completed" &&
        trial.OverallStatus.toString() != "No longer available" && 
        trial.OverallStatus.toString() != "Unknown status" && 
        trial.OverallStatus.toString() != "Withdrawn" && 
        trial.OverallStatus.toString() != "Terminated");
    }

    export function getPhaseInfo(lastPhase, firstPhase, studyType) {
        var phaseInfo = {name: lastPhase};

        if (lastPhase !== null) {
            switch (lastPhase) {
                case 'Phase 1':
                    phaseInfo.number = 1.5;
                    break;
                case 'Early Phase 1':
                    phaseInfo.number = 1.0;
                    break;
                case 'Phase 2':
                    if (firstPhase == 'Phase 1') {
                        phaseInfo.name = "Phase 1/2";
                        phaseInfo.number = 2.25;
                    } else {
                        phaseInfo.number = 2.5
                    }
                    break;
                case 'Phase 3':
                    if (firstPhase == 'Phase 2') {
                        phaseInfo.name = "Phase 2/3";
                        phaseInfo.number = 3.25;
                    } else {
                        phaseInfo.number = 3.5;
                    }
                    break;
                case 'Phase 4':
                    phaseInfo.number = 4.5;
                    break;
                case 'Not Applicable':
                    phaseInfo.number = 0.1;
                    break;
                default:
                    if (studyType == "Observational") {
                        phaseInfo.name = "Observational";
                        phaseInfo.number = 0.3;

                    } else if (studyType == "Expanded Access") {
                        phaseInfo.name = "Expanded Access";
                        phaseInfo.number = 4.8;
                    } else {
                        phaseInfo.number = 0.2;
                    }
                    break;
            }
        }

        return phaseInfo;
    }

    export function getInterventions(trial, hidePlacebo) {
        var interventions = trial.InterventionName;
        if (hidePlacebo) {
            interventions = interventions.filter((intervention, index)=> {
            var compare = intervention.toLowerCase();
            return (!compare.includes("placebo") && !compare.startsWith("sham") && !compare.includes("standard care") && !compare.includes("standard of care") && !compare.includes("standard-of-care"));
            });
        }

        interventions = interventions.join(', ');
        return interventions;
    }

    export function cleanSponsor(sponsorName) {
        sponsorName = sponsorName.toString().replace(", Inc.","").replace(" Ltd","").replace(" Inc.","").replace(", Inc", "").replace(", LLC","").replace(" LLC","");
        return sponsorName;
    }

    export function firstFew(conditions, style) {
        var useThese;
        if (conditions.length > 3) {
          useThese = [];
          useThese.push(conditions[0]);
          useThese.push(conditions[1]);
          useThese.push(conditions[2]);
          useThese.push("...");
        } else {
          useThese = conditions;
        }
  
        if (style === ",") {
          return useThese.join(", ");
        } else if (style === "*") {
          return "*" + useThese.join("\n *");
        }
    }