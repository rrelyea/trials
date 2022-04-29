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
  itemRenderer = ({
    item,
    timelineContext,
    itemContext,
    getItemProps,
    getResizeProps
  }) => {
    const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();
    const borderColor = itemContext.resizing ? "red" : item.color;
    return (
      <div
        {...getItemProps({
          style: {
            backgroundColor: item.color,
            color: "white",
            borderColor,
            borderStyle: "solid",
            borderWidth: 1,
            borderRadius: 4,
            borderLeftWidth: itemContext.selected ? 3 : 1,
            borderRightWidth: itemContext.selected ? 3 : 1
          },
          onMouseDown: () => {
            console.log("on item click", item);
          }
        })}
      >
        {itemContext.useResizeHandle ? <div {...leftResizeProps} /> : null}

        <div
          style={{
            height: itemContext.dimensions.height,
            overflow: "hidden",
            paddingLeft: 3,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {itemContext.title}
        </div>

        {itemContext.useResizeHandle ? <div {...rightResizeProps} /> : null}
      </div>
    );
  };
  async componentDidMount() {
    const params = new URLSearchParams(window.location.search);
    var query = params.get('q');
    document.title = "'" + query + "' Trials";
    var url = 'https://clinicaltrials.gov/api/query/study_fields?expr='+query+'&fields=NCTId,Condition,BriefTitle,Phase,OverallStatus,WhyStopped,LeadSponsorName,InterventionName,StudyFirstPostDate,StartDate,LastUpdatePostDate,CompletionDate&fmt=JSON&max_rnk=100';
    var data = await GetData(url);
    var id = 1;
    data.StudyFieldsResponse.StudyFields.forEach((trial) => {
      if (trial.StartDate !== "" && trial.CompletionDate !== "" && trial.Phase !== null && trial.Phase[0] !== undefined) {
        var StartDate = new Date(trial.StartDate);
        var CompletionDate = new Date(trial.CompletionDate);
        if (this.startViewDate == null || this.startViewDate > StartDate) this.startViewDate = StartDate;
        if (this.endViewDate == null || this.endViewDate < CompletionDate) this.endViewDate = CompletionDate;
        var phaseStr = trial.Phase[0] !== null ? trial.Phase[0].toString() : "";
        var phase = phaseStr.substring(phaseStr.length - 1);
        var completed = trial.OverallStatus == "Completed";
        var unknown = trial.OverallStatus == "Unknown status";
        var terminated = trial.OverallStatus == "Terminated";
        var color = "green";
        if (completed) { color = "blue" } 
        else if (unknown) { color = "black"}
        else if (terminated) {color = "red"}
        
        var trialData = {
          id: id,
          group: Number(phase),
          title: trial.LeadSponsorName + ": " + trial.InterventionName[0] + " - " + trial.BriefTitle,
          start_time: moment(StartDate),
          end_time: moment(CompletionDate),
          color: color
        }
        this.items.push(trialData);
      }
      id = id + 1;
    });
    this.setState({data: data, query: query});
  }

  render() {
    
    const groups = [{ id: 1, title: 'Phase 1' }, { id: 2, title: 'Phase 2' }, { id: 3, title: 'Phase 3' }]
    return (this.startViewDate !== null ?
      <>
        <h1 key='title'>{"'" + this.state.query + "' Trials"}</h1>

        <Timeline stackItems
          groups={groups}
          items={this.items}
          defaultTimeStart={moment(this.startViewDate)}
          defaultTimeEnd={moment(new Date())}
        />

        {this.state.data !== null ? this.state.data.StudyFieldsResponse.StudyFields.map((study)=>
        {
          return <><div key={study.NCTId[0]}>

            <div><span>{study.LeadSponsorName}</span>: <span>{study.InterventionName[0]}</span></div>
            <span>{study.Phase[0]}</span> - <span>{study.OverallStatus}</span> - <span>{study.WhyStopped}</span><br/>
            <span>Start: {study.StartDate}</span> - <span>FirstPost: {study.StudyFirstPostDate}</span> - <span>LastUpdate: {study.LastUpdatePostDate}</span> - <span>CompletionDate: {study.CompletionDate}</span>
            <div><a href={'https://beta.clinicaltrials.gov/study/'+study.NCTId[0]}>{study.NCTId[0]}</a> : <span>{study.BriefTitle}</span></div>
            <div>&nbsp;</div>
            </div></>
        })
        : false}  
           
      </> : false 
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
