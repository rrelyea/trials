import React from 'react';

class SearchBox extends React.Component {
  get_value() {
    var searchBox = document.getElementById('searchBox');
    return searchBox.value;
  }

  render() {
    return (<span><input type='text' id='searchBox' placeholder='Condition/Treamtment' defaultValue={this.props.query} onKeyDown={this.props.onKeyDown} /></span>);
  }
}

export default SearchBox;