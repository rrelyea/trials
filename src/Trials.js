import React, { useState, useEffect } from 'react';
import { fetchTrialsData, fetchPubMedData, getInterventions, GetData, cleanSponsor, firstFew } from "./TrialUtilities.js";

async function expandUrls (url) {
  var urlToGet = new URL(url, window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + window.location.pathname + "/");
  if (!urlToGet.toString().endsWith(".json")) {
    urlToGet = urlToGet + ".json";
  }

  var dataAnnotations = await GetData(urlToGet);
  var NCTIds = [];
  dataAnnotations.data.forEach(trialInfo => {
    var ids = trialInfo.trial.split(',');
    ids.forEach(NCTId => {
      if (NCTId != "")
      NCTIds.push(NCTId);
    });
  });
  
  var find = "{" + url + "}";
  var replace = "(" + NCTIds.join(" OR ") + ")";
  return ({
    regEx: new RegExp(find, "ig"),
    replace: replace,
    dataAnnotations: dataAnnotations
  });
}

// expand {relative-uri} or {absolute-uri} and replace 'or', 'and', 'not with uppercase versions.
async function expandAndPolishQuery(query) {
  var found = [],          // an array to collect the strings that are found
  rxp = /{([^}]+)}/g,
  str = query,
  curMatch;

  while( curMatch = rxp.exec( str ) ) {
      found.push( curMatch[1] );
  }

  var dataAnnotations = null;
  for (var i = 0; i < found.length; i++) {
    var expand = await expandUrls(found[i]);
    query = query.replace(expand.regEx, expand.replace);

    //TODO: this currently only uses one dataAnnotations. More than 1 could be used.
    dataAnnotations = expand.dataAnnotations;
  }

  query = query.replaceAll(" or ", " OR ").replaceAll(" and ", " AND ").replaceAll(" not ", " NOT ");
  return ({
    query: query,
    dataAnnotations: dataAnnotations
  });
}

export default function Trials(props) {
    const [lastQuery, setLastQuery] = useState(null);
    const [trials, setTrials] = useState(null);
    const [hideClosed, setHideClosed] = useState(false);
    const [activeGrouping, setActiveGrouping] = useState(0);
    const [activeView, setActiveView] = useState(0);
    const [trialCount, setTrialCount] = useState(0);
    const [pubmedCount, setPubmedCount] = useState(0);
    const [fetchedTrials, setFetchedTrials] = useState(null);

    useEffect(() => {
      fetch(); 
      async function fetch() {
        if (props.query !== lastQuery) {
          var queryInfo = await expandAndPolishQuery(props.query);
          var fetchedTrials = await fetchTrialsData(queryInfo.query, queryInfo.dataAnnotations);
          setFetchedTrials(fetchedTrials);
          setLastQuery(props.query);
          document.title = "'" + props.query + "' Trials";
        }
      }
    }, [props.query, fetchedTrials]);

    useEffect(() => { 
      fetch2();
      async function fetch2() {
        if (props.query != lastQuery) {
          var results = await fetchPubMedData(props.query);
          setPubmedCount(results.esearchresult.count);
        }
      }
     }, [props.query]);

     useEffect(() => {
      if (fetchedTrials !== null) {
        var filteredTrials = fetchedTrials.filter(
          trial => !hideClosed ||
          (trial.OverallStatus.toString() != "Completed" &&
            trial.OverallStatus.toString() != "No longer available" && 
            trial.OverallStatus.toString() != "Unknown status" && 
            trial.OverallStatus.toString() != "Withdrawn" && 
            trial.OverallStatus.toString() != "Terminated"));
        var trials = groupings[activeGrouping].name !== "None" ? filteredTrials.sort(groupings[activeGrouping].compare) : filteredTrials;
        setTrials(trials);
        setTrialCount(trials.length);
      }
    }, [fetchedTrials, activeGrouping, hideClosed, activeView]);

    function rankApproach(trial) {
      var approach = trial.annotations?.approach;
      switch (approach) {
        case "Gene Therapies": return 1;
        case "RNA/Other": return 2;
        case "Cell-Based Therapies": return 3;
        case "Small Molecules": return 4;
        default: 
          return 5;
      }
    }

    var groupings = [
      {
        name: "None",
        groupBy: null,
        compare: null
      },     
      {
        name: "Phase (desc)",
        groupBy: "phaseInfo.name".split('.'),
        compare: function (trialA, trialB) { 
          return  trialA.phaseInfo.number > trialB.phaseInfo.number ? -1 : 1
          || new Date(trialA.LastUpdatePostDate) - new Date(trialB.LastUpdatePostDate)
        }
      },
      {
        name: "Sponsor",
        groupBy: "LeadSponsorName".split('.'),
        compare: function (trialA, trialB) { 
          return (trialA.LeadSponsorName < trialB.LeadSponsorName ? -1 : 1)
        }
      },
      {
        name: "Approach",
        groupBy: "annotations.approach".split('.'),
        compare: function (trialA, trialB) { 
          return (rankApproach(trialA) < rankApproach(trialB) ? -1 : 1)
        }
      },
      {
        name: "Condition",
        groupBy: "annotations.condition".split('.'),
        compare: function (trialA, trialB) { 
          return (trialA.annotations?.condition < trialB.annotations?.condition ? -1 : 1)
        }
      }
    ];

    var views = [
      {
        name: 'ClinicalTrials.gov (classic)',
        method: clinicalTrialsGovStyle,
      },
      {
        name: 'Table (classic)',
        method: tableStyle1,
      },
      {
        name: 'Table (new)',
        method: tableStyle2,
      },
      {
        name: 'Default',
        method: defaultStyle,
      },

      {
        name: 'Arrow',
        method: arrowStyle,
      },
    ];

    function chooseGrouping(e) {
        setActiveGrouping(Number(e.target.selectedIndex));
    }
    
    function chooseView(e) {
      setActiveView(Number(e.target.selectedIndex));
    }

    function hideClosedChanged(e) {
        setHideClosed(e.target.checked);
    }

    function defaultStyle(trial, groupingHeader) {
      var status = trial.OverallStatus;
      if (status == "Completed" || status == "Terminated") status = status + " " + new Date(trial.endDate).getFullYear();
      if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();
      return <>
              {groupingHeader}
              <div key={trial.NCTId[0]} className="trial">
                  <div className={'oldstatus '+trial.OverallStatusStyle}>{activeGrouping == 1 ? trial.phaseInfo.name+"-":false}{status}</div>
                  <div className='interventionDiv intervention'><span>{getInterventions(trial, true)}</span></div>
                  { activeGrouping == 1 ? <div className='interventionDiv oldsponsor'><span> ({trial.LeadSponsorName})</span></div> : false }
                  <div className='title'><a href={'https://beta.clinicaltrials.gov/study/'+trial.NCTId[0]}>{trial.NCTId[0]}</a> : <span>{trial.BriefTitle}</span></div>
                  <div className='title'>Conditions: {firstFew(trial.Condition)}</div>
              </div></>
    }

    function tableStyle1(trial, groupingHeader) {
      return tableStyle(trial, groupingHeader, false);
    }
    function tableStyle2(trial, groupingHeader) {
      return tableStyle(trial, groupingHeader, true);
    }
    function tableStyle(trial, groupingHeader, modern) {
      var status = trial.OverallStatus;
      if (status == "Completed" || status == "Terminated") status = status + " " + new Date(trial.endDate).getFullYear();
      if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();
      var trialStyle =  trial.closed ? "trial tal closedRow" : "trial tal";
      return <>
              {groupingHeader}
              <div key={trial.NCTId[0]} className={trialStyle}>
                  <span className='tal w200'>

                  {trial.annotations != null ? trial.annotations.condition : firstFew(trial.Condition)}
                  {trial.annotations != null && trial.annotations.approachDetail != null ? " (" + trial.annotations.approachDetail +") - " : " - "}
                  <a href={trial.annotations?.sponsorLink}>{ true ? (trial.annotations?.sponsor != null ? trial.annotations.sponsor : cleanSponsor(trial.LeadSponsorName)) : cleanSponsor(trial.LeadSponsorName)}</a>
                  </span>
                  <span className='tal w50'>
                    {trial.phaseInfo.name} 
                  </span>
                  { modern ? <span className='tal w50'>
                    <a href={'https://beta.clinicaltrials.gov/study/'+trial.NCTId[0]}>{trial.NCTId[0]}</a>
                  </span> : false }
                  
                  
              </div></>
    }

    function clinicalTrialsGovStyle(trial, groupingHeader) {
      var status = trial.OverallStatus;
      if (status == "Completed" || status == "Terminated") status = status + " " + new Date(trial.endDate).getFullYear();
      if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();
      var trialStyle =  trial.closed ? "trial tal closedRow" : "trial tal";
      return <>
              {groupingHeader}
              <div key={trial.NCTId[0]} className={trialStyle}>
                  <span className='tal w50'>
                    {trial.OverallStatus} 
                  </span>
                  <span className='tal w200'>
                    <a href={'https://clinicaltrials.gov/ct2/show/'+trial.NCTId[0]}>{trial.BriefTitle}</a>
                  </span>
                  <span className='tal w50'>
                    {firstFew(trial.Condition, "*")} 
                  </span>
                  <span className='tal w50'>
                    {getInterventions(trial, false)} 
                  </span>
                  <span className='tal w50'>
                    {trial.phaseInfo.name} 
                  </span>
                  <span className='tal w100'>
                    {firstFew(trial.LocationFacility,",")}
                  </span>
              </div></>
    }

    function arrowStyle(trial, groupingHeader) {
      var arrowColor = trial.closed ? 'grey' : 'lightgreen';
      var status = trial.OverallStatus;
      if (status == "Completed" || status == "Terminated") status = status + " " + new Date(trial.endDate).getFullYear();
      if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();
      return <>
              {groupingHeader}
              <div key={trial.NCTId[0]} className="trial container">
                  <svg xmlns="http://www.w3.org/2000/svg" className='arrow'>
                    <defs>
                      <marker id="arrowhead" markerWidth="1" markerHeight="1" 
                      refX="0" refY=".5" orient="auto">
                        <polygon points="0 0, 1 .5, 0 1" fill={arrowColor} />
                      </marker>
                    </defs>
                    <line x1="0%" y1="15%" x2={90 * trial.phaseInfo.number / 5.0 + '%'} y2="15%" stroke={arrowColor} 
                    strokeWidth="20" markerEnd={ trial.closed ? "" : "url(#arrowhead)"}/>
                  </svg>
                  <div className='info nct'><a href={'https://beta.clinicaltrials.gov/study/'+trial.NCTId[0]}>{trial.NCTId[0]}</a></div>
                  <div className='info interventions'><span>{getInterventions(trial, true)}</span></div>
                  { false ? <span className='info sponsor'>{trial.LeadSponsorName}</span> : false }
                  <div className={'info status '}>{status}</div>
                  <div className='info approach'>{trial.annotations?.condition != null ? trial.annotations.condition : firstFew(trial.Condition)} {trial.annotations?.geneTarget != null ? "(" + trial.annotations?.geneTarget + ")" : null}
                    {' - '}<a href={trial.annotations?.sponsorLink}>{trial.annotations?.sponsor != null ? trial.annotations.sponsor : trial.LeadSponsorName}</a></div>
              </div></>
    }

    var lastGroup = null;
    var tooManyWarning = trialCount > 6000 ? " [revise terms, only 6000 shown]" : "";
    return <>
        <div className='tm10'>&nbsp;
          { trials !== null ? <>
          <span className='hitCounts'>{"ClinicalTrials.gov (" + trialCount + tooManyWarning + ") |"}</span>{' '}
          <a className='hitCounts' href={'https://pubmed.ncbi.nlm.nih.gov/?term='+props.query}>PubMed.gov{" (" + pubmedCount + ")"}</a>          
          </> : false }
        </div>
        <div className='status'></div>

        <div className='tbm10'>
          <label><input type='checkbox' defaultValue={hideClosed} onChange={(e) => hideClosedChanged(e)} /><span id='showClosedLabel'>Hide Closed</span></label>
          <label className='lm10'>Sort by:</label>{' '}
          <select onChange={(e) => chooseGrouping(e)}>
          {groupings.map((grouping)=> <option>{grouping.name}</option>)}
          </select>
          <label className='lm10'>View:</label>{' '}
          <select onChange={(e) => chooseView(e)}>
          {views.map((view)=> <option>{view.name}</option>)}
          </select>
        </div>  
        {trials !== null ? Object.entries(trials).map(([k,trial], lastPhase) =>
          {
            var groupingHeader = null;
            if (groupings[activeGrouping].name !== "None") {
              var groupingValue = trial;
              for (var i = 0; i < groupings[activeGrouping].groupBy.length; i++) {
                groupingValue = groupingValue[groupings[activeGrouping].groupBy[i]];
                if (groupingValue == null) { break; }
              }

              groupingValue = groupingValue != null ? groupingValue.toString() : groupings[activeGrouping].name + " Type Missing";
              if (groupingValue != lastGroup) {
                groupingHeader = <div className='group'>{groupingValue}</div>;
              } 

              lastGroup = groupingValue;
            }

            return views[activeView].method(trial, groupingHeader);
            
          })
        : <h3>searching for trials...</h3>}  
      </>;
  }
