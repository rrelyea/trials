import React from 'react';
import { fetchTrialsData, fetchPubMedData, sortKeys, getInterventions } from "./TrialUtilities.js";

function setKey(trial) {
  var LastUpdatePostDate = trial.LastUpdatePostDate !== null ? new Date(trial.LastUpdatePostDate) : null;
  var datestring = LastUpdatePostDate !== null ? (LastUpdatePostDate.getFullYear() + ("0" + (LastUpdatePostDate.getMonth() + 1)).slice(-2)) : "        ";
  var key = trial.phaseInfo.order +"-"+ trial.LeadSponsorName + "-" + datestring +  trial.NCTId;
  trial.key = key;
}

class Trials extends React.Component {
    constructor(props) {
      super(props);
      this.state = {data: null, query: null};
    }
    items = [];
    sortedTrials = null;
    lastGroup = null;
    pubmedResults = null;
    group = "phaseInfo.group".split('.');

    async getData() {
      var query = this.props.query;
      this.pubmedResults = await fetchPubMedData(query);
      this.sortedTrials = null;
      var trials = await fetchTrialsData(query, setKey);
      this.sortedTrials = sortKeys(trials, true);
      this.setState({query: query});
    }
  
    render() {
      this.getData();
      this.lastGroup = null;
      var pubMedCount = this.pubmedResults !== null ? this.pubmedResults.esearchresult.count : 0;
      var tooManyWarning = this.state.trialCount > 6000 ? " [revise terms, only 6000 shown]" : "";
      var trialCount = this.sortedTrials != null ? Object.keys(this.sortedTrials).length : 0;

      return <>
          {this.sortedTrials !== null && this.state.query !== null ? <h3 key='title'><span>{"ClinicalTrials.gov (" + trialCount + tooManyWarning + ") | "}</span><a href={'https://pubmed.ncbi.nlm.nih.gov/?term='+this.state.query}>PubMed.gov{" (" + pubMedCount + ")"}</a></h3> : false }
  
          {this.sortedTrials !== null && trialCount > 0 ? Object.entries(this.sortedTrials).map(([k,trial], lastPhase) =>
            {
              var groupingHeader = null;
              var groupingValue = trial;
              for (var i = 0; i < this.group.length; i++) {
                groupingValue = groupingValue[this.group[i]];
              }
              
              groupingValue = groupingValue.toString();
              if (groupingValue != this.lastGroup) {
                groupingHeader = <h2 className='phase'>{groupingValue}</h2>;
              } 

              this.lastGroup = groupingValue;
              var status = trial.OverallStatus;
              if (status == "Completed" || status == "Terminated") status = status + " " + new Date(trial.endDate).getFullYear();
              if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();
              
              return <>
                {groupingHeader}
                <div key={trial.NCTId[0]} className="trial">
                  <div className={'status '+trial.OverallStatusStyle}>{status}</div>
                  <div className='interventionDiv intervention'><span>{getInterventions(trial)}</span></div>
                  <div className='interventionDiv sponsor'><span> ({trial.LeadSponsorName})</span></div>
                  <div className='title'><a href={'https://beta.clinicaltrials.gov/study/'+trial.NCTId[0]}>{trial.NCTId[0]}</a> : <span>{trial.BriefTitle}</span></div>
                </div></>
            })
          : <h3>searching for trials...</h3>}  
        </>;
    }
  }

  export default Trials;