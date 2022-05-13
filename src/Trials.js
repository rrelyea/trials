import React from 'react';
import { getPhaseInfo, sortKeys } from "./TrialUtilities.js";

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

    async getData() {
      var query = this.props.query;
      if (query === this.state.query) return;
  
      document.title = "'" + query + "' Trials";
      var moreToGet = 1;
      var maxRank = 999;
      var minRank = 1;
      var trials = {};
      this.sortedTrials = null;
      var trialCount = 0;
      this.setState({sortedTrials: this.sortedTrials, query: query, trialCount: trialCount});
  
  
      var pubmedUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=' + query;
      this.pubmedResults = await GetData(pubmedUrl);
  
      while (moreToGet > 0) {
        var url = 'https://clinicaltrials.gov/api/query/study_fields?expr='+query+'&fields=NCTId,Condition,BriefTitle,StudyType,Phase,OverallStatus,WhyStopped,LeadSponsorName,InterventionName,StudyFirstPostDate,StartDate,StartDateType,LastUpdatePostDate,PrimaryCompletionDate,CompletionDate&fmt=JSON&min_rnk='+minRank.toString()+'&max_rnk='+maxRank.toString();
        var data = await GetData(url);
        trialCount = data.StudyFieldsResponse.NStudiesFound;
        if ('StudyFields' in data.StudyFieldsResponse) {
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
  
      this.sortedTrials = sortKeys(trials);
      this.setState({query: query, trialCount: trialCount});
    }
  
    render() {
      this.getData();
      this.lastPhase = null;
      var pubMedCount = this.pubmedResults !== null ? this.pubmedResults.esearchresult.count : 0;
      var tooManyWarning = this.state.trialCount > 6000 ? " [revise terms, only 6000 shown]" : "";
      return <>
          {this.sortedTrials !== null && this.state.query !== null ? <h3 key='title'><span>{"ClinicalTrials.gov (" + this.state.trialCount + tooManyWarning + ") | "}</span><a href={'https://pubmed.ncbi.nlm.nih.gov/?term='+this.state.query}>PubMed.gov{" (" + pubMedCount + ")"}</a></h3> : false }
  
          {this.sortedTrials !== null && Object.keys(this.sortedTrials).length > 0 ? Object.entries(this.sortedTrials).map(([k,trial], lastPhase) =>
            {
              var phaseHeader = null;
              if (trial.phaseInfo.group !== this.lastPhase) {
                phaseHeader = <h2 className='phase'>{trial.phaseInfo.group}</h2>;
              } 
              this.lastPhase = trial.phaseInfo.group;
              var status = trial.OverallStatus;
              if (status == "Completed" || status == "Terminated") status = status + " " + new Date(trial.endDate).getFullYear();
              if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();
              var interventions = trial.InterventionName.filter((intervention, index)=> {
                 var compare = intervention.toLowerCase();
                 return (!compare.includes("placebo") && !compare.startsWith("sham") && !compare.includes("standard care") && !compare.includes("standard of care") && !compare.includes("standard-of-care"));
              });
              interventions = interventions.join(', ');
              
              return <>
                {phaseHeader}
                <div key={trial.NCTId[0]} className="trial">
                  <div className={'status '+trial.OverallStatusStyle}>{status}</div>
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