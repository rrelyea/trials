import React from 'react';
import { fetchTrialsData, fetchPubMedData, sortKeys, getInterventions } from "./TrialUtilities.js";

class Trials extends React.Component {
    constructor(props) {
      super(props);
      this.state = {data: null, query: null};
    }
    pubmedResults = null;
    trials = null;
    showClosed = false;
    groupings = [
      {
        name: "Phase (desc)",
        groupBy: "phaseInfo.group".split('.'),
        compare: function (trialA, trialB) { 
          return  trialA.phaseInfo.order > trialB.phaseInfo.order ? -1 : 1
          || new Date(trialA.LastUpdatePostDate) - new Date(trialB.LastUpdatePostDate)
        }
      },
      {
        name: "Sponsor",
        groupBy: "LeadSponsorName".split('.'),
        compare: function (trialA, trialB) { 
          return (trialA.LeadSponsorName < trialB.LeadSponsorName ? -1 : 1)
          || (trialA.phaseInfo.group > trialB.phaseInfo.group ? -1 : 1)
          || (new Date(trialA.LastUpdatePostDate) - new Date(trialB.LastUpdatePostDate))
        }
      }
    ];
    activeGrouping = 0;
    lastGroup = null;

    async getData() {
      var query = this.props.query;
      this.pubmedResults = await fetchPubMedData(query);
      this.trials = null;
      var trials = await fetchTrialsData(query);
      this.trials = trials.filter(trial => this.showClosed || (trial.OverallStatus.toString() != "Completed" &&
        trial.OverallStatus.toString() != "No longer available" && 
        trial.OverallStatus.toString() != "Unknown status" && 
        trial.OverallStatus.toString() != "Withdrawn" && 
        trial.OverallStatus.toString() != "Terminated"))
        .sort(this.groupings[this.activeGrouping].compare);
      this.setState({query: query});
    }

    chooseGrouping = (e) => 
    {
        this.activeGrouping = Number(e.target.selectedIndex);
        this.setState({});
    }
    showClosedChanged = (e) => 
    {
        this.showClosed = e.target.checked;
        this.setState({});
    }
    render() {
      this.getData();
      this.lastGroup = null;
      var pubMedCount = this.pubmedResults !== null ? this.pubmedResults.esearchresult.count : 0;
      var tooManyWarning = this.state.trialCount > 6000 ? " [revise terms, only 6000 shown]" : "";
      var trialCount = this.trials != null ? Object.keys(this.trials).length : 0;

      return <>
          {this.trials !== null && this.state.query !== null ? <><div className='tm10'>
            <span className='hitCounts'>{"ClinicalTrials.gov (" + trialCount + tooManyWarning + ") |"}</span> <a className='hitCounts' href={'https://pubmed.ncbi.nlm.nih.gov/?term='+this.state.query}>PubMed.gov{" (" + pubMedCount + ")"}</a></div></> : false }
<div><label><input type='checkbox' onChange={this.showClosedChanged} />Show Closed</label> <label className='lm10'>Group by:</label> <select onChange={this.chooseGrouping}>
            {this.groupings.map((grouping)=> <option>{grouping.name}</option>)}
            </select> </div>  
          {this.trials !== null && trialCount > 0 ? Object.entries(this.trials).map(([k,trial], lastPhase) =>
            {
              var groupingHeader = null;
              var groupingValue = trial;
              for (var i = 0; i < this.groupings[this.activeGrouping].groupBy.length; i++) {
                groupingValue = groupingValue[this.groupings[this.activeGrouping].groupBy[i]];
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
                  <div className={'status '+trial.OverallStatusStyle}>{this.activeGrouping == 1 ? trial.phaseInfo.group+"-":false}{status}</div>
                  <div className='interventionDiv intervention'><span>{getInterventions(trial)}</span></div>
                  { this.activeGrouping == 0 ? <div className='interventionDiv sponsor'><span> ({trial.LeadSponsorName})</span></div> : false }
                  <div className='title'><a href={'https://beta.clinicaltrials.gov/study/'+trial.NCTId[0]}>{trial.NCTId[0]}</a> : <span>{trial.BriefTitle}</span></div>
                </div></>
            })
          : <h3>searching for trials...</h3>}  
        </>;
    }
  }

  export default Trials;