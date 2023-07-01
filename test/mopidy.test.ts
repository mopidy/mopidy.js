/// <reference types="jest-extended" />
/* eslint no-new:off */
/* eslint-env jest */

import { toHaveBeenCalledAfter } from "jest-extended";
import WebSocket from "modern-isomorphic-ws";
import Mopidy from "..";

expect.extend({ toHaveBeenCalledAfter });
jest.useFakeTimers();
const warn = jest.spyOn(global.console, "warn").mockImplementation(() => {});

var mopidy, openWebSocket;

beforeEach(async () => {
  // Create a generic WebSocket mock
  const WebSocketMock = jest.fn();
  WebSocketMock.mockName("WebSocketMock");
  WebSocketMock.mockImplementation(() => ({
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    close: jest
      .fn(function close() {
        this.onclose({});
      })
      .mockName("close"),
    send: jest.fn().mockName("send"),
    readyState: 3,
  }));

  // Use the WebSocketMock to create all new WebSockets
  Mopidy.WebSocket = WebSocketMock;

  // Create Mopidy instance good enough for most tests
  openWebSocket = new WebSocketMock();
  openWebSocket.readyState = WebSocket.OPEN;
  WebSocketMock.mockClear();
  mopidy = new Mopidy({
    webSocket: openWebSocket,
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
      webSocket: openWebSocket,
    });

    expect(Mopidy.WebSocket).not.toBeCalled();
  });
});

describe(".off", () => {
  test("with no args works", () => {
    const removeAllStub = jest.spyOn(mopidy, "removeAllListeners");

    mopidy.off();

    expect(removeAllStub).toBeCalledWith();
  });

  test("with an event name works", () => {
    const removeAllStub = jest.spyOn(mopidy, "removeAllListeners");

    mopidy.off("some-event");

    expect(removeAllStub).toBeCalledWith("some-event");
  });

  test("with a listener fails", () => {
    const listener = () => {};
    const removeAllStub = jest.spyOn(mopidy, "removeAllListeners");

    try {
      mopidy.off(listener);
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
    const removeStub = jest.spyOn(mopidy, "removeListener");

    mopidy.off("some-event", listener);

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
    expect(mopidy._webSocket).toBe(Mopidy.WebSocket);
    expect(mopidy._webSocket.readyState).toBe(WebSocket.OPEN);

    mopidy.connect();
  });
});

describe("WebSocket events", () => {
  test("emits 'websocket:close' when connection is closed", () => {
    const spy = jest.fn();
    mopidy.on("websocket:close", spy);

    const closeEvent = {};
    mopidy._webSocket.onclose(closeEvent);

    expect(spy).toBeCalledWith(closeEvent);
  });

  test("emits 'websocket:error' when errors occurs", () => {
    const spy = jest.fn();
    mopidy.on("websocket:error", spy);

    const errorEvent = {};
    mopidy._webSocket.onerror(errorEvent);

    expect(spy).toBeCalledWith(errorEvent);
  });

  test("emits 'websocket:incomingMessage' when a message arrives", () => {
    const spy = jest.fn();
    mopidy.on("websocket:incomingMessage", spy);

    const messageEvent = { data: "this is a message" };
    mopidy._webSocket.onmessage(messageEvent);

    expect(spy).toBeCalledWith(messageEvent);
  });

  test("emits 'websocket:open' when connection is opened", () => {
    const spy = jest.fn();
    mopidy.on("websocket:open", spy);

    mopidy._webSocket.onopen();

    expect(spy).toBeCalledWith();
  });
});

describe("._cleanup", () => {
  beforeEach(() => {
    mopidy.removeAllListeners("state:offline");
  });

  test("is called on 'websocket:close' event", () => {
    const closeEvent = {};
    const cleanup = jest.spyOn(mopidy, "_cleanup");
    mopidy._delegateEvents();

    mopidy.emit("websocket:close", closeEvent);

    expect(cleanup).toBeCalledWith(closeEvent);
  });

  test("rejects all pending requests", (done) => {
    const closeEvent = {};
    expect(Object.keys(mopidy._pendingRequests).length).toBe(0);

    const promise1 = mopidy._send({ method: "foo" });
    const promise2 = mopidy._send({ method: "bar" });
    expect(Object.keys(mopidy._pendingRequests).length).toBe(2);

    mopidy._cleanup(closeEvent);

    expect(Object.keys(mopidy._pendingRequests).length).toBe(0);
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
      .then(() => done());
  });

  test("emits 'state' event when done", () => {
    const spy = jest.fn();
    mopidy.on("state", spy);

    mopidy._cleanup({});

    expect(spy).toBeCalledWith("state:offline");
  });

  test("emits 'state:offline' event when done", () => {
    const spy = jest.fn();
    mopidy.on("state:offline", spy);

    mopidy._cleanup({});

    expect(spy).toBeCalledWith();
  });
});

describe("._reconnect", () => {
  test("is called when the state changes to offline", () => {
    const spy = jest.spyOn(mopidy, "_reconnect");
    mopidy._delegateEvents();

    mopidy.emit("state:offline");
    jest.runOnlyPendingTimers();

    expect(spy).toBeCalledWith();
  });

  test("tries to connect after an increasing backoff delay", () => {
    const connectStub = jest
      .spyOn(mopidy, "connect")
      .mockImplementation(() => {});
    const stateSpy = jest.fn();
    mopidy.on("state", stateSpy);
    const pendingSpy = jest.fn();
    mopidy.on("reconnectionPending", pendingSpy);
    const reconnectingSpy = jest.fn();
    mopidy.on("reconnecting", reconnectingSpy);

    expect(connectStub).toBeCalledTimes(0);

    mopidy._reconnect();
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
    mopidy._reconnect();
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
    mopidy._reconnect();
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
      .spyOn(mopidy, "connect")
      .mockImplementation(() => {});
    const stateSpy = jest.fn();
    mopidy.on("state", stateSpy);
    const pendingSpy = jest.fn();
    mopidy.on("reconnectionPending", pendingSpy);
    mopidy._backoffDelay = mopidy._settings.backoffDelayMax;

    expect(connectStub).toBeCalledTimes(0);

    mopidy._reconnect();
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
    mopidy._reconnect();
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
    mopidy.on("state:offline", offlineSpy);
    const reconnectionSpy = jest.fn();
    mopidy.on("reconnectionPending", reconnectionSpy);

    mopidy.emit("websocket:close");

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
    const spy = jest.spyOn(mopidy, "_resetBackoffDelay");
    mopidy._delegateEvents();

    mopidy.emit("websocket:open");

    expect(spy).toBeCalled();
  });

  test("resets the backoff delay to the minimum value", () => {
    mopidy._backoffDelay = mopidy._backoffDelayMax;

    mopidy._resetBackoffDelay();

    expect(mopidy._backoffDelay).toBe(mopidy._settings.backoffDelayMin);
  });
});

describe(".close", () => {
  test("unregisters reconnection hooks", () => {
    const offSpy = jest.spyOn(mopidy, "off");
    const reconnectingSpy = jest.fn();
    mopidy.on("reconnecting", reconnectingSpy);
    const reconnectionPendingSpy = jest.fn();
    mopidy.on("reconnectionPending", reconnectionPendingSpy);

    mopidy.close();

    expect(offSpy).toBeCalledWith("state:offline", mopidy._reconnect);

    jest.runOnlyPendingTimers(); // Handle the "state:offline" event

    expect(reconnectingSpy).not.toHaveBeenCalled();
    expect(reconnectionPendingSpy).not.toHaveBeenCalled();
  });

  test("closes the WebSocket", () => {
    mopidy.close();

    expect(mopidy._webSocket.close).toBeCalledWith();
  });

  test("close without an open WebSocket does not fail", () => {
    const mopidy = new Mopidy({ autoConnect: false });

    mopidy.close(); // No error thrown
  });
});

describe("._handleWebSocketError", () => {
  test("is called on 'websocket:error' event", () => {
    const error = {};
    const spy = jest.spyOn(mopidy, "_handleWebSocketError");
    mopidy._delegateEvents();

    mopidy.emit("websocket:error", error);

    expect(spy).toBeCalledWith(error);
  });

  test("without stack logs the error to the console", () => {
    const error = {};

    mopidy._handleWebSocketError(error);

    expect(warn).toBeCalledWith("WebSocket error:", error);
  });

  test("with stack logs the error to the console", () => {
    const error = { stack: "foo" };

    mopidy._handleWebSocketError(error);

    expect(warn).toBeCalledWith("WebSocket error:", error.stack);
  });
});

describe("._send", () => {
  test("adds JSON-RPC fields to the message", () => {
    jest.spyOn(mopidy, "_nextRequestId").mockImplementation(() => 1);
    const spy = jest.spyOn(JSON, "stringify");

    mopidy._send({ method: "foo" });

    expect(spy).toBeCalledWith({
      jsonrpc: "2.0",
      id: 1,
      method: "foo",
    });
  });

  test("adds a resolver to the pending requests queue", () => {
    jest.spyOn(mopidy, "_nextRequestId").mockImplementation(() => 1);
    expect(Object.keys(mopidy._pendingRequests).length).toBe(0);

    mopidy._send({ method: "foo" });

    expect(Object.keys(mopidy._pendingRequests).length).toBe(1);
    expect(mopidy._pendingRequests[1].resolve).toBeDefined();
  });

  test("sends message on the WebSocket", () => {
    expect(mopidy._webSocket.send).toBeCalledTimes(0);

    mopidy._send({ method: "foo" });

    expect(mopidy._webSocket.send).toBeCalledTimes(1);
  });

  test("emits a 'websocket:outgoingMessage' event", () => {
    const spy = jest.fn();
    mopidy.on("websocket:outgoingMessage", spy);
    jest.spyOn(mopidy, "_nextRequestId").mockImplementation(() => 1);

    mopidy._send({ method: "foo" });

    expect(spy).toBeCalledWith({
      jsonrpc: "2.0",
      id: 1,
      method: "foo",
    });
  });

  test("immediately rejects request if CONNECTING", (done) => {
    mopidy._webSocket.readyState = Mopidy.WebSocket.CONNECTING;

    const promise = mopidy._send({ method: "foo" });

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(mopidy._webSocket.send).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(Mopidy.ConnectionError);
        expect(error.message).toBe("WebSocket is still connecting");
      })
      .then(done);
  });

  test("immediately rejects request if CLOSING", (done) => {
    mopidy._webSocket.readyState = Mopidy.WebSocket.CLOSING;

    const promise = mopidy._send({ method: "foo" });

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(mopidy._webSocket.send).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(Mopidy.ConnectionError);
        expect(error.message).toBe("WebSocket is closing");
      })
      .then(done);
  });

  test("immediately rejects request if CLOSED", (done) => {
    mopidy._webSocket.readyState = Mopidy.WebSocket.CLOSED;

    const promise = mopidy._send({ method: "foo" });

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(mopidy._webSocket.send).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(Mopidy.ConnectionError);
        expect(error.message).toBe("WebSocket is closed");
      })
      .then(done);
  });
});

describe("._nextRequestId", () => {
  test("returns an ever increasing ID", () => {
    const base = mopidy._nextRequestId();
    expect(mopidy._nextRequestId()).toBe(base + 1);
    expect(mopidy._nextRequestId()).toBe(base + 2);
    expect(mopidy._nextRequestId()).toBe(base + 3);
  });
});

describe("._handleMessage", () => {
  test("is called on 'websocket:incomingMessage' event", () => {
    const messageEvent = {};
    const stub = jest
      .spyOn(mopidy, "_handleMessage")
      .mockImplementation(() => {});
    mopidy._delegateEvents();

    mopidy.emit("websocket:incomingMessage", messageEvent);

    expect(stub).toBeCalledWith(messageEvent);
  });

  test("passes JSON-RPC responses on to _handleResponse", () => {
    const spy = jest.spyOn(mopidy, "_handleResponse");
    const message = {
      jsonrpc: "2.0",
      id: 1,
      result: null,
    };
    const messageEvent = { data: JSON.stringify(message) };

    mopidy._handleMessage(messageEvent);

    expect(spy).toBeCalledWith(message);
  });

  test("passes events on to _handleEvent", () => {
    const stub = jest
      .spyOn(mopidy, "_handleEvent")
      .mockImplementation(() => {});
    const message = {
      event: "track_playback_started",
      track: {},
    };
    const messageEvent = { data: JSON.stringify(message) };

    mopidy._handleMessage(messageEvent);

    expect(stub).toBeCalledWith(message);
  });

  test("logs unknown messages", () => {
    const messageEvent = { data: JSON.stringify({ foo: "bar" }) };

    mopidy._handleMessage(messageEvent);

    expect(warn).toBeCalledWith(
      `Unknown message type received. Message was: ${messageEvent.data}`
    );
  });

  test("logs JSON parsing errors", () => {
    const messageEvent = { data: "foobarbaz" };

    mopidy._handleMessage(messageEvent);

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

    mopidy._handleResponse(responseMessage);

    expect(warn).toBeCalledWith(
      "Unexpected response received. Message was:",
      responseMessage
    );
  });

  test("removes the matching request from the pending queue", () => {
    expect(Object.keys(mopidy._pendingRequests).length).toBe(0);
    mopidy._send({ method: "bar" });
    expect(Object.keys(mopidy._pendingRequests).length).toBe(1);

    mopidy._handleResponse({
      jsonrpc: "2.0",
      id: Object.keys(mopidy._pendingRequests)[0],
      result: "baz",
    });

    expect(Object.keys(mopidy._pendingRequests).length).toBe(0);
  });

  test("resolves requests which get results back", (done) => {
    const promise = mopidy._send({ method: "bar" });
    const responseResult = {};
    const responseMessage = {
      jsonrpc: "2.0",
      id: Object.keys(mopidy._pendingRequests)[0],
      result: responseResult,
    };

    mopidy._handleResponse(responseMessage);

    expect.hasAssertions();
    promise
      .then((result) => {
        expect(result).toBe(responseResult);
      })
      .then(done);
  });

  test("rejects and logs requests which get errors back", (done) => {
    const promise = mopidy._send({ method: "bar" });
    const responseError = {
      code: -32601,
      message: "Method not found",
      data: {},
    };
    const responseMessage = {
      jsonrpc: "2.0",
      id: Object.keys(mopidy._pendingRequests)[0],
      error: responseError,
    };

    mopidy._handleResponse(responseMessage);

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
    const promise = mopidy._send({ method: "bar" });
    const responseError = {
      code: -32601,
      message: "Method not found",
      // 'data' key intentionally missing
    };
    const responseMessage = {
      jsonrpc: "2.0",
      id: Object.keys(mopidy._pendingRequests)[0],
      error: responseError,
    };

    mopidy._handleResponse(responseMessage);

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
    const promise = mopidy._send({ method: "bar" });
    const responseMessage = {
      jsonrpc: "2.0",
      id: Object.keys(mopidy._pendingRequests)[0],
    };

    mopidy._handleResponse(responseMessage);

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
    mopidy.on("event", spy);
    const track = {};
    const message = {
      event: "track_playback_started",
      track,
    };

    mopidy._handleEvent(message);

    expect(spy).toBeCalledWith("event:trackPlaybackStarted", { track });
  });

  test("emits server side events on 'event:*' events", () => {
    const spy = jest.fn();
    mopidy.on("event:trackPlaybackStarted", spy);
    const track = {};
    const message = {
      event: "track_playback_started",
      track,
    };

    mopidy._handleEvent(message);

    expect(spy).toBeCalledWith({ track });
  });
});

describe("._getApiSpec", () => {
  test("is called on 'websocket:open' event", () => {
    const spy = jest.spyOn(mopidy, "_getApiSpec");
    mopidy._delegateEvents();

    mopidy.emit("websocket:open");

    expect(spy).toBeCalledWith();
  });

  test("gets API description from server and calls _createApi", (done) => {
    const methods = {};
    const sendStub = jest
      .spyOn(mopidy, "_send")
      .mockReturnValue(Promise.resolve(methods));
    const createApiStub = jest
      .spyOn(mopidy, "_createApi")
      .mockImplementation(() => {});

    expect.hasAssertions();
    mopidy
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
    expect(mopidy.hello).toBeUndefined();
    expect(mopidy.hi).toBeUndefined();

    mopidy._createApi({
      hello: {
        description: "Says hello",
        params: [],
      },
      hi: {
        description: "Says hi",
        params: [],
      },
    });

    expect(typeof mopidy.hello).toBe("function");
    expect(mopidy.hello.description).toBe("Says hello");
    expect(mopidy.hello.params).toEqual([]);
    expect(typeof mopidy.hi).toBe("function");
    expect(mopidy.hi.description).toBe("Says hi");
    expect(mopidy.hi.params).toEqual([]);
  });

  test("can create an API with methods on a sub-object", () => {
    expect(mopidy.hello).toBeUndefined();

    mopidy._createApi({
      "hello.world": {
        description: "Says hello to the world",
        params: [],
      },
    });

    expect(mopidy.hello).toBeDefined();
    expect(typeof mopidy.hello.world).toBe("function");
  });

  test("strips off 'core' from method paths", () => {
    expect(mopidy.hello).toBeUndefined();

    mopidy._createApi({
      "core.hello.world": {
        description: "Says hello to the world",
        params: [],
      },
    });

    expect(mopidy.hello).toBeDefined();
    expect(typeof mopidy.hello.world).toBe("function");
  });

  test("converts snake_case to camelCase", () => {
    expect(mopidy.mightyGreetings).toBeUndefined();

    mopidy._createApi({
      "mighty_greetings.hello_world": {
        description: "Says hello to the world",
        params: [],
      },
    });

    expect(mopidy.mightyGreetings).toBeDefined();
    expect(typeof mopidy.mightyGreetings.helloWorld).toBe("function");
  });

  test("triggers 'state' event when API is ready for use", () => {
    const spy = jest.fn();
    mopidy.on("state", spy);

    mopidy._createApi({});

    expect(spy).toBeCalledWith("state:online");
  });

  test("triggers 'state:online' event when API is ready for use", () => {
    const spy = jest.fn();
    mopidy.on("state:online", spy);

    mopidy._createApi({});

    expect(spy).toBeCalledWith();
  });
});

describe("API method calls", () => {
  var sendStub;

  beforeEach(() => {
    mopidy = new Mopidy({
      webSocket: openWebSocket,
    });
    mopidy._createApi({
      foo: {
        params: ["bar", "baz"],
      },
    });
    sendStub = jest.spyOn(mopidy, "_send").mockImplementation(() => {});
  });

  test("sends no params if no arguments passed to function", () => {
    mopidy.foo();

    expect(sendStub).toBeCalledWith({ method: "foo" });
  });

  test("sends by-position if argument is a list", () => {
    mopidy.foo([31, 97]);

    expect(sendStub).toBeCalledWith({
      method: "foo",
      params: [31, 97],
    });
  });

  test("sends by-name if argument is an object", () => {
    mopidy.foo({ bar: 31, baz: 97 });

    expect(sendStub).toBeCalledWith({
      method: "foo",
      params: { bar: 31, baz: 97 },
    });
  });

  test("rejects with error if more than one argument", (done) => {
    const promise = mopidy.foo([1, 2], { c: 3, d: 4 });

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(sendStub).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(
          "Expected zero arguments, a single array, or a single object."
        );
      })
      .then(done);
  });

  test("rejects with error if string", (done) => {
    const promise = mopidy.foo("hello");

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(sendStub).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toBe("Expected an array or an object.");
      })
      .then(done);
  });

  test("rejects with error if number", (done) => {
    const promise = mopidy.foo(1337);

    expect.hasAssertions();
    promise
      .catch((error) => {
        expect(sendStub).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toBe("Expected an array or an object.");
      })
      .then(done);
  });
});
