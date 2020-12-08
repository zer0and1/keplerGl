// Copyright (c) 2020 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React, {Component} from 'react';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import styled, {ThemeProvider} from 'styled-components';
import window from 'global/window';
import {connect} from 'react-redux';

import {theme} from 'kepler.gl/styles';
import Banner from './components/banner';
import Announcement, {FormLink} from './components/announcement';
import {replaceLoadDataModal} from './factories/load-data-modal';
import {replaceMapControl} from './factories/map-control';
import {replacePanelHeader} from './factories/panel-header';
import {AUTH_TOKENS} from './constants/default-settings';
import {messages} from './constants/localization';

import {
  loadRemoteMap,
  loadSampleConfigurations,
  onExportFileSuccess,
  onLoadCloudMapSuccess
} from './actions';

import {loadCloudMap} from 'kepler.gl/actions';
import {CLOUD_PROVIDERS} from './cloud-providers';
import {KEPLER_GL_NAME} from './constants/default-settings';

const KeplerGl = require('kepler.gl/components').injectComponents([
  replaceLoadDataModal(),
  replaceMapControl(),
  replacePanelHeader()
]);

// Sample data
import minionConfig from './map-config/minion';
import {addDataToMap, addNotification} from 'kepler.gl/actions';
import {getFieldsFromData, processCsvData, processGeojson} from 'kepler.gl/processors';

import { ApolloClient, InMemoryCache } from '@apollo/client';
import { gql } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://charming-hawk-93.hasura.app/v1/graphql',
  cache: new InMemoryCache()
});

const BannerHeight = 48;
const BannerKey = `banner-${FormLink}`;
const keplerGlGetState = state => state.demo.keplerGl;

const GlobalStyle = styled.div`
  font-family: ff-clan-web-pro, 'Helvetica Neue', Helvetica, sans-serif;
  font-weight: 400;
  font-size: 0.875em;
  line-height: 1.71429;

  *,
  *:before,
  *:after {
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
  }

  ul {
    margin: 0;
    padding: 0;
  }

  li {
    margin: 0;
  }

  a {
    text-decoration: none;
    color: ${props => props.theme.labelColor};
  }
`;

class App extends Component {
  state = {
    showBanner: false,
    width: window.innerWidth,
    height: window.innerHeight
  };

  // ws = new WebSocket('ws://kepler-drive.herokuapp.com/websocket');

  componentDidMount() {
    /*this.ws.onopen = () => {
      console.log('websocket connected');
    };

    this.ws.onclose = () => {
      console.log('disconnected');
    };
    
    this.ws.onmessage = (data) => {
      console.log(data)
    };*/

    // if we pass an id as part of the url
    // we ry to fetch along map configurations
    const {params: {id, provider} = {}, location: {query = {}} = {}} = this.props;

    const cloudProvider = CLOUD_PROVIDERS.find(c => c.name === provider);
    if (cloudProvider) {
      this.props.dispatch(
        loadCloudMap({
          loadParams: query,
          provider: cloudProvider,
          onSuccess: onLoadCloudMapSuccess
        })
      );
      return;
    }

    // Load sample using its id
    // if (id) {
    //   this.props.dispatch(loadSampleConfigurations(id));
    // }

    // // Load map using a custom
    // if (query.mapUrl) {
    //   // TODO?: validate map url
    //   this.props.dispatch(loadRemoteMap({dataUrl: query.mapUrl}));
    // }

    this._loadData();
    // delay zs to show the banner
    // if (!window.localStorage.getItem(BannerKey)) {
    //   window.setTimeout(this._showBanner, 3000);
    // }
    // load sample data
    // this._loadSampleData();

    // Notifications
    // this._loadMockNotifications();
  }

  _showBanner = () => {
    this.setState({showBanner: true});
  };

  _hideBanner = () => {
    this.setState({showBanner: false});
  };

  _disableBanner = () => {
    this._hideBanner();
    window.localStorage.setItem(BannerKey, 'true');
  };

  _loadMockNotifications = () => {
    const notifications = [
      [{message: 'Welcome to Kepler.gl'}, 3000],
      [{message: 'Something is wrong', type: 'error'}, 1000],
      [{message: 'I am getting better', type: 'warning'}, 1000],
      [{message: 'Everything is fine', type: 'success'}, 1000]
    ];

    this._addNotifications(notifications);
  };

  _addNotifications(notifications) {
    if (notifications && notifications.length) {
      const [notification, timeout] = notifications[0];

      window.setTimeout(() => {
        this.props.dispatch(addNotification(notification));
        this._addNotifications(notifications.slice(1));
      }, timeout);
    }
  }

  _loadData() {
    client
      .query({
        query: gql`
          query MyQuery {
            signal_samples_view {
              date
              longitude
              latitude
              rssi
              cell_id,
              cell_name,
              bs_longitude,
              bs_latitude
            }
          }
        `
      })
      .then(result => {
        const data = result.data.signal_samples_view;
        const order = ['date', 'longitude', 'latitude', 'rssi', 'cell_id', 'celL_name', 'bs_longitude', 'bs_latitude'];
        const fields = getFieldsFromData(data, order);
        const rows = new Array;

        data.forEach(item => {
          rows.push(order.map(field => item[field]));
        });

        this.props.dispatch(
          addDataToMap({
            datasets: {
              info: {
                label: 'Signal Samples',
                id: 'signal_sample_data'
              },
              data: { fields, rows }
            },
            options: {
              centerMap: true,
              readOnly: false
            },
            config: minionConfig
          })
        );
      })
  }

  _toggleCloudModal = () => {
    // TODO: this lives only in the demo hence we use the state for now
    // REFCOTOR using redux
    this.setState({
      cloudModalOpen: !this.state.cloudModalOpen
    });
  };

  _getMapboxRef = (mapbox, index) => {
    if (!mapbox) {
      // The ref has been unset.
      // https://reactjs.org/docs/refs-and-the-dom.html#callback-refs
      // console.log(`Map ${index} has closed`);
    } else {
      // We expect an InteractiveMap created by KeplerGl's MapContainer.
      // https://uber.github.io/react-map-gl/#/Documentation/api-reference/interactive-map
      const map = mapbox.getMap();
      map.on('zoomend', e => {
        // console.log(`Map ${index} zoom level: ${e.target.style.z}`);
      });
    }
  };

  render() {
    return (
      <ThemeProvider theme={theme}>
        <GlobalStyle
          // this is to apply the same modal style as kepler.gl core
          // because styled-components doesn't always return a node
          // https://github.com/styled-components/styled-components/issues/617
          ref={node => {
            node ? (this.root = node) : null;
          }}
        >
          <Banner
            show={this.state.showBanner}
            height={BannerHeight}
            bgColor="#2E7CF6"
            onClose={this._hideBanner}
          >
            <Announcement onDisable={this._disableBanner} />
          </Banner>
          <div
            style={{
              transition: 'margin 1s, height 1s',
              position: 'absolute',
              width: '100%',
              height: '100%',
              left: 0,
              top: 0
            }}
          >
            <AutoSizer>
              {({height, width}) => (
                <KeplerGl
                  appName={KEPLER_GL_NAME}
                  mapboxApiAccessToken={AUTH_TOKENS.MAPBOX_TOKEN}
                  id="map"
                  /*
                   * Specify path to keplerGl state, because it is not mount at the root
                   */
                  getState={keplerGlGetState}
                  width={width}
                  height={height}
                  cloudProviders={CLOUD_PROVIDERS}
                  localeMessages={messages}
                  onExportToCloudSuccess={onExportFileSuccess}
                  onLoadCloudMapSuccess={onLoadCloudMapSuccess}
                />
              )}
            </AutoSizer>
          </div>
        </GlobalStyle>
      </ThemeProvider>
    );
  }
}

const mapStateToProps = state => state;
const dispatchToProps = dispatch => ({dispatch});

export default connect(mapStateToProps, dispatchToProps)(App);
