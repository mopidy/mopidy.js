// Type definitions for Mopidy.js v1.0.1, Mopidy v3.0.1 WebSocket API

declare module "mopidy" {
    type ValueOf<T> = T[keyof T];

    export interface Options {
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
      console?: Object;
      /**
       * An existing WebSocket object to be used instead of creating a new
       * WebSocket. Defaults to undefined.
       */
      webSocket?: WebSocket;
      /**
       * Controls whether the JSON-RPC API is passed arguments as arrays or named
       * objects. The only verison that is supported by this typing file is named
       * objects.
       */
      callingConvention?: "by-name-only";
    }
    export type URI = string;
    export type PlaybackState = "playing" | "paused" | "stopped";
    export type QueryField =
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
    export type Query = { [key in QueryField]?: string[] };
    export interface StrictEvents {
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
       * Mopidy events
       *
       * You can get events sent from the Mopidy server by looking at the events
       * with the name prefix 'event:'
       */
      "event:muteChanged": ({ mute }: { mute: boolean }) => void;
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
        playlist: Models.Playlist;
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
        timePosition,
      }: {
        tl_track: Models.TlTrack;
        timePosition: number;
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
        timePosition,
      }: {
        tl_track: Models.TlTrack;
        timePosition: number;
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
        timePosition,
      }: {
        tl_track: Models.TlTrack;
        timePosition: number;
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
        tl_track: Models.TlTrack;
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
      /**
       * The events from Mopidy are also emitted under the aggregate event named
       * event.
       */
      event: (args?: unknown) => void;
      /**
       * WebSocket events
       *
       * You can introspect what happens internally on the WebSocket by looking at
       * the events.
       *
       * Of course, you can also do this using the web developer tools in any
       * modern browser.
       */
      // @TODO Finish typing these, need to reverse engineer the listener type
      websocket: any; // @TODO Is this valid?
      "websocket:open": any;
      "websocket:error": any;
      "websocket:close": any;
      "websocket:incomingMessage": any;
      "websocket:outgoingMessage": any;
    }
    export interface CatchAllEvents {
      event: ValueOf<StrictEvents>;
    }
    export type SubscribableString = keyof StrictEvents;

    // https://docs.mopidy.com/en/latest/api/models/
    export type ModelType =
      | "album"
      | "artist"
      | "directory"
      | "playlist"
      | "track";
    // @TODO rename to lowercase 'models'?
    export namespace Models {
      export class Ref<T extends ModelType> {
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
        readonly uri: URI; // @TODO verify
      }
      /**
       * A tracklist track. Wraps a regular track and itâ€™s tracklist ID.
       *
       * The use of TlTrack allows the same track to appear multiple times in the
       * tracklist.
       *
       * This class also accepts itâ€™s parameters as positional arguments. Both
       * arguments must be provided, and they must appear in the order they are
       * listed here.
       *
       * This class also supports iteration, so your extract its values like this:
       *
       *   `(tlid, track) = tl_track`
       *
       */
      export class TlTrack {
        // @TODO Finish
        constructor({ tlid, track }: { tlid: number; track: Track });
        readonly tlid: number;
        readonly track: Track;
      }
      export class Track {
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
          uri: URI;
          name: string;
          artists: list;
          album: Album;
          composers: list;
          performers: list;
          genre: string;
          track_no?: number;
          disc_no?: number;
          // track release date (YYYY or YYYY-MM-DD)
          date: string;
          // track length in milliseconds
          length?: number;
          // â€“ bitrate in kbit/s
          bitrate: number;
          comment: string;
          musicbrainz_id: string;
          /**
           * Integer representing when the track was last modified. Exact meaning
           * depends on source of track. For local files this is the modification
           * time in milliseconds since Unix epoch. For other backends it could be
           * an equivalent timestamp or simply a version counter.
           */
          last_modified?: number;
        });
        readonly album: string;
        readonly artists: Artist[];
        readonly bitrate: string;
        readonly comment: ?string;
        readonly composers: Artist[];
        readonly performers: Artist[];
        readonly date: string;
        readonly disc_no: string; // @TODO Check if number
        readonly name: string;
        readonly genre: string;
        /**
         * Integer representing when the track was last modified. Exact meaning
         * depends on source of track. For local files this is the modification
         * time in milliseconds since Unix epoch. For other backends it could be
         * an equivalent timestamp or simply a version counter.
         */
        readonly last_modified: number;
        /**
         * The track length in milliseconds.
         */
        readonly length: number;
        readonly musicbrainz_id: string;
        readonly track_no: string; // @TODO Check if number
        readonly uri: Mopidy.URI;
        /**
         * Integer representing when the track was last modified. Exact meaning
         * depends on source of track. For local files this is the modification
         * time in milliseconds since Unix epoch. For other backends it could be
         * an equivalent timestamp or simply a version counter.
         */
        readonly last_modified: ?number;
        // The track length in milliseconds.
        readonly length: ?string;
        readonly musicbrainz_id: string;
        readonly name: string;
        readonly performers: string;
        readonly track_no: ?string;
        readonly uri: URI;
      }
      export class SearchResult {
        constructor({
          uri,
          tracks,
          artists,
          albums,
        }: {
          uri: URI;
          tracks: Track[];
          artists: Artist[];
          albums: Album[];
        });
        readonly uri: URI;
        // These are documented as being part of the response, but in actuality
        // they can come back incomplete. If there are only matching albums, you
        // will only get an album property and the others will be undefined
        // instead of an empty array.
        readonly tracks: Track[] | undefined;
        readonly artists: Artist[] | undefined;
        readonly albums: Album[] | undefined;
      }
      // @TODO Finish
      export class Artist {
        construct({
          uri, // artist URI
          name, // artist name
          sortname, // artist name for sorting
          musicbrainz_id, // MusicBrainz ID
        }: {
          uri: URI;
          name: string;
          sortname: string;
          musicbrainz_id: string;
        });
        readonly musicbrainz_id: string;
        readonly name: string;
        readonly sortname: string;
        readonly uri: URI;
      }
      // @TODO Finish
      export class Album {
        constructor({
          uri,
          name,
          artists,
          num_tracks,
          num_discs,
          /**
           * album release date (YYYY or YYYY-MM-DD)
           */
          date,
          musicbrainz_id,
        }: {
          uri: URI;
          name: string;
          artists: Artist[];
          num_tracks: number;
          num_discs: number;
          date: string;
          musicbrainz_id: string;
        });

        readonly uri: URI;
        readonly name: string;
        readonly artists: Artist[];
        readonly num_tracks: number;
        readonly num_discs: number;
        /**
         * album release date (YYYY or YYYY-MM-DD)
         */
        readonly date: string;
        readonly musicbrainz_id: string;
      }
      export class Image {
        constructor({
          uri,
          width,
          height,
        }: {
          uri: URI;
          width?: number;
          height?: number;
        });
        readonly height: ?number;
        readonly width: ?number;
        readonly uri: URI;
      }
      export class Playlist {
        // @TODO Finish this
      }
    }

    // ----------------- CONTROLLERS -----------------
    // https://docs.mopidy.com/en/latest/api/core/#tracklist-controller
    export interface TracklistController {
      /**
       * Add tracks to the tracklist.
       *
       * If uris is given instead of tracks, the URIs are looked up in the library
       * and the resulting tracks are added to the tracklist.
       *
       * If at_position is given, the tracks are inserted at the given position in
       * the tracklist. If at_position is not given, the tracks are appended to
       * the end of the tracklist.
       *
       * Triggers the `mopidy.core.CoreListener.tracklist_changed()` event.
       */
      add({
        tracks,
        atPosition,
        uris,
      }: {
        tracks?: Models.Track[];
        atPosition?: number;
        uris?: string[];
      }): Promise<Models.TlTrack[]>;
      // @TODO Finish
      index({
        tl_track,
        tlid,
      }: {
        tl_track?: Models.TlTrack;
        tlid?: number; // @TODO alias for tlid?
      }): number;

      /**
       * Get tracklist as a list of Track
       */
      getTracks(): Promise<Models.Track[]>;
      /**
       * Returns a slice of the tracklist, limited by the given start and end
       * positions.
       */
      slice({
        /**
         * position of first track to include in slice
         */
        start,
        /**
         * position after last track to include in slice
         */
        end,
      }: {
        start: number;
        end: number;
      }): Promise<Models.TlTrack[]>;
      // ----------------- OPTIONS -----------------
      getConsume(): Promise<boolean>;
      /**
       * Set consume mode.
       *
       *   True = Tracks are removed from the tracklist when they have been
       *   played.
       *   False = Tracks are not removed from the tracklist.
       */
      setConsume({ value }: { value: boolean }): void;
      getRandom(): Promise<boolean>;
      /**
       * Set random mode.
       *
       *   True = Tracks are selected at random from the tracklist.
       *   False = Tracks are played in the order of the tracklist.
       */
      setRandom({ value }: { value: boolean }): void;
      getRepeat(): Promise<boolean>;
      /**
       * Set repeat mode.
       *
       *   To repeat a single track, set both repeat and single.
       */
      setRepeat({ value }: { value: boolean }): void;
      getSingle(): Promise<boolean>;
      /**
       * Set single mode.
       *
       *   True = Playback is stopped after current song, unless in repeat mode.
       *   False = Playback continues after current song.
       */
      setSingle({ value }: { value: boolean }): void;
    }
    export interface PlaybackController {
      // @TODO Finish

      // ----------------- PLAYBACK CONTROL -----------------
      /**
       * Play the given track, or if the given tl_track and tlid is None, play the
       * currently active track.
       *
       * Note that the track must already be in the tracklist.
       *
       * Deprecated since version 3.0: The tl_track argument. Use tlid instead.
       *
       * Parameters tl_track (mopidy.models.TlTrack or None) â€“ track to play
       *
       *   tlid (int or None) â€“ TLID of the track to play
       *
       */
      play({
        track,
        tlid,
      }: {
        track?: Models.Track;
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
       *
       *   Parameters
       *     time_position (int) â€“ time position in milliseconds
       *
       *   Return type
       *    True if successful, else False
       */
      seek({ time_position }: { time_position: number }): Promise<boolean>;
      // ----------------- CURRENT TRACK -----------------
      /**
       * Get the currently playing or selected track.
       */
      getCurrentTlTrack(): Promise<Models.TlTrack | null>;
      /**
       * Get the currently playing or selected track.
       *
       * Extracted from get_current_tl_track() for convenience.
       */
      getCurrentTrack(): Promise<Models.Track | null>;
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
       * Set the playback state. See
       * https://docs.mopidy.com/en/latest/api/core/#mopidy.core.PlaybackController.set_state
       * for possible states and transitions
       */
      setState({ new_state }: { new_state: PlaybackState }): Promise<void>;
    }
    export interface LibraryController {
      /**
       * Browse directories and tracks at the given uri.
       *
       * uri is a string which represents some directory belonging to a backend.
       * To get the intial root directories for backends pass None as the URI.
       *
       * @returns a list of mopidy.models.Ref objects for the directories and
       * tracks at the given uri.
       *
       * The Ref objects representing tracks keep the trackâ€™s original URI. A
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
       * For example, the dummy libraryâ€™s /bar directory could be returned like
       * this:
       *
       *    Ref.directory(uri='dummy:directory:/bar', name='bar')
       *
       */
      browse({ uri }: { uri: URI }): Promise<Models.Ref[]>;
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
       *
       */
      search({
        query,
        uris,
        exact,
      }: {
        query: Query;
        uris?: string[];
        exact?: boolean;
      }): Promise<Models.SearchResult[]>;
      /**
       * Lookup the images for the given URIs
       *
       * Backends can use this to return image URIs for any URI they know about be
       * it tracks, albums, playlists. The lookup result is a dictionary mapping
       * the provided URIs to lists of images.
       *
       * Unknown URIs or URIs the corresponding backend couldnâ€™t find anything for
       * will simply return an empty list for that URI.
       *
       * @returns {uri: tuple of mopidy.models.Image}
       *
       */
      getImages({
        /**
         * list of URIs to find images for
         */
        uris,
      }: {
        uris: string[];
      }): Promise<{ [index: string]: Models.Image[] }>;
    }
    export interface PlaylistsController {}
    export interface MixerController {}
    export interface HistoryController {}
    export interface Core {
      PlaybackState: IPlaybackState;
    }
    class Mopidy {
      // ----------------- MOPIDY.JS-SPECIFIC API -----------------

      /**
       * Mopidy.js is a JavaScript library for controlling a Mopidy music server.
       *
       * The library makes Mopidy's core API available from browsers and Node.js
       * programs, using JSON-RPC over a WebSocket to communicate with Mopidy.
       *
       * This library is the foundation of most Mopidy web clients.
       */
      constructor(options: Options);
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
      on<
        TEvent extends keyof StrictEvents,
        TListener extends StrictEvents[TEvent]
      >(event: TEvent, listener: TListener): void;

      off(): void;
      off<
        TEvent extends keyof StrictEvents,
        TListener extends StrictEvents[TEvent]
      >(event: TEvent, listener?: TListener): void;

      // ----------------- CORE API -----------------
      // https://docs.mopidy.com/en/latest/api/core/#module-mopidy.core
      core: Core;
      /**
       * Manages everything related to the list of tracks we will play. See
       * TracklistController. Undefined before Mopidy connects.
       */
      tracklist: TracklistController | undefined;
      /**
       * Manages playback state and the current playing track. See
       * PlaybackController. Undefined before Mopidy connects.
       */
      playback: PlaybackController | undefined;
      /**
       * Manages the music library, e.g. searching and browsing for music. See
       * LibraryController. Undefined before Mopidy connects.
       */
      library: LibraryController | undefined;
      /**
       * Manages stored playlists. See PlaylistsController. Undefined before
       * Mopidy connects.
       */
      playlists: PlaylistsController | undefined;
      /**
       * Manages volume and muting. See MixerController. Undefined before Mopidy
       * connects.
       */
      mixer: MixerController | undefined;
      /**
       * Keeps record of what tracks have been played. See HistoryController.
       * Undefined before Mopidy connects.
       */
      history: HistoryController | undefined;

      // @TODO
      // CoreListener
      // Core

      /**
       * Get list of URI schemes we can handle
       */
      getUriSchemes(): Promise<string[]>;
      /**
       * Get version of the Mopidy core API
       */
      getVersion(): Promise<string>;
    }

    export = Mopidy;
  }
