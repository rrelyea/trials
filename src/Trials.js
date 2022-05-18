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

function incorporateFeedIntoQuery(query, feed) {
  if (feed !== "{ct.gov}") {
    var contraction = query.trim() === "" ? "" : " AND ";
    query = query + contraction + feed;
  }
  return query;
}
// expand {relative-uri} or {absolute-uri} and replace 'or', 'and', 'not with uppercase versions.
async function expandAndPolishQuery(query) {
  var found = [],          // an array to collect the strings that are found
  rxp = /{([^}]+)}/g,
  curMatch;

  while( curMatch = rxp.exec( query ) ) {
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
const useReactPath = () => {
  const [path, setPath] = React.useState(window.location.href);
  const listenToPopstate = () => {
    const winPath = window.location.href;
    setPath(winPath);
  };
  React.useEffect(() => {
    window.addEventListener("popstate", listenToPopstate);
    return () => {
      window.removeEventListener("popstate", listenToPopstate);
    };
  }, []);
  return path;
};

export default function Trials(props) {
    const [lastQuery, setLastQuery] = useState(null);
    const [lastFeed, setLastFeed] = useState(null);
    const [trials, setTrials] = useState(null);
    const [hideClosed, setHideClosed] = useState(false);
    const [sort, setSort] = useState(0);
    const [view, setView] = useState(0);
    const [trialCount, setTrialCount] = useState(0);
    const [pubmedQuery, setPubmedQuery] = useState(0);
    const [pubmedCount, setPubmedCount] = useState(0);
    const [fetchedTrials, setFetchedTrials] = useState(null);

    const path = useReactPath();

    useEffect(() => {
      var urlParams = new URLSearchParams(window.location.search);
      var sortParam = urlParams.has('sort') ? Number(urlParams.get('sort')) : 0;
      var viewParam = urlParams.has('view') ? Number(urlParams.get('view')) : 0;
      var hideClosedParam = urlParams.has('hideClosed') ? urlParams.get('hideClosed') === 'true' : false;
      setSort(sortParam);
      setView(viewParam);
      setHideClosed(hideClosedParam);
    }, [path]);

    useEffect(() => {
      fetch(); 
      async function fetch() {
        if (props.query !== lastQuery || props.activeFeed != lastFeed) {
          var queryPlusFeed = incorporateFeedIntoQuery(props.query, props.activeFeed);
          var queryInfo = await expandAndPolishQuery(queryPlusFeed);

          var fetchedTrials = await fetchTrialsData(queryInfo.query, queryInfo.dataAnnotations);
          setFetchedTrials(fetchedTrials);
          setLastQuery(props.query);
          setLastFeed(props.activeFeed);
          document.title = "'" + props.query + "' Trials";
        }
      }
    }, [props.query, props.activeFeed, fetchedTrials]);

    useEffect(() => { 
      fetch2();
      async function fetch2() {
        if (props.query != lastQuery || props.activeFeed != lastFeed) {
          var queryPlusFeed = incorporateFeedIntoQuery(props.query, props.activeFeed);
          var queryInfo = await expandAndPolishQuery(queryPlusFeed);
          var results = await fetchPubMedData(queryInfo.query);
          setPubmedQuery(queryInfo.query);
          setPubmedCount(results.esearchresult.count);
        }
      }
     }, [props.query, props.activeFeed, pubmedCount]);

     useEffect(() => {
      if (fetchedTrials !== null) {
        var filteredTrials = fetchedTrials.filter(
          trial => !hideClosed ||
          (trial.OverallStatus.toString() != "Completed" &&
            trial.OverallStatus.toString() != "No longer available" && 
            trial.OverallStatus.toString() != "Unknown status" && 
            trial.OverallStatus.toString() != "Withdrawn" && 
            trial.OverallStatus.toString() != "Terminated"));
        var trials = sortOrders[sort].name !== "None" ? filteredTrials.sort(sortOrders[sort].compare) : filteredTrials;
        setTrials(trials);
        setTrialCount(trials.length);
      }
    }, [fetchedTrials, sort, hideClosed, view]);

    function getDefaultValue(key) {
      switch (key) {
        case 'sort': return 0;
        case 'view': return 0;
        case 'hideClosed': return false;
      }
    }

    function updateQueryStringValue(key, value) {
      const params = new URLSearchParams(window.location.search);
      if (value !== getDefaultValue(key)) {
        params.set(key, value);
      } else if (params.has(key)) {
        params.delete(key);
      }

      var paramsString = params.toString();
      window.history.replaceState({}, null, paramsString.length === 0 ? `${window.location.pathname}` : `${window.location.pathname}?${params.toString()}`);
    }

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

    var sortOrders = [
      {
        name: "Phase",
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
        name: "None",
        groupBy: null,
        compare: null
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
        name: 'Default',
        method: defaultStyle,
      },
      {
        name: 'ClinicalTrials.gov (classic)',
        method: clinicalTrialsClassicStyle,
      },
      {
        name: 'Arrow',
        method: arrowStyle,
      },
      {
        name: 'Table',
        method: tableStyle2,
      }
    ];

    function chooseSort(e) {
      setSort(e.target.selectedIndex);
      updateQueryStringValue('sort', Number(e.target.selectedIndex));
    }
    
    function chooseView(e) {
      setView(Number(e.target.selectedIndex));
      updateQueryStringValue('view', Number(e.target.selectedIndex));
    }

    function hideClosedChanged(e) {
      setHideClosed(e.target.checked);
      updateQueryStringValue('hideClosed', e.target.checked);
    }

    function defaultStyle(trial, groupingHeader) {
      var status = trial.OverallStatus;
      if (status == "Completed" || status == "Terminated" || status == "Suspended") status = status + " " + new Date(trial.endDate).getFullYear();
      if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();
      return <>
              {groupingHeader}
              <div key={trial.NCTId[0]} className="trial">
                  <div className={'oldstatus '+trial.OverallStatusStyle}>{sortOrders[sort].name !== "Phase" ? trial.phaseInfo.name+"-":false}{status}</div>
                  <div className='interventionDiv intervention tal'><span>{firstFew(getInterventions(trial, true), 3, ", ")}</span></div>
                  { sortOrders[sort].name !== "Sponsor" ? <div className='interventionDiv oldsponsor'><span> ({trial.LeadSponsorName})</span></div> : false }
                  <div className='title'><a href={'https://beta.clinicaltrials.gov/study/'+trial.NCTId[0]}>{trial.NCTId[0]}</a> : <span>{trial.BriefTitle}</span></div>
                  <div className='title'>Conditions: {firstFew(trial.Condition, 3, ", ")}</div>
              </div></>
    }

    function tableStyle2(trial, groupingHeader, modern=true) {
      var status = trial.OverallStatus;
      if (status == "Completed" || status == "Terminated") status = status + " " + new Date(trial.endDate).getFullYear();
      if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();
      var trialStyle =  trial.closed ? "trial tal closedRow" : "trial tal";
      return <>
              {groupingHeader}
              <div key={trial.NCTId[0]} className={trialStyle}>
                  <span className='tal w200'>

                  {trial.annotations != null ? trial.annotations.condition : firstFew(trial.Condition, 3, ", ")}
                  {trial.annotations != null && trial.annotations.approachDetail != null ? " (" + trial.annotations.approachDetail +") - " : " - "}
                  <a href={trial.annotations?.sponsorLink}>{ true ? (trial.annotations?.sponsor != null ? trial.annotations.sponsor : cleanSponsor(trial.LeadSponsorName)) : cleanSponsor(trial.LeadSponsorName)}</a>
                  </span>
                  <span className='tal w120'>
                    {trial.phaseInfo.name} 
                  </span>
                  { modern ? <span className='tal w120'>
                    <a href={'https://beta.clinicaltrials.gov/study/'+trial.NCTId[0]}>{trial.NCTId[0]}</a>
                  </span> : false }
                  
                  
              </div></>
    }

    function clinicalTrialsClassicStyle(trial, groupingHeader) {
      var status = trial.OverallStatus;
      if (status == "Completed" || status == "Terminated") status = status + " " + new Date(trial.endDate).getFullYear();
      if (status == "Unknown status") status = "Unknown " + new Date(trial.LastUpdatePostDate).getFullYear();
      var trialStyle =  trial.closed ? "trial tal closedRow" : "trial tal";
      return <>
              {groupingHeader}
              <div key={trial.NCTId[0]} className={trialStyle}>
                  <span className='tal w120'>
                    {trial.OverallStatus} 
                  </span>
                  <span className='tal w200'>
                    <a href={'https://clinicaltrials.gov/ct2/show/'+trial.NCTId[0]}>{trial.BriefTitle}</a>
                  </span>
                  <span className='tal w120'>
                    {firstFew(trial.Condition, 2, "*")} 
                  </span>
                  <span className='tal w150'>
                    {firstFew(getInterventions(trial, false), 3, " | ")} 
                  </span>
                  <span className='tal w120'>
                    {trial.phaseInfo.name} 
                  </span>
                  <span className='tal w200'>
                    {firstFew(trial.LocationFacility, 3, ", ")}
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
                  <div className='info approach'>{trial.annotations?.condition != null ? trial.annotations.condition : firstFew(trial.Condition, 3, ", ")} {trial.annotations?.geneTarget != null ? "(" + trial.annotations?.geneTarget + ")" : null}
                    {' - '}<a href={trial.annotations?.sponsorLink}>{trial.annotations?.sponsor != null ? trial.annotations.sponsor : trial.LeadSponsorName}</a></div>
              </div></>
    }

    var lastGroup = null;
    var tooManyWarning = trialCount > 6000 ? " [revise terms, only 6000 shown]" : "";
    return <>
        <div className='tm10'>&nbsp;
          { trials !== null ? <>
          <label>Result count:&nbsp;
            <span className='hitCounts'>{"ClinicalTrials.gov (" + trialCount + tooManyWarning + ") |"}</span>{' '}
            <a className='hitCounts' href={'https://pubmed.ncbi.nlm.nih.gov/?term='+pubmedQuery}>PubMed.gov{" (" + pubmedCount + ")"}</a>
          </label>       
          </> : false }
        </div>
        <div className='status'></div>

        <div className='tbm10'>
          <label>
            <input type='checkbox' checked={hideClosed} onChange={(e) => hideClosedChanged(e)} /><span>Hide Closed</span>
          </label>
          <label className='lm10'>Sort by:&nbsp;
            <select onChange={(e) => chooseSort(e)} value={sortOrders[sort].name} >
              {sortOrders.map((sortOrder)=> <option>{sortOrder.name}</option>)}
            </select>
          </label>
          <label className='lm10'>View:&nbsp;
            <select onChange={(e) => chooseView(e)} value={views[view].name}>
              {views.map((view)=> <option>{view.name}</option>)}
            </select>
          </label>
        </div>  
        {trials !== null ? Object.entries(trials).map(([k,trial], lastPhase) =>
          {
            var sortHeader = null;
            if (sortOrders[sort].name !== "None") {
              var sortValue = trial;
              for (var i = 0; i < sortOrders[sort].groupBy.length; i++) {
                sortValue = sortValue[sortOrders[sort].groupBy[i]];
                if (sortValue == null) { break; }
              }

              sortValue = sortValue != null ? sortValue.toString() : sortOrders[sort].name + " Type Missing";
              if (sortValue != lastGroup) {
                sortHeader = <div className='sortHeader'>{sortValue}</div>;
              } 

              lastGroup = sortValue;
            }

            return views[view].method(trial, sortHeader);
          })
        : <h3>searching for trials...</h3>}  
      </>;
  }
