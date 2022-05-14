import React from 'react';
import { fetchTrialsData, fetchPubMedData, getPhaseInfo, sortKeys } from "./TrialUtilities.js";

async function GetData(url) {
  return fetch(url)
  .then(response => response.json())
}

class Trials extends React.Component {
    constructor(props) {
      super(props);
      this.state = {data: null, query: null};
    }
    items = [];
    sortedTrials = null;
    lastPhase = null;
    pubmedResults = null;

    async getData() {
      var query = this.props.query;
      if (query === this.state.query) return;

      this.pubmedResults = await fetchPubMedData(query);
      this.sortedTrials = null;
      this.setState({query: query, trialCount: 0});
      var trials = await fetchTrialsData(query);
  
      this.sortedTrials = sortKeys(trials);
      this.setState({});
    }
  
    render() {
      this.getData();
      this.lastPhase = null;
      var pubMedCount = this.pubmedResults !== null ? this.pubmedResults.esearchresult.count : 0;
      var tooManyWarning = this.state.trialCount > 6000 ? " [revise terms, only 6000 shown]" : "";
      var trialCount = this.sortedTrials != null ? Object.keys(this.sortedTrials).length : 0;

      return <>
          {this.sortedTrials !== null && this.state.query !== null ? <h3 key='title'><span>{"ClinicalTrials.gov (" + trialCount + tooManyWarning + ") | "}</span><a href={'https://pubmed.ncbi.nlm.nih.gov/?term='+this.state.query}>PubMed.gov{" (" + pubMedCount + ")"}</a></h3> : false }
  
          {this.sortedTrials !== null && trialCount > 0 ? Object.entries(this.sortedTrials).map(([k,trial], lastPhase) =>
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