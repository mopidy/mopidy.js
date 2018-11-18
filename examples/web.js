/* global window */
/* eslint no-console:off, camelcase:off */

import Mopidy from "../src/mopidy";

const mopidy = new Mopidy({
  webSocketUrl: "ws://localhost:6680/mopidy/ws",
});

// Make instance available through developer console
window.mopidy = mopidy;

// Utilities

function el(id) {
  return document.getElementById(id);
}

function hide(selector) {
  document.querySelectorAll(selector).forEach(e => {
    e.hidden = true;
  });
}

function show(selector) {
  document.querySelectorAll(selector).forEach(e => {
    e.hidden = false;
  });
}

// Event log

function appendToEventLog(type, data) {
  const log = el("event-log");
  log.insertAdjacentHTML(
    "beforeend",
    `<strong>${new Date().toISOString()} ${type}</strong><br>`
  );
  if (data) {
    log.insertAdjacentHTML("beforeend", JSON.stringify(data, null, 2));
    log.insertAdjacentHTML("beforeend", "<br>");
  }
  log.scrollTop = log.scrollHeight;
}
mopidy.on("state", appendToEventLog);
mopidy.on("event", appendToEventLog);
mopidy.on("websocket:incomingMessage", msg =>
  appendToEventLog("websocket:incomingMessage", JSON.parse(msg.data))
);
mopidy.on("websocket:outgoingMessage", data =>
  appendToEventLog("websocket:outgoingMessage", data)
);

// Player

function updatePlaybackState(state, timePosition) {
  if (timePosition) {
    el("playback-state").innerText = `${state} at ${timePosition / 1000}s`;
  } else {
    el("playback-state").innerText = state;
  }

  switch (state) {
    case "playing":
      el("play").hidden = true;
      el("pause").hidden = false;
      break;
    case "paused":
    case "stopped":
      el("play").hidden = false;
      el("pause").hidden = true;
      break;
    default:
  }
}

function updateCover(trackUri, images) {
  const [image] = images[trackUri];
  el("cover").setAttribute("src", image.uri);
  el("cover").setAttribute("height", image.height);
  el("cover").setAttribute("width", image.width);
}

function updateCurrentTrack(track) {
  const artists = track.artists.map(a => a.name).join(", ");
  let albumName = track.album.name;
  if (track.album.date) {
    albumName = `${albumName} (${track.album.date})`;
  }

  el("current-artist").innerText = artists;
  el("current-album").innerText = albumName;
  el("current-track").innerText = track.name;
  el("current-uri").innerText = track.uri;

  mopidy.library
    .getImages([[track.uri]])
    .then(result => updateCover(track.uri, result));
}

// Event handlers

mopidy.on("state:online", () => {
  hide(".offline-only");
  show(".online-only");

  mopidy.playback.getState().then(updatePlaybackState);
  mopidy.playback.getCurrentTrack().then(updateCurrentTrack);

  el("play").onclick = () => mopidy.playback.play();
  el("pause").onclick = () => mopidy.playback.pause();
  el("previous").onclick = () => mopidy.playback.previous();
  el("next").onclick = () => mopidy.playback.next();

  el("repeat").onclick = () =>
    mopidy.tracklist
      .getRepeat()
      .then(state => mopidy.tracklist.setRepeat([!state]));
  el("random").onclick = () =>
    mopidy.tracklist
      .getRandom()
      .then(state => mopidy.tracklist.setRandom([!state]));
  el("single").onclick = () =>
    mopidy.tracklist
      .getSingle()
      .then(state => mopidy.tracklist.setSingle([!state]));
  el("consume").onclick = () =>
    mopidy.tracklist
      .getConsume()
      .then(state => mopidy.tracklist.setConsume([!state]));
});

mopidy.on("state:offline", () => {
  hide(".online-only");
  show(".offline-only");
});

mopidy.on("event:playbackStateChanged", ({ new_state }) => {
  updatePlaybackState(new_state);
});

mopidy.on("event:trackPlaybackStarted", ({ tl_track }) => {
  updateCurrentTrack(tl_track.track);
});

mopidy.on("event:trackPlaybackStopped", () => {
  updatePlaybackState("stopped");
});

mopidy.on("event:trackPlaybackPaused", ({ time_position }) => {
  updatePlaybackState("paused", time_position);
});

mopidy.on("event:trackPlaybackResumed", () => {});

mopidy.on("event:optionsChanged", () => {
  mopidy.tracklist
    .getRepeat()
    .then(state => el("repeat").classList.toggle("active", state));
  mopidy.tracklist
    .getRandom()
    .then(state => el("random").classList.toggle("active", state));
  mopidy.tracklist
    .getSingle()
    .then(state => el("single").classList.toggle("active", state));
  mopidy.tracklist
    .getConsume()
    .then(state => el("consume").classList.toggle("active", state));
});

window.onload = () => {
  el("host").innerText = document.location.host;
};
