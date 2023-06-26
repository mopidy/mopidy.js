#!/usr/bin/env node

/* eslint-env node */
/* eslint-disable no-console */

/*
Output when offline:

  WebSocket error: ...

Output when not playing:

  volume:100%   repeat: off   random: on    single: off   consume: off

Output when playing:

  Kiasmos - Shed
  [playing] #9/14   0:26/5:35 (7%)
  volume:100%   repeat: off   random: on    single: off   consume: off
*/

import Mopidy from "..";

const mopidy = new Mopidy({
  autoConnect: false,
  webSocketUrl: "ws://localhost:6680/mopidy/ws",
});

function renderTrackNumber(track) {
  return `#${track.track_no}/${track.album.num_tracks || "-"}`;
}

function renderTime(timeInSeconds) {
  const minutes = Math.floor(timeInSeconds / 1000 / 60);
  const seconds = Math.floor((timeInSeconds / 1000) % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function renderPosition(track, timePosition) {
  const pos = renderTime(timePosition);
  const length = renderTime(track.length);
  const percentage = Math.floor((timePosition * 100) / track.length);
  return `${pos}/${length} (${percentage}%)`;
}

async function showPlaybackInfo() {
  const trackPromise = mopidy.playback.getCurrentTrack();
  const statePromise = mopidy.playback.getState();
  const timePositionPromise = mopidy.playback.getTimePosition();

  const track = await trackPromise;
  const state = await statePromise;
  const timePosition = await timePositionPromise;

  if (state === "stopped") {
    return;
  }

  const artists = track.artists.map((a) => a.name).join(", ");
  console.log(`${artists} - ${track.name}`);
  console.log(
    `[${state}] ${renderTrackNumber(track)}   ` +
      `${renderPosition(track, timePosition)}`
  );
}

async function showTracklistInfo() {
  const volumePromise = mopidy.mixer.getVolume();
  const repeatPromise = mopidy.tracklist.getRepeat();
  const randomPromise = mopidy.tracklist.getRandom();
  const singlePromise = mopidy.tracklist.getSingle();
  const consumePromise = mopidy.tracklist.getConsume();

  const volume = (await volumePromise).toString().padStart(3, " ");
  const repeat = ((await repeatPromise) && "on ") || "off";
  const random = ((await randomPromise) && "on ") || "off";
  const single = ((await singlePromise) && "on ") || "off";
  const consume = ((await consumePromise) && "on ") || "off";

  console.log(
    `volume:${volume}%   ` +
      `repeat: ${repeat}   ` +
      `random: ${random}   ` +
      `single: ${single}   ` +
      `consume: ${consume}`
  );
}

mopidy.on("state:online", async () => {
  await showPlaybackInfo();
  await showTracklistInfo();
  process.exit();
});

mopidy.on("websocket:error", (error) => {
  console.log(`WebSocket error: ${error.message}`);
  process.exit(1);
});

mopidy.connect();
