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
  async componentDidMount() {
    const params = new URLSearchParams(window.location.search);
    var query = params.get('q');
    document.title = "'" + query + "' Trials";
    var url = 'https://clinicaltrials.gov/api/query/study_fields?expr='+query+'&fields=NCTId,Condition,BriefTitle,Phase,OverallStatus,WhyStopped,LeadSponsorName,InterventionName,StudyFirstPostDate,StartDate,LastUpdatePostDate,CompletionDate&fmt=JSON&max_rnk=100';
    var data = await GetData(url);

    this.setState({data: data, query: query});
  }

  render() {
    const groups = [{ id: 1, title: 'group 1' }, { id: 2, title: 'group 2' }]
 
const items = [
  {
    id: 1,
    group: 1,
    title: 'item 1',
    start_time: moment(),
    end_time: moment().add(1, 'hour')
  },
  {
    id: 2,
    group: 2,
    title: 'item 2',
    start_time: moment().add(-0.5, 'hour'),
    end_time: moment().add(0.5, 'hour')
  },
  {
    id: 3,
    group: 1,
    title: 'item 3',
    start_time: moment().add(2, 'hour'),
    end_time: moment().add(3, 'hour')
  }
]
    return (
      <>
        <h1>{"'" + this.state.query + "' Trials"}</h1>

        {this.state.data !== null ? this.state.data.StudyFieldsResponse.StudyFields.map((study)=>
        {
          if (study.OverallStatus != "Completed" && study.OverallStatus != "Terminated" && study.OverallStatus != "Unknown status"){
          return <><div key={study.NCTId[0]}>

            <div><span>{study.LeadSponsorName}</span>: <span>{study.InterventionName[0]}</span></div>
            <span>{study.Phase[0]}</span> - <span>{study.OverallStatus}</span> - <span>{study.WhyStopped}</span><br/>
            <span>Start: {study.StartDate}</span> - <span>FirstPost: {study.StudyFirstPostDate}</span> - <span>LastUpdate: {study.LastUpdatePostDate}</span> - <span>CompletionDate: {study.CompletionDate}</span>
            <div><a href={'https://beta.clinicaltrials.gov/study/'+study.NCTId[0]}>{study.NCTId[0]}</a> : <span>{study.BriefTitle}</span></div>
            <div>&nbsp;</div>
            </div></>
          }
          else
          {
            return false;
          }
        })
        : false}  
            <Timeline
      groups={groups}
      items={items}
      defaultTimeStart={moment().add(-12, 'hour')}
      defaultTimeEnd={moment().add(12, 'hour')}
    />
      </>
    );
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
