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
      var url = 'https://clinicaltrials.gov/api/query/study_fields?expr='+query+'&fields=NCTId,Condition,BriefTitle,Phase,OverallStatus,WhyStopped,LeadSponsorName,InterventionName,StudyFirstPostDate,StartDate,StartDateType,LastUpdatePostDate,PrimaryCompletionDate,CompletionDate&fmt=JSON&min_rnk='+minRank.toString()+'&max_rnk='+maxRank.toString();
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
          if (trial.Phase[0] !== null) {
            switch (trial.Phase[0]) {
              case 'Phase 1':
                phaseStr = "1X";
                break;
              case 'Early Phase 1':
                phaseStr = "1A";
                break;
              case 'Phase 2':
                phaseStr = "2X";
                break;
              case 'Phase 3':
                phaseStr = "3X";
                break;
              case 'Phase 4':
                phaseStr = "4X";
                break;
              case 'Not Applicable':
                phaseStr = "0N";
                break;
              default:
                phaseStr = "0X";
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
          var key = phaseStr +"-"+ datestring + trial.LeadSponsorName;
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
        {this.state.sortedTrials !== null && this.state.query !== null ? <h3 key='title'><span>{"Trials (" + this.state.trialCount + tooManyWarning + ") | "}</span><a href={'https://pubmed.ncbi.nlm.nih.gov/?term='+this.state.query}>PubMed.gov{" (" + pubMedCount + ")"}</a></h3> : false }

        {this.sortedTrials !== null && Object.keys(this.sortedTrials).length > 0 ? Object.entries(this.sortedTrials).map(([k,trial], lastPhase) =>
          {
            var phaseStr = trial.phaseStr;
            var phaseHeader = null;
            if (phaseStr != this.lastPhase) {
              phaseHeader = <h2 className='phase'>{trial.Phase[0]}</h2>;
              if (phaseStr == "0X") phaseHeader = <h2 className='phase'>Other</h2>;
            } 
            this.lastPhase = phaseStr;
            var status = trial.OverallStatus;
            if (status == "Completed" || status == "Terminated") status = status + " " + new Date(trial.endDate).getFullYear();
            if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();

            return <>
              {phaseHeader}
              <div key={trial.NCTId[0]} className="trial">
                <div className={'status '+trial.status}>{status}</div>
                <div className='interventionDiv intervention'><span>{trial.InterventionName[0]}</span></div>
                <div className='interventionDiv sponsor'><span> ({trial.LeadSponsorName})</span></div>
                <div className='title'><a href={'https://beta.clinicaltrials.gov/study/'+trial.NCTId[0]}>{trial.NCTId[0]}</a> : <span>{trial.BriefTitle}</span></div>
              </div></>
          })
        : <h3>searching for trials...</h3>}  
      </>;
  }
}

function Logo() {
  return (<span>Search: </span>);
}

class SearchBox extends React.Component {
  get_value() {
    var searchBox = document.getElementById('searchBox');
    return searchBox.value;
  }

  render() {
    return (<span><input type='text' id='searchBox' placeholder='Condition/Treamtment' defaultValue={this.props.query} onKeyDown={this.props.onKeyDown} /></span>);
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {query: ''}
  }
  navigateTo = () => {
    var searchBox = document.getElementById('searchBox');
    this.setState({query: searchBox.value});
    const params = new URLSearchParams(window.location.search);
    params.set('q', searchBox.value);
    if (searchBox.value == "")
    {
      params.delete('q');
    }
    var paramsString = params.toString();
    window.history.replaceState({}, null, paramsString.length === 0 ? `${window.location.pathname}` : `${window.location.pathname}?${params.toString()}`);
  }
  componentDidMount() {
    var urlParams = new URLSearchParams(window.location.search);
    var query = urlParams.has('q') ? urlParams.get('q') : '';
    this.setState({query: query});
  }
  keyDown = (event) => {
    if (event.keyCode === 13) {
      this.navigateTo();
    }
  }
  render() {
    return (
      <div className="App">
          <Logo />
          <SearchBox id='searchBox' query={this.state.query} onKeyDown={this.keyDown} />
          <input type='button' value='Go' onClick={this.navigateTo} />
          {this.state.query !== "" ?
          <Trials id="trials" query={this.state.query} /> :
          false }
      </div>
    );
  }
}
export default App;
