import './App.css';
import React from 'react';
import Trials from './Trials.js';




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
    this.state = {query: '', queries: []}
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
    if (searchBox.value == "")
    {
      params.delete('q');
    }
    var paramsString = params.toString();
    window.history.pushState({}, null, paramsString.length === 0 ? `${window.location.pathname}` : `${window.location.pathname}?${params.toString()}`);
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
  componentDidMount() {
    var urlParams = new URLSearchParams(window.location.search);
    var query = urlParams.has('q') ? urlParams.get('q') : '';
    var queries = urlParams.has('qs') ? urlParams.get('qs').split(',') : [];
    this.setState({query: query, queries: queries});
  }
  keyDown = (event) => {
    if (event.keyCode === 13) {
      this.navigateTo(null);
    }
  }
  handleChange = (event) => {
    this.setState({query:event.target.value});
    this.setSearchBoxValue(event.target.value);
  }
  render() {
    var queryList = null;
    if (this.state.queries.length > 0) {
      queryList = <><select onChange={this.handleChange}>
        <option key='0' value=''>Choose a Prebuilt Query</option>
        { this.state.queries.map((q)=>{
          var terms = q.split(':');
          if (terms.length > 1) {
            return <option key={q} value={terms[1]}>{terms[0]}</option>;
          } else {
            return <option key={q} value={q}>{q}</option>;
          }
        })}
      </select>&nbsp;</>
    }
    return (
      <div className="App">
          {queryList}
          <Logo />
          <SearchBox id='searchBox' query={this.state.query} onKeyDown={this.keyDown} />
          <input type='button' value='Go' onClick={() => this.navigateTo(null)} />
          {this.state.query !== "" ?
          <Trials id="trials" query={this.state.query} /> :
          false }
      </div>
    );
  }
}
export default App;
