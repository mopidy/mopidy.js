// Type definitions for Mopidy.js v1.2.0, Mopidy v3.0.2 WebSocket API

export = Mopidy;

declare class Mopidy {
  // ----------------- MOPIDY.JS SPECIFIC API -----------------

  /**
   * Mopidy.js is a JavaScript library for controlling a Mopidy music server.
   *
   * The library makes Mopidy's core API available from browsers and Node.js
   * programs, using JSON-RPC over a WebSocket to communicate with Mopidy.
   *
   * This library is the foundation of most Mopidy web clients.
   */
  constructor(options: Mopidy.Options);
  /**
   * Explicit connect function for when autoConnect:false is passed to
   * constructor.
   */
  connect(): Promise<void>;
  /**
   * Close the WebSocket without reconnecting. Letting the object be garbage
   * collected will have the same effect, so this isn't strictly necessary.
   */
  close(): Promise<void>;

  // ----------------- EVENT SUBSCRIPTION -----------------

  on<K extends keyof Mopidy.StrictEvents>(
    name: K,
    listener: Mopidy.StrictEvents[K]
  ): this;

  off(): void;
  off<K extends keyof Mopidy.StrictEvents>(
    name: K,
    listener: Mopidy.StrictEvents[K]
  ): this;

  // ----------------- CORE API -----------------

  /**
   * Manages everything related to the list of tracks we will play. See
   * TracklistController. Undefined before Mopidy connects.
   */
  tracklist?: Mopidy.core.TracklistController;
  /**
   * Manages playback state and the current playing track. See
   * PlaybackController. Undefined before Mopidy connects.
   */
  playback?: Mopidy.core.PlaybackController;
  /**
   * Manages the music library, e.g. searching and browsing for music. See
   * LibraryController. Undefined before Mopidy connects.
   */
  library?: Mopidy.core.LibraryController;
  /**
   * Manages stored playlists. See PlaylistsController. Undefined before
   * Mopidy connects.
   */
  playlists?: Mopidy.core.PlaylistsController;
  /**
   * Manages volume and muting. See MixerController. Undefined before Mopidy
   * connects.
   */
  mixer?: Mopidy.core.MixerController;
  /**
   * Keeps record of what tracks have been played. See HistoryController.
   * Undefined before Mopidy connects.
   */
  history?: Mopidy.core.HistoryController;

  /**
   * Get list of URI schemes we can handle
   */
  getUriSchemes(): Promise<string[]>;
  /**
   * Get version of the Mopidy core API
   */
  getVersion(): Promise<string>;
}

declare namespace Mopidy {
  type ValueOf<T> = T[keyof T];
  type URI = string;

  interface Options {
    /**
     * URL used when creating new WebSocket objects.
     *
     * In a browser environment, it defaults to
     * ws://${document.location.host}/mopidy/ws. If the current page is served
     * over HTTPS, it defaults to using wss:// instead of ws://.
     *
     * In a non-browser environment, where document.location isn't available, it
     * defaults to ws://localhost/mopidy/ws.
     */
    webSocketUrl: string;
    /**
     * Whether or not to connect to the WebSocket on instance creation. Defaults
     * to true.
     */
    autoConnect?: boolean;
    /**
     * The minimum number of milliseconds to wait after a connection error before
     * we try to reconnect. For every failed attempt, the backoff delay is doubled
     * until it reaches backoffDelayMax. Defaults to 1000.
     */
    backoffDelayMin?: number;
    /**
     * The maximum number of milliseconds to wait after a connection error before
     * we try to reconnect. Defaults to 64000.
     */
    backoffDelayMax?: number;
    /**
     * If set, this object will be used to log errors from Mopidy.js. This is
     * mostly useful for testing Mopidy.js. Defaults to console.
     */
    console?: Console;
    /**
     * An existing WebSocket object to be used instead of creating a new
     * WebSocket. Defaults to undefined.
     */
    webSocket?: WebSocket;
  }

  interface StrictEvents extends core.CoreListener {
    /**
     * The events from Mopidy are also emitted under the aggregate event named
     * event.
     */
    event: (args?: unknown) => void;

    /**
     * Client state
     *
     * You can get notified about when the Mopidy.js client is connected to the
     * server and ready for method calls, when it's offline, and when it's
     * trying to reconnect to the server by looking at the events
     */
    "state:online": () => void;
    "state:offline": () => void;
    reconnectionPending: ({ timeToAttempt }: { timeToAttempt: number }) => void;
    reconnecting: () => void;
    /**
     * The client state events are also emitted under the aggregate event named
     * state.
     */
    state: (args?: unknown) => void;

    /**
     * WebSocket events
     *
     * You can introspect what happens internally on the WebSocket by looking at
     * the events.
     *
     * Of course, you can also do this using the web developer tools in any
     * modern browser.
     */
    "websocket:close": any;
    "websocket:error": any;
    "websocket:incomingMessage": any;
    "websocket:open": any;
    "websocket:outgoingMessage": any;
  }

  // https://docs.mopidy.com/en/latest/api/models/
  namespace models {
    type ModelType = "album" | "artist" | "directory" | "playlist" | "track";

    class Ref<T extends ModelType> {
      constructor({ uri, name, type }: { uri: URI; name: string; type: T });
      static album(): Ref<"album">;
      static artist(): Ref<"artist">;
      static directory(): Ref<"directory">;
      static playlist(): Ref<"playlist">;
      static track(): Ref<"track">;
      static ALBUM: "album";
      static ARTIST: "artist";
      static DIRECTORY: "directory";
      static PLAYLIST: "playlist";
      static TRACK: "track";
      readonly name: string;
      readonly type: T;
      readonly uri: URI;
    }

    /**
     * A tracklist track. Wraps a regular track and it's tracklist ID.
     *
     * The use of TlTrack allows the same track to appear multiple times in the
     * tracklist.
     *
     * This class also accepts it's parameters as positional arguments. Both
     * arguments must be provided, and they must appear in the order they are
     * listed here.
     *
     * This class also supports iteration, so your extract its values like this:
     *
     *   `(tlid, track) = tl_track`
     *
     */
    class TlTrack {
      constructor({ tlid, track }: { tlid: number; track: Track });
      readonly tlid: number;
      readonly track: Track;
    }
    class Track {
      constructor({
        uri,
        name,
        artists,
        album,
        composers,
        performers,
        genre,
        track_no,
        disc_no,
        date,
        length,
        bitrate,
        comment,
        musicbrainz_id,
        last_modified,
      }: {
        /**
         * The track URI
         */
        uri: URI;
        /**
         * The track name
         */
        name: string;
        /**
         * The track artists
         */
        artists: Artist[];
        /**
         * The track album
         */
        album: Album;
        /**
         * The track composers
         */
        composers: Artist[];
        /**
         * The track performers
         */
        performers: Artist[];
        /**
         * The track genre
         */
        genre: string;
        /**
         * The track number in the album
         */
        track_no?: number;
        /**
         * The disc number in the album
         */
        disc_no?: number;
        /**
         * The track release date (YYYY or YYYY-MM-DD)
         */
        date: string;
        /**
         * The track length in milliseconds
         */
        length?: number;
        /**
         * The track bitrate in kbit/s
         */
        bitrate: number;
        /**
         * The track comment
         */
        comment: string;
        /**
         * The track MusicBrainz ID
         */
        musicbrainz_id: string;
        /**
         * Integer representing when the track was last modified. Exact meaning
         * depends on source of track. For local files this is the modification
         * time in milliseconds since Unix epoch. For other backends it could be
         * an equivalent timestamp or simply a version counter.
         */
        last_modified?: number;
      });
      /**
       * The track URI
       */
      readonly uri: URI;
      /**
       * The track name
       */
      readonly name: string;
      /**
       * The track artists
       */
      readonly artists: Artist[];
      /**
       * The track album
       */
      readonly album: Album;
      /**
       * The track composers
       */
      readonly composers: Artist[];
      /**
       * The track performers
       */
      readonly performers: Artist[];
      /**
       * The track genre
       */
      readonly genre: string;
      /**
       * The track number in the album
       */
      readonly track_no: number;
      /**
       * The disc number in the album
       */
      readonly disc_no: number;
      /**
       * The track release date (YYYY or YYYY-MM-DD)
       */
      readonly date: string;
      /**
       * The track length in milliseconds.
       */
      readonly length: number;
      /**
       * The track bitrate in kbit/s
       */
      readonly bitrate: string;
      /**
       * The track comment
       */
      readonly comment: string;
      /**
       * The track MusicBrainz ID
       */
      readonly musicbrainz_id: string;
      /**
       * Integer representing when the track was last modified. Exact meaning
       * depends on source of track. For local files this is the modification
       * time in milliseconds since Unix epoch. For other backends it could be
       * an equivalent timestamp or simply a version counter.
       */
      readonly last_modified: number;
    }
    class SearchResult {
      constructor({
        uri,
        tracks,
        artists,
        albums,
      }: {
        /**
         * The search result URI
         */
        uri: URI;
        /**
         * The tracks matching the search query
         */
        tracks: Track[];
        /**
         * The artists matching the search query
         */
        artists: Artist[];
        /**
         * The albums matching the search query
         */
        albums: Album[];
      });
      /**
       * The search result URI
       */
      readonly uri: URI;
      /**
       * The tracks matching the search query
       */
      readonly tracks: Track[];
      /**
       * The artists matching the search query
       */
      readonly artists: Artist[];
      /**
       * The albums matching the search query
       */
      readonly albums: Album[];
    }

    class Artist {
      constructor({
        uri,
        name,
        sortname,
        musicbrainz_id,
      }: {
        /**
         * The artist URI
         */
        uri: URI;
        /**
         * The artist name
         */
        name: string;
        /**
         * Artist name for better sorting, e.g. with articles stripped
         */
        sortname: string;
        /**
         * The MusicBrainz ID of the artist
         */
        musicbrainz_id: string;
      });
      /**
       * The artist URI
       */
      readonly uri: URI;
      /**
       * The artist name
       */
      readonly name: string;
      /**
       * Artist name for better sorting, e.g. with articles stripped
       */
      readonly sortname: string;
      /**
       * The MusicBrainz ID of the artist
       */
      readonly musicbrainz_id: string;
    }

    class Album {
      constructor({
        uri,
        name,
        artists,
        num_tracks,
        num_discs,
        date,
        musicbrainz_id,
      }: {
        /**
         * The album URI
         */
        uri: URI;
        /**
         * The album name
         */
        name: string;
        /**
         * A set of album artists
         */
        artists: Artist[];
        /**
         * The number of tracks in the album
         */
        num_tracks: number;
        /**
         * The number of discs in the album
         */
        num_discs: number;
        /**
         * The album release date (YYYY or YYYY-MM-DD)
         */
        date: string;
        /**
         * The MusicBrainz ID of the album
         */
        musicbrainz_id: string;
      });
      /**
       * The album URI
       */
      readonly uri: URI;
      /**
       * The album name
       */
      readonly name: string;
      /**
       * A set of album artists
       */
      readonly artists: Artist[];
      /**
       * The number of tracks in the album
       */
      readonly num_tracks: number;
      /**
       * The number of discs in the album
       */
      readonly num_discs: number;
      /**
       * album release date (YYYY or YYYY-MM-DD)
       */
      readonly date: string;
      /**
       * The MusicBrainz ID of the album
       */
      readonly musicbrainz_id: string;
    }

    class Image {
      constructor({
        uri,
        width,
        height,
      }: {
        /**
         * The URI of the image
         */
        uri: URI;
        /**
         * The width of the image
         */
        width?: number;
        /**
         * The height of the image
         */
        height?: number;
      });
      /**
       * The URI of the image
       */
      readonly uri: URI;
      /**
       * The width of the image
       */
      readonly width: number;
      /**
       * The height of the image
       */
      readonly height: number;
    }

    class Playlist {
      constructor({
        uri,
        name,
        tracks,
        last_modified,
      }: {
        /**
         * The URI of the image
         */
        uri: URI;
        /**
         * The playlist name
         */
        name: string;
        /**
         * The playlist’s tracks
         */
        tracks: Track[];
        /**
         * The playlist modification time in milliseconds since Unix epoch
         */
        last_modified: number;
      });
      /**
       * The URI of the image
       */
      readonly uri: URI;
      /**
       * The playlist name
       */
      readonly name: string;
      /**
       * The playlist’s tracks
       */
      readonly tracks: Track[];
      /**
       * The playlist modification time in milliseconds since Unix epoch
       */
      readonly last_modified: number;
      /**
       * The number of tracks in the playlist
       */
      readonly length: number;
    }
  }

  /**
   * The core API is the interface that is used by frontends like mopidy.http and Mopidy-MPD.
   * The core layer is in between the frontends and the backends. Don’t forget that you will
   * be accessing core as a Pykka actor. If you are only interested in being notified about
   * changes in core see CoreListener.
   */
  namespace core {
    type PlaybackState = "playing" | "paused" | "stopped";
    type QueryField =
      | "uri"
      | "track_name"
      | "album"
      | "artist"
      | "albumartist"
      | "composer"
      | "performer"
      | "track_no"
      | "genre"
      | "date"
      | "comment"
      | "any";
    type Query = { [key in QueryField]?: string[] };

    // ----------------- Events -----------------

    /**
     * Core events
     *
     * You can get events sent from the Mopidy server by looking at the events
     * with the name prefix 'event:'
     */
    interface CoreListener {
      /**
       * Called whenever the mute state is changed.
       */
      "event:muteChanged": ({
        mute,
      }: {
        /**
         * the new mute state
         */
        mute: boolean;
      }) => void;
      "event:optionsChanged": () => void;
      "event:playbackStateChanged": ({
        old_state,
        new_state,
      }: {
        old_state: PlaybackState;
        new_state: PlaybackState;
      }) => void;
      "event:playlistChanged": ({
        playlist,
      }: {
        playlist: models.Playlist;
      }) => void;
      "event:playlistDeleted": ({
        /**
         * the URI of the deleted playlist
         */
        uri,
      }: {
        uri: URI;
      }) => void;
      "event:playlistsLoaded": () => void;
      /**
       * Called whenever the time position changes by an unexpected amount, e.g.
       * at seek to a new time position.
       */
      "event:seeked": ({
        /**
         * the position that was seeked to in milliseconds
         */
        time_position,
      }: {
        time_position: number;
      }) => void;
      /**
       * Called whenever the currently playing stream title changes.
       */
      "event:streamTitleChanged": ({
        /**
         * the new stream title
         */
        title,
      }: {
        title: string;
      }) => void;

      /**
       * Called whenever playback of a track ends.
       */
      "event:trackPlaybackEnded": ({
        /**
         * the track that was played before playback stopped
         */
        tl_track,
        /**
         * the time position in milliseconds
         */
        time_position,
      }: {
        tl_track: models.TlTrack;
        time_position: number;
      }) => void;
      /**
       * Called whenever track playback is paused.
       */
      "event:trackPlaybackPaused": ({
        /**
         * the track that was playing when playback paused
         */
        tl_track,
        /**
         * the time position in milliseconds
         */
        time_position,
      }: {
        tl_track: models.TlTrack;
        time_position: number;
      }) => void;
      /**
       * Called whenever track playback is resumed.
       */
      "event:trackPlaybackResumed": ({
        /**
         * the track that was playing when playback resumed
         */
        tl_track,
        /**
         * the time position in milliseconds
         */
        time_position,
      }: {
        tl_track: models.TlTrack;
        time_position: number;
      }) => void;
      /**
       * Called whenever a new track starts playing.
       */
      "event:trackPlaybackStarted": ({
        /**
         * the track that just started playing
         */
        tl_track,
      }: {
        tl_track: models.TlTrack;
      }) => void;
      /**
       * Called whenever the tracklist is changed.
       */
      "event:tracklistChanged": () => void;
      /**
       * Called whenever the volume is changed.
       */
      "event:volumeChanged": ({
        /**
         * the new volume in the range [0..100]
         */
        volume,
      }: {
        volume: number;
      }) => void;
    }

    // ----------------- CONTROLLERS -----------------

    // https://docs.mopidy.com/en/latest/api/core/#tracklist-controller
    interface TracklistController {
      /**
       * Add tracks to the tracklist.
       *
       * If `uris` is given instead of `tracks`, the URIs are looked up in the library
       * and the resulting tracks are added to the tracklist.
       *
       * If `at_position` is given, the tracks are inserted at the given position in
       * the tracklist. If `at_position` is not given, the tracks are appended to
       * the end of the tracklist.
       *
       * Triggers the `mopidy.core.CoreListener.tracklist_changed()` event.
       */
      add({
        tracks,
        at_position,
        uris,
      }: {
        /**
         * The tracks to add
         */
        tracks?: models.Track[];
        /**
         * The position in tracklist to add tracks
         */
        at_position?: number;
        /**
         * list of URIs for tracks to add
         */
        uris?: string[];
      }): Promise<models.TlTrack[]>;

      /**
       * Remove the matching tracks from the tracklist.
       * Uses `filter()` to lookup the tracks to remove.
       *
       * Triggers the `mopidy.core.CoreListener.tracklist_changed()` event.
       */
      remove({
        criteria,
      }: {
        /**
         * (dict, of (string, list) pairs) – one or more rules to match by
         */
        criteria: { [key: string]: string[] };
      }): Promise<models.TlTrack[]>;

      /**
       * Clear the tracklist
       *
       * Triggers the `mopidy.core.CoreListener.tracklist_changed()` event.
       */
      clear(): Promise<void>;

      /**
       * Move the tracks in the slice `[start:end]` to `to_position`.
       *
       * Triggers the `mopidy.core.CoreListener.tracklist_changed()` event.
       */
      move({
        start,
        end,
        to_position,
      }: {
        /**
         * position of first track to move
         */
        start: number;
        /**
         * position after last track to move
         */
        end: number;
        /**
         * new position for the tracks
         */
        to_position: number;
      }): Promise<void>;

      /**
       * Shuffles the entire tracklist. If `start` and `end` is given
       * only shuffles the slice `[start:end]`.
       *
       * Triggers the `mopidy.core.CoreListener.tracklist_changed()` event.
       */
      shuffle({
        start,
        end,
      }: {
        /**
         * position of first track to shuffle
         */
        start?: number;
        /**
         * position after last track to shuffle
         */
        end?: number;
      }): Promise<void>;

      /**
       * Get tracklist as list of `mopidy.models.TlTrack`
       */
      getTlTracks(): Promise<models.TlTrack[]>;

      /**
       * The position of the given track in the tracklist.
       *
       * If neither tl_track or tlid is given we return the index of the
       * currently playing track.
       */
      index({
        tl_track,
        tlid,
      }: {
        /**
         * The track to find the index of
         */
        tl_track?: models.TlTrack;
        /**
         * TLID of the track to find the index of
         */
        tlid?: number;
      }): Promise<number | null>;

      /**
       * Get the tracklist version.
       *
       * Integer which is increased every time the tracklist is changed.
       * Is not reset before Mopidy is restarted.
       */
      getVersion(): Promise<number>;

      /**
       * Get length of the tracklist
       */
      getLength(): Promise<number>;

      /**
       * Get tracklist as list of `mopidy.models.Track`
       */
      getTracks(): Promise<models.Track[]>;

      /**
       * Returns a slice of the tracklist, limited by the given start and end
       * positions.
       */
      slice({
        start,
        end,
      }: {
        /**
         * position of first track to include in slice
         */
        start: number;
        /**
         * position after last track to include in slice
         */
        end: number;
      }): Promise<models.TlTrack[]>;

      /**
       *
       * Filter the tracklist by the given criteria.
       *
       * Each rule in the criteria consists of a model field and a list of values to compare it against. If * the model field matches any of the values, it may be returned.
       *
       * Only tracks that match all the given criteria are returned.
       */
      filter({
        criteria,
      }: {
        /**
         * (dict, of (string, list) pairs) – one or more rules to match by
         */
        criteria: { [key: string]: string[] };
      }): Promise<models.TlTrack[]>;

      // ----------------- FUTURE STATE -----------------

      /**
       * The TLID of the track that will be played after the current track.
       *
       * Not necessarily the same TLID as returned by `get_next_tlid()`.
       */
      getEotTlid(): Promise<number | null>;

      /**
       * The tlid of the track that will be played if calling `mopidy.core.PlaybackController.next()`.
       *
       * For normal playback this is the next track in the tracklist. If repeat is enabled the next
       * track can loop around the tracklist. When random is enabled this should be a random track,
       * all tracks should be played once before the tracklist repeats.
       */
      getNextTlid(): Promise<number | null>;

      /**
       * Returns the TLID of the track that will be played if calling
       * `mopidy.core.PlaybackController.previous()`.
       *
       * For normal playback this is the previous track in the tracklist. If random and/or
       * consume is enabled it should return the current track instead.
       */
      getPreviousTlid(): Promise<number | null>;

      /**
       * The track that will be played after the given track.
       *
       * Not necessarily the same track as `next_track()`.
       */
      eotTrack({
        tl_track,
      }: {
        /**
         * The reference track
         */
        tl_track?: models.TlTrack;
      }): Promise<models.TlTrack | null>;

      // ----------------- DEPRECATED -----------------

      /**
       * @deprecated Deprecated since version 3.0: Use `get_next_tlid()` instead.
       */
      nextTrack({
        tl_track,
      }: {
        tl_track: models.TlTrack;
      }): Promise<models.TlTrack | null>;

      /**
       * @deprecated Deprecated since version 3.0: Use `get_previous_tlid()` instead.
       */
      previousTrack({
        tl_track,
      }: {
        tl_track: models.TlTrack;
      }): Promise<models.TlTrack | null>;

      // ----------------- OPTIONS -----------------

      /**
       * Get consume mode.
       *
       * True - Tracks are removed from the tracklist when they have been played.
       * False - Tracks are not removed from the tracklist.
       */
      getConsume(): Promise<boolean>;

      /**
       * Set consume mode.
       *
       * True - Tracks are removed from the tracklist when they have been played.
       * False - Tracks are not removed from the tracklist.
       */
      setConsume({ value }: { value: boolean }): Promise<void>;

      /**
       * Get random mode.
       */
      getRandom(): Promise<boolean>;

      /**
       * Set random mode.
       *
       * True - Tracks are selected at random from the tracklist.
       * False - Tracks are played in the order of the tracklist.
       */
      setRandom({ value }: { value: boolean }): Promise<void>;

      /**
       * Get repeat mode.
       */
      getRepeat(): Promise<boolean>;

      /**
       * Set repeat mode.
       *
       * To repeat a single track, set both `repeat` and `single`.
       */
      setRepeat({ value }: { value: boolean }): Promise<void>;

      /**
       * Get single mode
       */
      getSingle(): Promise<boolean>;

      /**
       * Set single mode.
       *
       * True - Playback is stopped after current song, unless in repeat mode.
       * False - Playback continues after current song.
       */
      setSingle({ value }: { value: boolean }): Promise<void>;
    }

    // https://docs.mopidy.com/en/latest/api/core/#playback-controller
    interface PlaybackController {
      /**
       * Play the given track, or if the given `tl_track` and `tlid` is None,
       * play the currently active track.
       *
       * Note that the track *must* already be in the tracklist.
       */
      play({
        track,
        tlid,
      }: {
        track?: models.TlTrack;
        tlid?: number;
      }): Promise<void>;

      /**
       * Change to the next track.
       *
       * The current playback state will be kept. If it was playing, playing will
       * continue. If it was paused, it will still be paused, etc.
       */
      next(): Promise<void>;

      /**
       * Change to the previous track.
       *
       * The current playback state will be kept. If it was playing, playing will
       * continue. If it was paused, it will still be paused, etc.
       */
      previous(): Promise<void>;

      /**
       * Stop playing.
       */
      stop(): Promise<void>;

      /**
       * Pause playback.
       */
      pause(): Promise<void>;

      /**
       * If paused, resume playing the current track.
       */
      resume(): Promise<void>;

      /**
       * Seeks to time position given in milliseconds.
       */
      seek({
        time_position,
      }: {
        /**
         * time position in milliseconds
         */
        time_position: number;
      }): Promise<boolean>;

      // ----------------- CURRENT TRACK -----------------

      /**
       * Get the currently playing or selected track.
       */
      getCurrentTlTrack(): Promise<models.TlTrack | null>;

      /**
       * Get the currently playing or selected track.
       *
       * Extracted from `get_current_tl_track()` for convenience.
       */
      getCurrentTrack(): Promise<models.Track | null>;

      /**
       * Get the current stream title or None.
       */
      getStreamTitle(): Promise<string | null>;

      /**
       * Get time position in milliseconds.
       */
      getTimePosition(): Promise<number | null>;

      // ----------------- PLAYBACK STATES -----------------

      /**
       * Get The playback state.
       */
      getState(): Promise<PlaybackState>;

      /**
       * Set the playback state. See:
       *  https://docs.mopidy.com/en/latest/api/core/#mopidy.core.PlaybackController.set_state
       * for possible states and transitions
       */
      setState({ new_state }: { new_state: PlaybackState }): Promise<void>;
    }

    // https://docs.mopidy.com/en/latest/api/core/#library-controller
    interface LibraryController {
      /**
       * Browse directories and tracks at the given uri.
       *
       * uri is a string which represents some directory belonging to a backend.
       * To get the intial root directories for backends pass None as the URI.
       *
       * returns a list of `mopidy.models.Ref` objects for the directories and
       * tracks at the given uri.
       *
       * The Ref objects representing tracks keep the track's original URI. A
       * matching pair of objects can look like this:
       *
       *    Track(uri='dummy:/foo.mp3', name='foo', artists=..., album=...)
       *    Ref.track(uri='dummy:/foo.mp3', name='foo')
       *
       * The Ref objects representing directories have backend specific URIs.
       * These are opaque values, so no one but the backend that created them
       * should try and derive any meaning from them. The only valid exception to
       * this is checking the scheme, as it is used to route browse requests to
       * the correct backend.
       *
       * For example, the dummy library's /bar directory could be returned like
       * this:
       *
       *    `Ref.directory(uri='dummy:directory:/bar', name='bar')`
       */
      browse({
        uri,
      }: {
        /**
         * URI to browse
         */
        uri: URI;
      }): Promise<models.Ref<any>[]>;

      /**
       * Search the library for tracks where `field` contains `values`.
       *
       * `field` can be one of `uri`, `track_name`, `album`, `artist`, `albumartist`,
       * `composer`, `performer`, `track_no`, `genre`, `date`, `comment`, or `any`.
       *
       * If `uris` is given, the search is limited to results from within the URI
       * roots. For example passing `uris=['file:']` will limit the search to the
       * local backend.
       *
       * Examples:
       *
       *     # Returns results matching 'a' in any backend
       *     search({'any': ['a']})
       *
       *     # Returns results matching artist 'xyz' in any backend
       *     search({'artist': ['xyz']})
       *
       *     # Returns results matching 'a' and 'b' and artist 'xyz' in any
       *     # backend
       *     search({'any': ['a', 'b'], 'artist': ['xyz']})
       *
       *     # Returns results matching 'a' if within the given URI roots
       *     # "file:///media/music" and "spotify:"
       *     search({'any': ['a']}, uris=['file:///media/music', 'spotify:'])
       *
       *     # Returns results matching artist 'xyz' and 'abc' in any backend
       *     search({'artist': ['xyz', 'abc']})
       */
      search({
        query,
        uris,
        exact,
      }: {
        /**
         * one or more queries to search for
         */
        query: Query;
        /**
         * zero or more URI roots to limit the search to
         */
        uris?: string[];
        /**
         * if the search should use exact matching
         */
        exact?: boolean;
      }): Promise<models.SearchResult[]>;

      /**
       * Lookup the given URIs.
       *
       * If the URI expands to multiple tracks, the returned list will contain them all.
       */
      lookup({
        uris,
      }: {
        /**
         * A list of URI's
         */
        uris: string[];
      }): Promise<{ [index: string]: models.Track[] }>;

      /**
       *
       * Refresh library. Limit to URI and below if an URI is given.
       */
      refresh({ uri }: { uri?: string }): Promise<void>;

      /**
       * Lookup the images for the given URIs
       *
       * Backends can use this to return image URIs for any URI they know about be
       * it tracks, albums, playlists. The lookup result is a dictionary mapping
       * the provided URIs to lists of images.
       *
       * Unknown URIs or URIs the corresponding backend couldn't find anything for
       * will simply return an empty list for that URI.
       */
      getImages({
        uris,
      }: {
        /**
         * A list of URI's
         */
        uris: string[];
      }): Promise<{ [index: string]: models.Image[] }>;
    }

    // https://docs.mopidy.com/en/latest/api/core/#playlists-controller
    interface PlaylistsController {
      /**
       * Get the list of URI schemes that support playlists.
       */
      getUriSchemes(): Promise<string[]>;

      // ----------------- FETCHING -----------------

      /**
       * Get a list of the currently available playlists.
       *
       * Returns a list of Ref objects referring to the playlists. In other words,
       * no information about the playlists’ content is given.
       */
      asList(): Promise<models.Ref<any>[]>;

      /**
       * Get the items in a playlist specified by `uri`.
       *
       * Returns a list of Ref objects referring to the playlist’s items.
       *
       * If a playlist with the given uri doesn’t exist, it returns `None`.
       */
      getItems({ uri }: { uri: string }): Promise<models.Ref<any>[] | null>;

      /**
       * Lookup playlist with given URI in both the set of playlists and in any other
       * playlist sources. Returns `None` if not found.
       */
      lookup({ uri }: { uri: URI }): Promise<models.Playlist | null>;

      /**
       * Refresh the playlists in playlists.
       *
       * If uri_scheme is None, all backends are asked to refresh. If `uri_scheme` is an URI scheme
       * handled by a backend, only that backend is asked to refresh. If `uri_scheme` doesn’t
       * match any current backend, nothing happens.
       */
      refresh({ uri_scheme }: { uri_scheme?: string }): Promise<void>;

      // ----------------- MANIPULATING -----------------

      /**
       * Create a new playlist.
       *
       * If uri_scheme matches an URI scheme handled by a current backend, that backend is
       * asked to create the playlist. If `uri_scheme` is None or doesn’t match a current backend,
       * the first backend is asked to create the playlist.
       *
       * All new playlists must be created by calling this method, and not by creating new
       * instances of mopidy.models.Playlist.
       */
      create({
        name,
        uri_scheme,
      }: {
        /**
         * name of the new playlist
         */
        name: string;
        /**
         * use the backend matching the URI scheme
         */
        uri_scheme?: string;
      }): Promise<models.Playlist | null>;

      /**
       * Save the playlist.
       *
       * For a playlist to be saveable, it must have the uri attribute set. You must not set
       * the uri atribute yourself, but use playlist objects returned by create() or
       * retrieved from playlists, which will always give you saveable playlists.
       *
       * The method returns the saved playlist. The return playlist may differ from the saved
       * playlist. E.g. if the playlist name was changed, the returned playlist may have a
       * different URI. The caller of this method must throw away the playlist sent to
       * this method, and use the returned playlist instead.
       *
       * If the playlist’s URI isn’t set or doesn’t match the URI scheme of a current backend,
       * nothing is done and None is returned.
       */
      save({
        playlist,
      }: {
        /**
         * The playlist
         */
        playlist: models.Playlist;
      }): Promise<models.Playlist | null>;

      /**
       * Delete playlist identified by the URI.
       *
       * If the URI doesn’t match the URI schemes handled by the current backends, nothing happens.
       *
       * Returns True if deleted, False otherwise.
       */
      delete({
        uri,
      }: {
        /**
         * URI of the playlist to delete
         */
        uri: URI;
      }): Promise<boolean>;
    }

    // https://docs.mopidy.com/en/latest/api/core/#mixer-controller
    interface MixerController {
      /**
       * Get mute state.
       *
       * True if muted, False unmuted, None if unknown.
       */
      getMute(): Promise<boolean | null>;

      /**
       * Set mute state.
       *
       * True to mute, False to unmute.
       *
       * Returns True if call is successful, otherwise False.
       */
      setMute({ mute }: { mute: boolean }): Promise<boolean>;

      /**
       * Get the volume.
       *
       * Integer in range [0..100] or None if unknown.
       *
       * The volume scale is linear.
       */
      getVolume(): Promise<number | null>;

      /**
       * Set the volume.
       *
       * The volume is defined as an integer in range [0..100].
       *
       * The volume scale is linear.
       */
      setVolume({ volume }: { volume: number }): Promise<boolean>;
    }

    interface HistoryController {
      /**
       * Get the track history.
       *
       * The timestamps are milliseconds since epoch.
       */
      getHistory(): Promise<{ [index: string]: models.Ref<any>[] }>;

      /**
       * Get the number of tracks in the history.
       */
      getLength(): Promise<number>;
    }
  }
}
