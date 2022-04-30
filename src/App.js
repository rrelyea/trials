import './App.css';
import React from 'react';
import Timeline from 'react-calendar-timeline';
import 'react-calendar-timeline/lib/Timeline.css';
import moment from 'moment';

async function GetData(url) {
  return fetch(url)
  .then(response => response.json())
}

class Trials extends React.Component {
  constructor(props) {
    super(props);
    this.state = {data: null, query: null};
  }
  startViewDate = null;
  endViewDate = null;
  items = [];
  sortedTrials = null;
  lastPhase = null;
  async componentDidMount() {
    const params = new URLSearchParams(window.location.search);
    var query = params.get('q');
    document.title = "'" + query + "' Trials";
    var url = 'https://clinicaltrials.gov/api/query/study_fields?expr='+query+'&fields=NCTId,Condition,BriefTitle,Phase,OverallStatus,WhyStopped,LeadSponsorName,InterventionName,StudyFirstPostDate,StartDate,StartDateType,LastUpdatePostDate,CompletionDate&fmt=JSON&max_rnk=100';
    var data = await GetData(url);
    var trials = {};
    data.StudyFieldsResponse.StudyFields.forEach((trial) => {
      if (trial.StartDate !== "" && trial.CompletionDate !== "" ) {
        var LastUpdatePostDate = LastUpdatePostDate !== null ? new Date(trial.LastUpdatePostDate) : null;

        var CompletionDate = new Date(trial.CompletionDate);
        var phaseStr = "";
        var phase = "9";
        if (trial.phase !== null) {
          phaseStr = (trial.Phase[0] !== null && trial.Phase[0] !== undefined) ? trial.Phase[0].toString() : "";
          phase = phaseStr.substring(phaseStr.length - 1);
          if (phase == "e") phase = "0";
        }
        var completed = trial.OverallStatus == "Completed";
        var unknown = trial.OverallStatus == "Unknown status";
        var terminated = trial.OverallStatus == "Terminated";

        var status = "active";
        if (completed) { status = "completed" } 
        else if (unknown) { status = "unknown"}
        else if (terminated) {status = "terminated"}
        trial.status = status;
        var datestring = LastUpdatePostDate !== null ? (LastUpdatePostDate.getFullYear() + ("0" + (LastUpdatePostDate.getMonth() + 1)).slice(-2)) : "        ";
        var key = phase +"-"+ datestring + trial.LeadSponsorName;
        trial.key = key;
        trials[key] = trial;

      }
    });

    function sortKeys(obj_1) {
      var key = Object.keys(obj_1)
      .sort(function order(key1, key2) {
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

    this.sortedTrials = sortKeys(trials);
    this.setState({sortedTrials: this.sortedTrials, query: query});
  }

  render() {
    this.lastPhase = null;
    return <>
        <h1 key='title'>{"'" + this.state.query + "' Trials"}</h1>

        {this.sortedTrials !== null ? Object.entries(this.sortedTrials).map(([k,trial], lastPhase) =>
          {
            var phase = trial.Phase[0];
            var phaseHeader = null;
            if (phase != this.lastPhase) phaseHeader = <h2>{phase}</h2>;
            this.lastPhase = phase;
            return <>
              {phaseHeader}
              <div key={trial.NCTId[0]} className={trial.status+" trial"}>
                <div><span>{trial.LeadSponsorName}</span>: <span>{trial.InterventionName[0]}</span></div>
                <div><a href={'https://beta.clinicaltrials.gov/study/'+trial.NCTId[0]}>{trial.NCTId[0]}</a> : <span>{trial.BriefTitle}</span></div>
                <span>{phase}</span>  <span>{trial.OverallStatus}</span>  <span>{trial.WhyStopped}</span><br/>
              </div></>
          })
        : false}  
      </>;
  }
}

function App() {
  return (
    <div className="App">
        <Trials />
    </div>
  );
}
export default App;
