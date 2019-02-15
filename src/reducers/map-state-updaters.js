// Copyright (c) 2019 Uber Technologies, Inc.
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

import geoViewport from '@mapbox/geo-viewport';

/**
 * Default initial `mapState`
 * @constant
 * @property {number} pitch - Default: 0
 * @property {number} bearing - Default: 0
 * @property {number} latitude - Default: 37.75043
 * @property {number} longitude - Default: -122.34679
 * @property {number} zoom - Default: 9
 * @property {boolean} dragRotate - Default: false
 * @property {number} width - Default: 800
 * @property {number} height - Default: 800
 * @property {boolean} isSplit - Default: false
 * @public
 */
export const INITIAL_MAP_STATE = {
  pitch: 0,
  bearing: 0,
  latitude: 37.75043,
  longitude: -122.34679,
  zoom: 9,
  dragRotate: false,
  width: 800,
  height: 800,
  isSplit: false
};

/* Updaters */
export const updateMapUpdater = (state, action) => ({
  ...state,
  ...(action.payload || {})
});

/**
 *
 * @param state
 * @param action
 * @returns {{latitude, longitude, zoom}}
 */
export const fitBoundsUpdater = (state, action) => {
  const bounds = action.payload;
  const {center, zoom} = geoViewport.viewport(bounds, [
    state.width,
    state.height
  ]);

  return {
    ...state,
    latitude: center[1],
    longitude: center[0],
    zoom
  };
};

export const togglePerspectiveUpdater = (state, action) => ({
  ...state,
  ...{
    pitch: state.dragRotate ? 0 : 50,
    bearing: state.dragRotate ? 0 : 24
  },
  dragRotate: !state.dragRotate
});

// consider case where you have a split map and user wants to reset
export const receiveMapConfigUpdater = (state, action) => {
  const {isSplit = false} = action.payload.mapState || {};

  return {
    ...state,
    ...(action.payload.mapState || {}),
    isSplit,
    ...getMapDimForSplitMap(isSplit, state)
  };
};

export const toggleSplitMapUpdater = (state, action) => ({
  ...state,
  isSplit: !state.isSplit,
  ...getMapDimForSplitMap(!state.isSplit, state)
});

// Helpers
function getMapDimForSplitMap(isSplit, state) {
  // cases:
  // 1. state split: true - isSplit: true
  // do nothing
  // 2. state split: false - isSplit: false
  // do nothing
  if (state.isSplit === isSplit) {
    return {};
  }

  const width = state.isSplit && !isSplit ?
    // 3. state split: true - isSplit: false
    // double width
    state.width * 2
    // 4. state split: false - isSplit: true
    // split width
    : state.width / 2;

  return {
    width
  };
}
