import React from 'react';

async function GetData(url) {
    return fetch(url)
    .then(response => response.json())
  }
  
class Trials extends React.Component {
    constructor(props) {
      super(props);
      this.state = {data: null, query: null, trialCount: 0};
    }
    items = [];
    sortedTrials = null;
    lastPhase = null;
    pubmedResults = null;
    async componentDidMount() {
    }
    
    sortKeys(obj_1) {
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
        for (var i = 0; i < key.length; i++) {
            obj_1[key[i]] = temp[key[i]];
        } 
        return obj_1;
    }
  
    async getData() {
      var query = this.props.query;
      if (query == this.state.query) return;
  
      document.title = "'" + query + "' Trials";
      var moreToGet = 1;
      var maxRank = 999;
      var minRank = 1;
      var trials = {};
      this.sortedTrials = null;
      this.setState({sortedTrials: this.sortedTrials, query: query, trialCount: trialCount});
  
  
      var pubmedUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=' + query;
      this.pubmedResults = await GetData(pubmedUrl);
  
      while (moreToGet > 0) {
        var url = 'https://clinicaltrials.gov/api/query/study_fields?expr='+query+'&fields=NCTId,Condition,BriefTitle,StudyType,Phase,OverallStatus,WhyStopped,LeadSponsorName,InterventionName,StudyFirstPostDate,StartDate,StartDateType,LastUpdatePostDate,PrimaryCompletionDate,CompletionDate&fmt=JSON&min_rnk='+minRank.toString()+'&max_rnk='+maxRank.toString();
        var data = await GetData(url);
        var trialCount = data.StudyFieldsResponse.NStudiesFound;
        if ('StudyFields' in data.StudyFieldsResponse) {
          data.StudyFieldsResponse.StudyFields.forEach((trial) => {
            var LastUpdatePostDate = trial.LastUpdatePostDate !== null ? new Date(trial.LastUpdatePostDate) : null;
  
            var CompletionDate = null
            if (trial.CompletionDate.length != 0) {
              CompletionDate = trial.CompletionDate;
            } else if (trial.PrimaryCompletionDate.length != 0) {
              CompletionDate = trial.PrimaryCompletionDate;
            } else if (trial.LastUpdatePostDate.length != 0) {
              CompletionDate = trial.LastUpdatePostDate;
            }
            trial.endDate = CompletionDate;
  
            var phaseStr = "";
            var lastPhase = trial.Phase[trial.Phase.length-1];
            trial.phaseGroup = lastPhase;
            if (lastPhase !== null) {
              switch (lastPhase) {
                case 'Phase 1':
                  phaseStr = "1X";
                  break;
                case 'Early Phase 1':
                  phaseStr = "1A";
                  break;
                case 'Phase 2':
                  if (trial.Phase[0] == 'Phase 1') {
                    phaseStr = "2A";
                    trial.phaseGroup = "Phase 1/2";
                  } else {
                    phaseStr = "2X";
                  }
                  break;
                case 'Phase 3':
                  if (trial.Phase[0] == 'Phase 2') {
                    phaseStr = "3A";
                    trial.phaseGroup = "Phase 2/3";
                  } else {
                    phaseStr = "3X";
                  }
                  break;
                case 'Phase 4':
                  phaseStr = "4X";
                  break;
                case 'Not Applicable':
                  phaseStr = "0N";
                  break;
                default:
                  if (trial.StudyType == "Observational") {
                    phaseStr = "0O";
                    trial.phaseGroup = "Observational";
                  } else if (trial.StudyType == "Expanded Access") {
                    phaseStr = "5X";
                    trial.phaseGroup = "Expanded Access";
                  } else {
                    phaseStr = "0X";
                  }
                  break;
              }
              trial.phaseStr = phaseStr;
            }
  
            var completed = trial.OverallStatus == "Completed";
            var unknown = trial.OverallStatus == "Unknown status";
            var terminated = trial.OverallStatus == "Terminated";
            var suspended = trial.OverallStatus == "Suspended";
            var withdrawn = trial.OverallStatus == "Withdrawn";
  
            var status = "active";
            if (completed) { status = "completed" } 
            else if (unknown) { status = "unknown"}
            else if (terminated) {status = "terminated"}
            else if (withdrawn) {status = "withdrawn"}
            else if (suspended) {status = "suspended"}
            trial.status = status;
  
            var datestring = LastUpdatePostDate !== null ? (LastUpdatePostDate.getFullYear() + ("0" + (LastUpdatePostDate.getMonth() + 1)).slice(-2)) : "        ";
            var key = phaseStr +"-"+ datestring + trial.LeadSponsorName + trial.NCTId;
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
  
      this.sortedTrials = this.sortKeys(trials);
      this.setState({sortedTrials: this.sortedTrials, query: query, trialCount: trialCount});
    }
  
    render() {
      this.getData();
      this.lastPhase = null;
      var pubMedCount = this.pubmedResults !== null ? this.pubmedResults.esearchresult.count : 0;
      var tooManyWarning = this.state.trialCount > 6000 ? " [revise terms, only 6000 shown]" : "";
      return <>
          {this.state.sortedTrials !== null && this.state.query !== null ? <h3 key='title'><span>{"ClinicalTrials.gov (" + this.state.trialCount + tooManyWarning + ") | "}</span><a href={'https://pubmed.ncbi.nlm.nih.gov/?term='+this.state.query}>PubMed.gov{" (" + pubMedCount + ")"}</a></h3> : false }
  
          {this.sortedTrials !== null && Object.keys(this.sortedTrials).length > 0 ? Object.entries(this.sortedTrials).map(([k,trial], lastPhase) =>
            {
              var phaseStr = trial.phaseStr;
              var phaseHeader = null;
              if (phaseStr != this.lastPhase) {
                phaseHeader = <h2 className='phase'>{trial.phaseGroup}</h2>;
              } 
              this.lastPhase = phaseStr;
              var status = trial.OverallStatus;
              if (status == "Completed" || status == "Terminated") status = status + " " + new Date(trial.endDate).getFullYear();
              if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();
              var interventions = [];
  
              var interventions = trial.InterventionName.filter((intervention, index)=> {
                 var compare = intervention.toLowerCase();
                 return (!compare.includes("placebo") && !compare.startsWith("sham") && !compare.includes("standard care") && !compare.includes("standard of care") && !compare.includes("standard-of-care"));
              });
              interventions = interventions.join(', ');
              
              return <>
                {phaseHeader}
                <div key={trial.NCTId[0]} className="trial">
                  <div className={'status '+trial.status}>{status}</div>
                  <div className='interventionDiv intervention'><span>{interventions}</span></div>
                  <div className='interventionDiv sponsor'><span> ({trial.LeadSponsorName})</span></div>
                  <div className='title'><a href={'https://beta.clinicaltrials.gov/study/'+trial.NCTId[0]}>{trial.NCTId[0]}</a> : <span>{trial.BriefTitle}</span></div>
                </div></>
            })
          : <h3>searching for trials...</h3>}  
        </>;
    }
  }

  export default Trials;