    export async function GetData(url) {
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
      var trials = [];
      var trialCount = 0;
  
      while (moreToGet > 0) {
        var url = 'https://clinicaltrials.gov/api/query/study_fields?expr='+query+'&fields=NCTId,Condition,BriefTitle,StudyType,Phase,OverallStatus,WhyStopped,LeadSponsorName,InterventionName,StudyFirstPostDate,StartDate,StartDateType,LastUpdatePostDate,PrimaryCompletionDate,CompletionDate&fmt=JSON&min_rnk='+minRank.toString()+'&max_rnk='+maxRank.toString();
        var data = await GetData(url);
        if ('StudyFields' in data.StudyFieldsResponse) {
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

    export function getInterventions(trial) {
        var interventions = trial.InterventionName.filter((intervention, index)=> {
            var compare = intervention.toLowerCase();
            return (!compare.includes("placebo") && !compare.startsWith("sham") && !compare.includes("standard care") && !compare.includes("standard of care") && !compare.includes("standard-of-care"));
        });
        interventions = interventions.join(', ');
        return interventions;
    }