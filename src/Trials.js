import React, { useState, useEffect } from 'react';
import { fetchTrialsData, fetchPubMedData, getInterventions, GetData } from "./TrialUtilities.js";

async function expandUrls (url) {
  var urlToGet = new URL(url, window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + window.location.pathname + "/");
  if (!urlToGet.toString().endsWith(".json")) {
    urlToGet = urlToGet + ".json";
  }
  var ffbTrials = await GetData(urlToGet);
  var NCTIds = [];
  ffbTrials.forEach(trialInfo => {
    var ids = trialInfo.trial.split(',');
    ids.forEach(NCTId => {
      NCTIds.push(NCTId);
    });
  });
  var find = "{" + url + "}";
  var replace = "(" + NCTIds.join(" OR ") + ")";
  return ({
    regEx: new RegExp(find, "ig"),
    replace: replace
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

  for (var i = 0; i < found.length; i++) {
    var expand = await expandUrls(found[i]);
    query = query.replace(expand.regEx, expand.replace);
  }

  query = query.replaceAll(" or ", " OR ").replaceAll(" and ", " AND ").replaceAll(" not ", " NOT ");
  return query;
}

export default function Trials(props) {
    const [lastQuery, setLastQuery] = useState(null);
    const [trials, setTrials] = useState(null);
    const [showClosed, setShowClosed] = useState(false);
    const [activeGrouping, setActiveGrouping] = useState(0);
    const [trialCount, setTrialCount] = useState(0);
    const [pubmedCount, setPubmedCount] = useState(0);
    const [fetchedTrials, setFetchedTrials] = useState(null);

    useEffect(() => {
      fetch(); 
      async function fetch() {
        if (props.query !== lastQuery) {
          var query = await expandAndPolishQuery(props.query);
          var fetchedTrials = await fetchTrialsData(query);
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
        var trials = fetchedTrials.filter(
          trial => showClosed ||
          (trial.OverallStatus.toString() != "Completed" &&
            trial.OverallStatus.toString() != "No longer available" && 
            trial.OverallStatus.toString() != "Unknown status" && 
            trial.OverallStatus.toString() != "Withdrawn" && 
            trial.OverallStatus.toString() != "Terminated"))
          .sort(groupings[activeGrouping].compare);
        setTrials(trials);
        setTrialCount(trials.length);
      }
    }, [fetchedTrials, activeGrouping, showClosed]);

    var groupings = [
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
    var lastGroup = null;
    
    function chooseGrouping(e) {
        setActiveGrouping(Number(e.target.selectedIndex));
    }

    function showClosedChanged(e) {
        setShowClosed(e.target.checked);
    }

    function firstFew(conditions) {
      if (conditions.length > 3) {
        return conditions[0] + ", " + conditions[1] + ", " + conditions[2] + ", ...";
      } else {
        return conditions.join(", ");
      }
    }

    var tooManyWarning = trialCount > 6000 ? " [revise terms, only 6000 shown]" : "";
    return <>
        <div className='tm10'>&nbsp;
          { trials !== null ? <>
          <span className='hitCounts'>{"ClinicalTrials.gov (" + trialCount + tooManyWarning + ") |"}</span>{' '}
          <a className='hitCounts' href={'https://pubmed.ncbi.nlm.nih.gov/?term='+props.query}>PubMed.gov{" (" + pubmedCount + ") | "}</a>{' '}
          <a href='https://buymeacoffee.com/rrelyea'>Sponsor this site</a>{" | "}<a href='mailto:rob@relyeas.net'>Feature request</a>
          </> : false }
        </div>
        <div className='status'></div>

        <div>
          <label><input type='checkbox' defaultValue={showClosed} onChange={(e) => showClosedChanged(e)} /><span id='showClosedLabel'>Show Closed {!showClosed && fetchedTrials !== null ? "(" + (fetchedTrials.length - trialCount) + ")": false}</span></label>
          <label className='lm10'>Group by:</label>{' '}
          <select onChange={(e) => chooseGrouping(e)}>
          {groupings.map((grouping)=> <option>{grouping.name}</option>)}
          </select>
        </div>  
        {trials !== null ? Object.entries(trials).map(([k,trial], lastPhase) =>
          {
            var groupingHeader = null;
            var groupingValue = trial;
            for (var i = 0; i < groupings[activeGrouping].groupBy.length; i++) {
              groupingValue = groupingValue[groupings[activeGrouping].groupBy[i]];
            }
            
            groupingValue = groupingValue.toString();
            if (groupingValue != lastGroup) {
              groupingHeader = <h2 className='phase'>{groupingValue}</h2>;
            } 

            lastGroup = groupingValue;
            var status = trial.OverallStatus;
            if (status == "Completed" || status == "Terminated") status = status + " " + new Date(trial.endDate).getFullYear();
            if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();
            
            return <>
              {groupingHeader}
              <div key={trial.NCTId[0]} className="trial">
                <div className={'status '+trial.OverallStatusStyle}>{activeGrouping == 1 ? trial.phaseInfo.group+"-":false}{status}</div>
                <div className='interventionDiv intervention'><span>{getInterventions(trial)}</span></div>
                { activeGrouping == 0 ? <div className='interventionDiv sponsor'><span> ({trial.LeadSponsorName})</span></div> : false }
                <div className='title'><a href={'https://beta.clinicaltrials.gov/study/'+trial.NCTId[0]}>{trial.NCTId[0]}</a> : <span>{trial.BriefTitle}</span></div>
                <div className='title'>Conditions: {firstFew(trial.Condition)}</div>
              </div></>
          })
        : <h3>searching for trials...</h3>}  
      </>;
  }
