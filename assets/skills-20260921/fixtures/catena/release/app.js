'use strict';
// Tidepool widget loader v2.4.0
export function mount(el, spot) {
  el.dataset.spot = spot;
  el.textContent = `Loading forecast for ${spot}…`;
}
