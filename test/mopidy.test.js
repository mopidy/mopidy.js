/* eslint no-new:off */
/* eslint-env jest */

const Mopidy = require("../src/mopidy");

const warn = jest.spyOn(global.console, "warn").mockImplementation(() => {});

jest.useFakeTimers();

beforeEach(() => {
  // Create a generic WebSocket mock
  const WebSocketMock = jest.fn().mockName("WebSocketMock");
  WebSocketMock.CONNECTING = 0;
  WebSocketMock.OPEN = 1;
  WebSocketMock.CLOSING = 2;
  WebSocketMock.CLOSED = 3;
  WebSocketMock.mockImplementation(() => ({
    close: jest
      .fn(function close() {
        this.onclose({});
      })
      .mockName("close"),
    send: jest.fn().mockName("send"),
    readyState: WebSocketMock.CLOSED,
  }));

  // Use the WebSocketMock to create all new WebSockets
  Mopidy.WebSocket = WebSocketMock;

  // Create Mopidy instance good enough for most tests
  this.openWebSocket = new WebSocketMock();
  this.openWebSocket.readyState = WebSocketMock.OPEN;
  WebSocketMock.mockClear();
  this.mopidy = new Mopidy({
    webSocket: this.openWebSocket,
  });

  // Clear mocks with state that can cross between tests
  warn.mockClear();
});

describe("constructor", () => {
  test("connects when autoConnect is true", () => {
    new Mopidy({
      autoConnect: true,
    });

    const currentHost =
      (typeof document !== "undefined" && document.location.host) ||
      "localhost";

    expect(Mopidy.WebSocket).toHaveBeenCalledWith(
      `ws://${currentHost}/mopidy/ws`
    );
  });

  test("does not connect when autoConnect is false", () => {
    new Mopidy({
      autoConnect: false,
    });

    expect(Mopidy.WebSocket).not.toBeCalled();
  });

  test("does not connect when passed a WebSocket", () => {
    new Mopidy({
      webSocket: {},
    });

    expect(Mopidy.WebSocket).not.toBeCalled();
  });
});

describe(".off", () => {
  test("with no args works", () => {
    const removeAllStub = jest.spyOn(this.mopidy, "removeAllListeners");

    this.mopidy.off();

    expect(removeAllStub).toBeCalledWith();
  });

  test("with an event name works", () => {
    const removeAllStub = jest.spyOn(this.mopidy, "removeAllListeners");

    this.mopidy.off("some-event");

    expect(removeAllStub).toBeCalledWith("some-event");
  });

  test("with a listener fails", () => {
    const listener = () => {};
    const removeAllStub = jest.spyOn(this.mopidy, "removeAllListeners");

    try {
      this.mopidy.off(listener);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(
        "Expected no arguments, a string, or a string and a listener."
      );
    }

    expect(removeAllStub).not.toBeCalled();
  });

  test("with an event name and a listener works", () => {
    const listener = () => {};
    const removeStub = jest.spyOn(this.mopidy, "removeListener");

    this.mopidy.off("some-event", listener);

    expect(removeStub).toBeCalledWith("some-event", listener);
  });
});

describe(".connect", () => {
  test("connects when autoConnect is false", () => {
    const mopidy = new Mopidy({
      autoConnect: false,
    });
    expect(Mopidy.WebSocket).not.toBeCalled();

    mopidy.connect();

    const currentHost =
      (typeof document !== "undefined" && document.location.host) ||
      "localhost";

    expect(Mopidy.WebSocket).toHaveBeenCalledWith(
      `ws://${currentHost}/mopidy/ws`
    );
  });

  test("does nothing when the WebSocket is open", () => {
    expect(this.mopidy._webSocket).toBe(this.openWebSocket);
    expect(this.openWebSocket.readyState).toBe(Mopidy.WebSocket.OPEN);

    this.mopidy.connect();

    expect(this.openWebSocket.close).not.toBeCalled();
    expect(Mopidy.WebSocket).not.toBeCalled();
  });
});

describe("WebSocket events", () => {
  test("emits 'websocket:close' when connection is closed", () => {
    const spy = jest.fn();
    this.mopidy.on("websocket:close", spy);

    const closeEvent = {};
    this.mopidy._webSocket.onclose(closeEvent);

    expect(spy).toBeCalledWith(closeEvent);
  });

  test("emits 'websocket:error' when errors occurs", () => {
    const spy = jest.fn();
    this.mopidy.on("websocket:error", spy);

    const errorEvent = {};
    this.mopidy._webSocket.onerror(errorEvent);

    expect(spy).toBeCalledWith(errorEvent);
  });

  test("emits 'websocket:incomingMessage' when a message arrives", () => {
    const spy = jest.fn();
    this.mopidy.on("websocket:incomingMessage", spy);

    const messageEvent = { data: "this is a message" };
    this.mopidy._webSocket.onmessage(messageEvent);

    expect(spy).toBeCalledWith(messageEvent);
  });

  test("emits 'websocket:open' when connection is opened", () => {
    const spy = jest.fn();
    this.mopidy.on("websocket:open", spy);

    this.mopidy._webSocket.onopen();

    expect(spy).toBeCalledWith();
  });
});

describe("._cleanup", () => {
  beforeEach(() => {
    this.mopidy.removeAllListeners("state:offline");
  });

  test("is called on 'websocket:close' event", () => {
    const closeEvent = {};
    const cleanup = jest.spyOn(this.mopidy, "_cleanup");
    this.mopidy._delegateEvents();

    this.mopidy.emit("websocket:close", closeEvent);

    expect(cleanup).toBeCalledWith(closeEvent);
  });

  test("rejects all pending requests", (done) => {
    const closeEvent = {};
    expect(Object.keys(this.mopidy._pendingRequests).length).toBe(0);

    const promise1 = this.mopidy._send({ method: "foo" });
    const promise2 = this.mopidy._send({ method: "bar" });
    expect(Object.keys(this.mopidy._pendingRequests).length).toBe(2);

    this.mopidy._cleanup(closeEvent);

    expect(Object.keys(this.mopidy._pendingRequests).length).toBe(0);
    Promise.all([
      promise1.catch((error) => error),
      promise2.catch((error) => error),
    ])
      .then((errors) => {
        errors.forEach((error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error).toBeInstanceOf(Mopidy.ConnectionError);
          expect(error.message).toBe("WebSocket closed");
          expect(error.closeEvent).toBe(closeEvent);
        });
      })
      .then(done);
  });

  test("emits 'state' event when done", () => {
    const spy = jest.fn();
    this.mopidy.on("state", spy);

    this.mopidy._cleanup({});

    expect(spy).toBeCalledWith("state:offline");
  });

  test("emits 'state:offline' event when done", () => {
    const spy = jest.fn();
    this.mopidy.on("state:offline", spy);

    this.mopidy._cleanup({});

    expect(spy).toBeCalledWith();
  });
});

describe("._reconnect", () => {
  test("is called when the state changes to offline", () => {
    const spy = jest.spyOn(this.mopidy, "_reconnect");
    this.mopidy._delegateEvents();

    this.mopidy.emit("state:offline");
    jest.runOnlyPendingTimers();

    expect(spy).toBeCalledWith();
  });

  test("tries to connect after an increasing backoff delay", () => {
    const connectStub = jest
      .spyOn(this.mopidy, "connect")
      .mockImplementation(() => {});
    const stateSpy = jest.fn();
    this.mopidy.on("state", stateSpy);
    const pendingSpy = jest.fn();
    this.mopidy.on("reconnectionPending", pendingSpy);
    const reconnectingSpy = jest.fn();
    this.mopidy.on("reconnecting", reconnectingSpy);

    expect(connectStub).toBeCalledTimes(0);

    this.mopidy._reconnect();
    jest.runOnlyPendingTimers();
    expect(stateSpy).toBeCalledWith("reconnectionPending", {
      timeToAttempt: 1000,
    });
    expect(pendingSpy).toBeCalledWith({ timeToAttempt: 1000 });
    jest.advanceTimersByTime(0);
    expect(connectStub).toBeCalledTimes(0);
    jest.advanceTimersByTime(1000);
    expect(connectStub).toBeCalledTimes(1);
    expect(stateSpy).toBeCalledWith("reconnecting");
    expect(reconnectingSpy).toBeCalledWith();

    stateSpy.mockClear();
    pendingSpy.mockClear();
    reconnectingSpy.mockClear();
    this.mopidy._reconnect();
    jest.runOnlyPendingTimers();
    expect(stateSpy).toBeCalledWith("reconnectionPending", {
      timeToAttempt: 2000,
    });
    expect(pendingSpy).toBeCalledWith({ timeToAttempt: 2000 });
    expect(connectStub).toBeCalledTimes(1);
    jest.advanceTimersByTime(0);
    expect(connectStub).toBeCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(connectStub).toBeCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(connectStub).toBeCalledTimes(2);
    expect(stateSpy).toBeCalledWith("reconnecting");
    expect(reconnectingSpy).toBeCalledWith();

    stateSpy.mockClear();
    pendingSpy.mockClear();
    reconnectingSpy.mockClear();
    this.mopidy._reconnect();
    jest.runOnlyPendingTimers();
    expect(stateSpy).toBeCalledWith("reconnectionPending", {
      timeToAttempt: 4000,
    });
    expect(pendingSpy).toBeCalledWith({ timeToAttempt: 4000 });
    expect(connectStub).toBeCalledTimes(2);
    jest.advanceTimersByTime(0);
    expect(connectStub).toBeCalledTimes(2);
    jest.advanceTimersByTime(2000);
    expect(connectStub).toBeCalledTimes(2);
    jest.advanceTimersByTime(2000);
    expect(connectStub).toBeCalledTimes(3);
    expect(stateSpy).toBeCalledWith("reconnecting");
    expect(reconnectingSpy).toBeCalledWith();
  });

  test("tries to connect at least about once per minute", () => {
    const connectStub = jest
      .spyOn(this.mopidy, "connect")
      .mockImplementation(() => {});
    const stateSpy = jest.fn();
    this.mopidy.on("state", stateSpy);
    const pendingSpy = jest.fn();
    this.mopidy.on("reconnectionPending", pendingSpy);
    this.mopidy._backoffDelay = this.mopidy._settings.backoffDelayMax;

    expect(connectStub).toBeCalledTimes(0);

    this.mopidy._reconnect();
    jest.runOnlyPendingTimers();
    expect(stateSpy).toBeCalledWith("reconnectionPending", {
      timeToAttempt: 64000,
    });
    expect(pendingSpy).toBeCalledWith({ timeToAttempt: 64000 });
    jest.advanceTimersByTime(0);
    expect(connectStub).toBeCalledTimes(0);
    jest.advanceTimersByTime(64000);
    expect(connectStub).toBeCalledTimes(1);

    stateSpy.mockClear();
    pendingSpy.mockClear();
    this.mopidy._reconnect();
    jest.runOnlyPendingTimers();
    expect(stateSpy).toBeCalledWith("reconnectionPending", {
      timeToAttempt: 64000,
    });
    expect(pendingSpy).toBeCalledWith({ timeToAttempt: 64000 });
    expect(connectStub).toBeCalledTimes(1);
    jest.advanceTimersByTime(0);
    expect(connectStub).toBeCalledTimes(1);
    jest.advanceTimersByTime(64000);
    expect(connectStub).toBeCalledTimes(2);
  });

  test("emits reconnectionPending after state:offline event", () => {
    const offlineSpy = jest.fn();
    this.mopidy.on("state:offline", offlineSpy);
    const reconnectionSpy = jest.fn();
    this.mopidy.on("reconnectionPending", reconnectionSpy);

    this.mopidy.emit("websocket:close");

    expect(offlineSpy).toBeCalledWith();

    // Before we check the reconnection spy we have to run pending timers again,
    // because the reconnection happens in an async listener of the
    // state:offline event.
    jest.runOnlyPendingTimers();

    expect(reconnectionSpy).toBeCalledWith({ timeToAttempt: 1000 });
    expect(reconnectionSpy).toHaveBeenCalledAfter(offlineSpy);
  });
});

describe("._resetBackoffDelay", () => {
  test("is called on 'websocket:open' event", () => {
    const spy = jest.spyOn(this.mopidy, "_resetBackoffDelay");
    this.mopidy._delegateEvents();

    this.mopidy.emit("websocket:open");

    expect(spy).toBeCalled();
  });

  test("resets the backoff delay to the minimum value", () => {
    this.mopidy._backoffDelay = this.mopidy._backoffDelayMax;

    this.mopidy._resetBackoffDelay();

    expect(this.mopidy._backoffDelay).toBe(
      this.mopidy._settings.backoffDelayMin
    );
  });
});

describe(".close", () => {
  test("unregisters reconnection hooks", () => {
    const offSpy = jest.spyOn(this.mopidy, "off");
    const reconnectingSpy = jest.fn();
    this.mopidy.on("reconnecting", reconnectingSpy);
    const reconnectionPendingSpy = jest.fn();
    this.mopidy.on("reconnectionPending", reconnectionPendingSpy);

    this.mopidy.close();

    expect(offSpy).toBeCalledWith("state:offline", this.mopidy._reconnect);

    jest.runOnlyPendingTimers(); // Handle the "state:offline" event

    expect(reconnectingSpy).not.toHaveBeenCalled();
    expect(reconnectionPendingSpy).not.toHaveBeenCalled();
  });

  test("closes the WebSocket", () => {
    this.mopidy.close();

    expect(this.mopidy._webSocket.close).toBeCalledWith();
  });

  test("close without an open WebSocket does not fail", () => {
    const mopidy = new Mopidy({ autoConnect: false });

    mopidy.close(); // No error thrown
  });
});

describe("._handleWebSocketError", () => {
  test("is called on 'websocket:error' event", () => {
    const error = {};
    const spy = jest.spyOn(this.mopidy, "_handleWebSocketError");
    this.mopidy._delegateEvents();

    this.mopidy.emit("websocket:error", error);

    expect(spy).toBeCalledWith(error);
  });

  test("without stack logs the error to the console", () => {
    const error = {};

    this.mopidy._handleWebSocketError(error);

    expect(warn).toBeCalledWith("WebSocket error:", error);
  });

  test("with stack logs the error to the console", () => {
    const error = { stack: "foo" };

    this.mopidy._handleWebSocketError(error);

    expect(warn).toBeCalledWith("WebSocket error:", error.stack);
  });
});

describe("._send", () => {
  test("adds JSON-RPC fields to the message", () => {
    jest.spyOn(this.mopidy, "_nextRequestId").mockImplementation(() => 1);
    const spy = jest.spyOn(JSON, "stringify");

    this.mopidy._send({ method: "foo" });

    expect(spy).toBeCalledWith({
      jsonrpc: "2.0",
      id: 1,
      method: "foo",
    });
  });

  test("adds a resolver to the pending requests queue", () => {
    jest.spyOn(this.mopidy, "_nextRequestId").mockImplementation(() => 1);
    expect(Object.keys(this.mopidy._pendingRequests).length).toBe(0);

    this.mopidy._send({ method: "foo" });

    expect(Object.keys(this.mopidy._pendingRequests).length).toBe(1);
    expect(this.mopidy._pendingRequests[1].resolve).toBeDefined();
  });

  test("sends message on the WebSocket", () => {
    expect(this.mopidy._webSocket.send).toBeCalledTimes(0);

    this.mopidy._send({ method: "foo" });

    expect(this.mopidy._webSocket.send).toBeCalledTimes(1);
  });

  test("emits a 'websocket:outgoingMessage' event", () => {
    const spy = jest.fn();
    this.mopidy.on("websocket:outgoingMessage", spy);
    jest.spyOn(this.mopidy, "_nextRequestId").mockImplementation(() => 1);

    this.mopidy._send({ method: "foo" });

    expect(spy).toBeCalledWith({
      jsonrpc: "2.0",
      id: 1,
      method: "foo",
    });
  });

  test("immediately rejects request if CONNECTING", (done) => {
    this.mopidy._webSocket.readyState = Mopidy.WebSocket.CONNECTING;

    const promise = this.mopidy._send({ method: "foo" });

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(this.mopidy._webSocket.send).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(Mopidy.ConnectionError);
        expect(error.message).toBe("WebSocket is still connecting");
      })
      .then(done);
  });

  test("immediately rejects request if CLOSING", (done) => {
    this.mopidy._webSocket.readyState = Mopidy.WebSocket.CLOSING;

    const promise = this.mopidy._send({ method: "foo" });

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(this.mopidy._webSocket.send).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(Mopidy.ConnectionError);
        expect(error.message).toBe("WebSocket is closing");
      })
      .then(done);
  });

  test("immediately rejects request if CLOSED", (done) => {
    this.mopidy._webSocket.readyState = Mopidy.WebSocket.CLOSED;

    const promise = this.mopidy._send({ method: "foo" });

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(this.mopidy._webSocket.send).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(Mopidy.ConnectionError);
        expect(error.message).toBe("WebSocket is closed");
      })
      .then(done);
  });
});

describe("._nextRequestId", () => {
  test("returns an ever increasing ID", () => {
    const base = this.mopidy._nextRequestId();
    expect(this.mopidy._nextRequestId()).toBe(base + 1);
    expect(this.mopidy._nextRequestId()).toBe(base + 2);
    expect(this.mopidy._nextRequestId()).toBe(base + 3);
  });
});

describe("._handleMessage", () => {
  test("is called on 'websocket:incomingMessage' event", () => {
    const messageEvent = {};
    const stub = jest
      .spyOn(this.mopidy, "_handleMessage")
      .mockImplementation(() => {});
    this.mopidy._delegateEvents();

    this.mopidy.emit("websocket:incomingMessage", messageEvent);

    expect(stub).toBeCalledWith(messageEvent);
  });

  test("passes JSON-RPC responses on to _handleResponse", () => {
    const spy = jest.spyOn(this.mopidy, "_handleResponse");
    const message = {
      jsonrpc: "2.0",
      id: 1,
      result: null,
    };
    const messageEvent = { data: JSON.stringify(message) };

    this.mopidy._handleMessage(messageEvent);

    expect(spy).toBeCalledWith(message);
  });

  test("passes events on to _handleEvent", () => {
    const stub = jest
      .spyOn(this.mopidy, "_handleEvent")
      .mockImplementation(() => {});
    const message = {
      event: "track_playback_started",
      track: {},
    };
    const messageEvent = { data: JSON.stringify(message) };

    this.mopidy._handleMessage(messageEvent);

    expect(stub).toBeCalledWith(message);
  });

  test("logs unknown messages", () => {
    const messageEvent = { data: JSON.stringify({ foo: "bar" }) };

    this.mopidy._handleMessage(messageEvent);

    expect(warn).toBeCalledWith(
      `Unknown message type received. Message was: ${messageEvent.data}`
    );
  });

  test("logs JSON parsing errors", () => {
    const messageEvent = { data: "foobarbaz" };

    this.mopidy._handleMessage(messageEvent);

    expect(warn).toBeCalledWith(
      `WebSocket message parsing failed. Message was: ${messageEvent.data}`
    );
  });
});

describe("._handleResponse", () => {
  test("logs unexpected responses", () => {
    const responseMessage = {
      jsonrpc: "2.0",
      id: 1337,
      result: null,
    };

    this.mopidy._handleResponse(responseMessage);

    expect(warn).toBeCalledWith(
      "Unexpected response received. Message was:",
      responseMessage
    );
  });

  test("removes the matching request from the pending queue", () => {
    expect(Object.keys(this.mopidy._pendingRequests).length).toBe(0);
    this.mopidy._send({ method: "bar" });
    expect(Object.keys(this.mopidy._pendingRequests).length).toBe(1);

    this.mopidy._handleResponse({
      jsonrpc: "2.0",
      id: Object.keys(this.mopidy._pendingRequests)[0],
      result: "baz",
    });

    expect(Object.keys(this.mopidy._pendingRequests).length).toBe(0);
  });

  test("resolves requests which get results back", (done) => {
    const promise = this.mopidy._send({ method: "bar" });
    const responseResult = {};
    const responseMessage = {
      jsonrpc: "2.0",
      id: Object.keys(this.mopidy._pendingRequests)[0],
      result: responseResult,
    };

    this.mopidy._handleResponse(responseMessage);

    expect.hasAssertions();
    promise
      .then((result) => {
        expect(result).toBe(responseResult);
      })
      .then(done);
  });

  test("rejects and logs requests which get errors back", (done) => {
    const promise = this.mopidy._send({ method: "bar" });
    const responseError = {
      code: -32601,
      message: "Method not found",
      data: {},
    };
    const responseMessage = {
      jsonrpc: "2.0",
      id: Object.keys(this.mopidy._pendingRequests)[0],
      error: responseError,
    };

    this.mopidy._handleResponse(responseMessage);

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(warn).toBeCalledWith("Server returned error:", responseError);
        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe(responseError.code);
        expect(error.message).toBe(responseError.message);
        expect(error.data).toBe(responseError.data);
      })
      .then(done);
  });

  test("rejects and logs requests which get errors without data", (done) => {
    const promise = this.mopidy._send({ method: "bar" });
    const responseError = {
      code: -32601,
      message: "Method not found",
      // 'data' key intentionally missing
    };
    const responseMessage = {
      jsonrpc: "2.0",
      id: Object.keys(this.mopidy._pendingRequests)[0],
      error: responseError,
    };

    this.mopidy._handleResponse(responseMessage);

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(warn).toBeCalledWith("Server returned error:", responseError);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(Mopidy.ServerError);
        expect(error.code).toBe(responseError.code);
        expect(error.message).toBe(responseError.message);
        expect(error.data).toBeUndefined();
      })
      .then(done);
  });

  test("rejects and logs responses without result or error", (done) => {
    const promise = this.mopidy._send({ method: "bar" });
    const responseMessage = {
      jsonrpc: "2.0",
      id: Object.keys(this.mopidy._pendingRequests)[0],
    };

    this.mopidy._handleResponse(responseMessage);

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(warn).toBeCalledWith(
          "Response without 'result' or 'error' received. Message was:",
          responseMessage
        );
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(
          "Response without 'result' or 'error' received"
        );
        expect(error.data.response).toBe(responseMessage);
      })
      .then(done);
  });
});

describe("._handleEvent", () => {
  test("emits all server side events on 'event' event", () => {
    const spy = jest.fn();
    this.mopidy.on("event", spy);
    const track = {};
    const message = {
      event: "track_playback_started",
      track,
    };

    this.mopidy._handleEvent(message);

    expect(spy).toBeCalledWith("event:trackPlaybackStarted", { track });
  });

  test("emits server side events on 'event:*' events", () => {
    const spy = jest.fn();
    this.mopidy.on("event:trackPlaybackStarted", spy);
    const track = {};
    const message = {
      event: "track_playback_started",
      track,
    };

    this.mopidy._handleEvent(message);

    expect(spy).toBeCalledWith({ track });
  });
});

describe("._getApiSpec", () => {
  test("is called on 'websocket:open' event", () => {
    const spy = jest.spyOn(this.mopidy, "_getApiSpec");
    this.mopidy._delegateEvents();

    this.mopidy.emit("websocket:open");

    expect(spy).toBeCalledWith();
  });

  test("gets API description from server and calls _createApi", (done) => {
    const methods = {};
    const sendStub = jest
      .spyOn(this.mopidy, "_send")
      .mockReturnValue(Promise.resolve(methods));
    const createApiStub = jest
      .spyOn(this.mopidy, "_createApi")
      .mockImplementation(() => {});

    expect.hasAssertions();
    this.mopidy
      ._getApiSpec()
      .then(() => {
        expect(sendStub).toBeCalledWith({ method: "core.describe" });
        expect(createApiStub).toBeCalledWith(methods);
      })
      .then(done);
  });
});

describe("._createApi", () => {
  test("can create an API with methods on the root object", () => {
    expect(this.mopidy.hello).toBeUndefined();
    expect(this.mopidy.hi).toBeUndefined();

    this.mopidy._createApi({
      hello: {
        description: "Says hello",
        params: [],
      },
      hi: {
        description: "Says hi",
        params: [],
      },
    });

    expect(typeof this.mopidy.hello).toBe("function");
    expect(this.mopidy.hello.description).toBe("Says hello");
    expect(this.mopidy.hello.params).toEqual([]);
    expect(typeof this.mopidy.hi).toBe("function");
    expect(this.mopidy.hi.description).toBe("Says hi");
    expect(this.mopidy.hi.params).toEqual([]);
  });

  test("can create an API with methods on a sub-object", () => {
    expect(this.mopidy.hello).toBeUndefined();

    this.mopidy._createApi({
      "hello.world": {
        description: "Says hello to the world",
        params: [],
      },
    });

    expect(this.mopidy.hello).toBeDefined();
    expect(typeof this.mopidy.hello.world).toBe("function");
  });

  test("strips off 'core' from method paths", () => {
    expect(this.mopidy.hello).toBeUndefined();

    this.mopidy._createApi({
      "core.hello.world": {
        description: "Says hello to the world",
        params: [],
      },
    });

    expect(this.mopidy.hello).toBeDefined();
    expect(typeof this.mopidy.hello.world).toBe("function");
  });

  test("converts snake_case to camelCase", () => {
    expect(this.mopidy.mightyGreetings).toBeUndefined();

    this.mopidy._createApi({
      "mighty_greetings.hello_world": {
        description: "Says hello to the world",
        params: [],
      },
    });

    expect(this.mopidy.mightyGreetings).toBeDefined();
    expect(typeof this.mopidy.mightyGreetings.helloWorld).toBe("function");
  });

  test("triggers 'state' event when API is ready for use", () => {
    const spy = jest.fn();
    this.mopidy.on("state", spy);

    this.mopidy._createApi({});

    expect(spy).toBeCalledWith("state:online");
  });

  test("triggers 'state:online' event when API is ready for use", () => {
    const spy = jest.fn();
    this.mopidy.on("state:online", spy);

    this.mopidy._createApi({});

    expect(spy).toBeCalledWith();
  });
});

describe("API method calls", () => {
  beforeEach(() => {
    this.mopidy = new Mopidy({
      webSocket: this.openWebSocket,
    });
    this.mopidy._createApi({
      foo: {
        params: ["bar", "baz"],
      },
    });
    this.sendStub = jest
      .spyOn(this.mopidy, "_send")
      .mockImplementation(() => {});
  });

  test("sends no params if no arguments passed to function", () => {
    this.mopidy.foo();

    expect(this.sendStub).toBeCalledWith({ method: "foo" });
  });

  test("sends by-position if argument is a list", () => {
    this.mopidy.foo([31, 97]);

    expect(this.sendStub).toBeCalledWith({
      method: "foo",
      params: [31, 97],
    });
  });

  test("sends by-name if argument is an object", () => {
    this.mopidy.foo({ bar: 31, baz: 97 });

    expect(this.sendStub).toBeCalledWith({
      method: "foo",
      params: { bar: 31, baz: 97 },
    });
  });

  test("rejects with error if more than one argument", (done) => {
    const promise = this.mopidy.foo([1, 2], { c: 3, d: 4 });

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(this.sendStub).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(
          "Expected zero arguments, a single array, or a single object."
        );
      })
      .then(done);
  });

  test("rejects with error if string", (done) => {
    const promise = this.mopidy.foo("hello");

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(this.sendStub).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toBe("Expected an array or an object.");
      })
      .then(done);
  });

  test("rejects with error if number", (done) => {
    const promise = this.mopidy.foo(1337);

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(this.sendStub).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toBe("Expected an array or an object.");
      })
      .then(done);
  });
});
