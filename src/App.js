import './App.css';
import React from 'react';
import Trials from './Trials.js';

class SearchBox extends React.Component {
  get_value() {
    var searchBox = document.getElementById('searchBox');
    return searchBox.value;
  }

  render() {
    return (<span><input type='text' id='searchBox' placeholder='Condition/Treatment' defaultValue={this.props.query} onKeyDown={this.props.onKeyDown} /></span>);
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {query: '', queries: [], feeds: {'ClinicalTrials.gov':'{ct.gov}'}, activeFeed: '{ct.gov}'};
    window.addEventListener('popstate', this.onBackButtonEvent);
  }

  navigateTo = (query) => {
    if (query === null) {
      var searchBox = document.getElementById('searchBox');
      query = searchBox.value;
    }

    this.setState({query: query});
    const params = new URLSearchParams(window.location.search);
    params.set('q', query);
    if (this.state.queries === null) {
      params.delete('qs');
    }

    if (searchBox.value === "")
    {
      params.delete('q');
    }

    var paramsString = params.toString();
    window.history.replaceState({}, null, paramsString.length === 0 ? `${window.location.pathname}` : `${window.location.pathname}?${params.toString()}`);
  }

  onBackButtonEvent = () => {
    var urlParams = new URLSearchParams(window.location.search);
    var query = urlParams.has('q') ? urlParams.get('q') : '';
    var queries = urlParams.has('qs') ? urlParams.get('qs').split(',') : [];
    this.setSearchBoxValue(query);
    this.setState({query: query, queries: queries});
  }

  setSearchBoxValue = (query) => {
    var searchBox = document.getElementById('searchBox');
    searchBox.value = query;
  }

  getDefaultValue(key) {
    switch (key) {
      case 'feed': return "{ct.gov}";
    }
  }

  updateQueryStringValue(key, value) {
    const params = new URLSearchParams(window.location.search);
    if (value !== this.getDefaultValue(key)) {
      params.set(key, value);
    } else if (params.has(key)) {
      params.delete(key);
    }

    var paramsString = params.toString();
    window.history.replaceState({}, null, paramsString.length === 0 ? `${window.location.pathname}` : `${window.location.pathname}?${params.toString()}`);
  }

  componentDidMount() {
    var urlParams = new URLSearchParams(window.location.search);
    var query = urlParams.has('q') ? urlParams.get('q') : '';
    var queries = urlParams.has('qs') ? urlParams.get('qs').split(',') : [];
    var activeFeed = urlParams.has('feed') ? urlParams.get('feed') : '{ct.gov}';
    var feeds = this.state.feeds;
    var queriesToShow = [];
    for (var i = 0; i < queries.length; i++) {
      var terms = queries[i].split(':');
      if (terms[terms.length-1].startsWith('{') && terms[terms.length-1].endsWith('}')) {
        var key = terms.length > 1 ? terms[0] : terms[0];
        feeds[key] = terms[terms.length-1];
      } else {
        queriesToShow.push(queries[i]);
      }
    }

    this.setState({query: query, queries: queriesToShow, feeds: feeds, activeFeed: activeFeed });
  }

  keyDown = (event) => {
    if (event.keyCode === 13) {
      this.navigateTo(null);
    }
  }

  chooseQuery = (event) => {
    if (event.target.value !== '') {
      this.setState({query:event.target.value});
      this.setSearchBoxValue(event.target.value);
    }
  }

  chooseFeed = (event) => {
    this.setState({activeFeed:event.target.value});
    this.updateQueryStringValue('feed', event.target.value);
  }

  render() {
    var queryList = null;
    if (this.state.queries.length > 0) {
      queryList = <><label>Saved Queries:&nbsp;<select onChange={this.chooseQuery}>
        <option key='0' value=''></option>
        { this.state.queries.map((q)=>{
          var terms = q.split(':');
          if (terms.length > 1) {
            return <option key={q} value={terms[1]}>{terms[0]}</option>;
          } else {
            return <option key={q} value={q}>{q}</option>;
          }
        })}
      </select></label>&nbsp;</>
    }
    var options = [];
    for (const prop in this.state.feeds) {
      options.push(<option value={this.state.feeds[prop]}>{prop}</option>)
    }
    return (
      <div className="App">
          <label>Search for&nbsp;
            <SearchBox id='searchBox' query={this.state.query} onKeyDown={this.keyDown} /> in <span>
              <select onChange={this.chooseFeed} value={this.state.activeFeed}>
                {options}
              </select>
            </span>
          </label>{' '}
          <input type='button' value='Go' onClick={() => this.navigateTo(null)} />
          <br />
          {queryList}
        <Trials id="trials" query={this.state.query} activeFeed={this.state.activeFeed} />
      </div>
    );
  }
}

export default App;