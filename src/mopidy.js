const bane = require("bane");
const when = require("when");
const WebSocket = require("isomorphic-ws");

class Mopidy {
  constructor(settings) {
    if (!(this instanceof Mopidy)) {
      return new Mopidy(settings);
    }
    this._console = Mopidy._getConsole(settings || {});
    this._settings = this._configure(settings || {});
    this._backoffDelay = this._settings.backoffDelayMin;
    this._pendingRequests = {};
    this._webSocket = null;
    bane.createEventEmitter(this);
    this._delegateEvents();
    if (this._settings.autoConnect) {
      this.connect();
    }
  }

  _configure(settings) {
    const newSettings = { ...settings };
    const protocol =
      typeof document !== "undefined" && document.location.protocol === "https:"
        ? "wss://"
        : "ws://";
    const currentHost =
      (typeof document !== "undefined" && document.location.host) ||
      "localhost";
    newSettings.webSocketUrl =
      settings.webSocketUrl || `${protocol}${currentHost}/mopidy/ws`;
    if (settings.autoConnect !== false) {
      newSettings.autoConnect = true;
    }
    newSettings.backoffDelayMin = settings.backoffDelayMin || 1000;
    newSettings.backoffDelayMax = settings.backoffDelayMax || 64000;
    if (typeof settings.callingConvention === "undefined") {
      this._console.warn(
        "Mopidy.js is using the default calling convention. The " +
          "default will change in the future. You should explicitly " +
          "specify which calling convention you use."
      );
    }
    newSettings.callingConvention =
      settings.callingConvention || "by-position-only";
    return newSettings;
  }

  _delegateEvents() {
    // Remove existing event handlers
    this.off("websocket:close");
    this.off("websocket:error");
    this.off("websocket:incomingMessage");
    this.off("websocket:open");
    this.off("state:offline");
    // Register basic set of event handlers
    this.on("websocket:close", this._cleanup);
    this.on("websocket:error", this._handleWebSocketError);
    this.on("websocket:incomingMessage", this._handleMessage);
    this.on("websocket:open", this._resetBackoffDelay);
    this.on("websocket:open", this._getApiSpec);
    this.on("state:offline", this._reconnect);
  }

  connect() {
    if (this._webSocket) {
      if (this._webSocket.readyState === Mopidy.WebSocket.OPEN) {
        return;
      }
      this._webSocket.close();
    }

    this._webSocket =
      this._settings.webSocket ||
      new Mopidy.WebSocket(this._settings.webSocketUrl);

    this._webSocket.onclose = close => {
      this.emit("websocket:close", close);
    };
    this._webSocket.onerror = error => {
      this.emit("websocket:error", error);
    };
    this._webSocket.onopen = () => {
      this.emit("websocket:open");
    };
    this._webSocket.onmessage = message => {
      this.emit("websocket:incomingMessage", message);
    };
  }

  _cleanup(closeEvent) {
    Object.keys(this._pendingRequests).forEach(requestId => {
      const resolver = this._pendingRequests[requestId];
      delete this._pendingRequests[requestId];
      const error = new Mopidy.ConnectionError("WebSocket closed");
      error.closeEvent = closeEvent;
      resolver.reject(error);
    });
    this.emit("state:offline");
  }

  _reconnect() {
    this.emit("reconnectionPending", {
      timeToAttempt: this._backoffDelay,
    });
    setTimeout(() => {
      this.emit("reconnecting");
      this.connect();
    }, this._backoffDelay);
    this._backoffDelay = this._backoffDelay * 2;
    if (this._backoffDelay > this._settings.backoffDelayMax) {
      this._backoffDelay = this._settings.backoffDelayMax;
    }
  }

  _resetBackoffDelay() {
    this._backoffDelay = this._settings.backoffDelayMin;
  }

  close() {
    this.off("state:offline", this._reconnect);
    this._webSocket.close();
  }

  _handleWebSocketError(error) {
    this._console.warn("WebSocket error:", error.stack || error);
  }

  _send(message) {
    switch (this._webSocket.readyState) {
      case Mopidy.WebSocket.CONNECTING:
        return when.reject(
          new Mopidy.ConnectionError("WebSocket is still connecting")
        );
      case Mopidy.WebSocket.CLOSING:
        return when.reject(new Mopidy.ConnectionError("WebSocket is closing"));
      case Mopidy.WebSocket.CLOSED:
        return when.reject(new Mopidy.ConnectionError("WebSocket is closed"));
      default:
    }
    const jsonRpcMessage = {
      ...message,
      jsonrpc: "2.0",
      id: this._nextRequestId(),
    };
    const deferred = when.defer();
    this._pendingRequests[jsonRpcMessage.id] = deferred.resolver;
    this._webSocket.send(JSON.stringify(jsonRpcMessage));
    this.emit("websocket:outgoingMessage", jsonRpcMessage);
    return deferred.promise;
  }

  _handleMessage(message) {
    try {
      const data = JSON.parse(message.data);
      if (Object.hasOwnProperty.call(data, "id")) {
        this._handleResponse(data);
      } else if (Object.hasOwnProperty.call(data, "event")) {
        this._handleEvent(data);
      } else {
        this._console.warn(
          `Unknown message type received. Message was: ${message.data}`
        );
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        this._console.warn(
          `WebSocket message parsing failed. Message was: ${message.data}`
        );
      } else {
        throw error;
      }
    }
  }

  _handleResponse(responseMessage) {
    if (
      !Object.hasOwnProperty.call(this._pendingRequests, responseMessage.id)
    ) {
      this._console.warn(
        "Unexpected response received. Message was:",
        responseMessage
      );
      return;
    }
    let error;
    const resolver = this._pendingRequests[responseMessage.id];
    delete this._pendingRequests[responseMessage.id];
    if (Object.hasOwnProperty.call(responseMessage, "result")) {
      resolver.resolve(responseMessage.result);
    } else if (Object.hasOwnProperty.call(responseMessage, "error")) {
      error = new Mopidy.ServerError(responseMessage.error.message);
      error.code = responseMessage.error.code;
      error.data = responseMessage.error.data;
      resolver.reject(error);
      this._console.warn("Server returned error:", responseMessage.error);
    } else {
      error = new Error("Response without 'result' or 'error' received");
      error.data = { response: responseMessage };
      resolver.reject(error);
      this._console.warn(
        "Response without 'result' or 'error' received. Message was:",
        responseMessage
      );
    }
  }

  _handleEvent(eventMessage) {
    const type = eventMessage.event;
    const data = eventMessage;
    delete data.event;
    this.emit(`event:${Mopidy._snakeToCamel(type)}`, data);
  }

  _getApiSpec() {
    return this._send({ method: "core.describe" })
      .then(this._createApi.bind(this))
      .catch(this._handleWebSocketError);
  }

  _createApi(methods) {
    const byPositionOrByName =
      this._settings.callingConvention === "by-position-or-by-name";

    const caller = method => (...args) => {
      const message = { method };
      if (args.length === 0) {
        return this._send(message);
      }
      if (!byPositionOrByName) {
        message.params = Array.prototype.slice.call(args);
        return this._send(message);
      }
      if (args.length > 1) {
        return when.reject(
          new Error(
            "Expected zero arguments, a single array, or a single object."
          )
        );
      }
      if (!Array.isArray(args[0]) && args[0] !== Object(args[0])) {
        return when.reject(new TypeError("Expected an array or an object."));
      }
      [message.params] = args;
      return this._send(message);
    };

    const getPath = fullName => {
      let path = fullName.split(".");
      if (path.length >= 1 && path[0] === "core") {
        path = path.slice(1);
      }
      return path;
    };

    const createObjects = objPath => {
      let parentObj = this;
      objPath.forEach(objName => {
        const camelObjName = Mopidy._snakeToCamel(objName);
        parentObj[camelObjName] = parentObj[camelObjName] || {};
        parentObj = parentObj[camelObjName];
      });
      return parentObj;
    };

    const createMethod = fullMethodName => {
      const methodPath = getPath(fullMethodName);
      const methodName = Mopidy._snakeToCamel(methodPath.slice(-1)[0]);
      const object = createObjects(methodPath.slice(0, -1));
      object[methodName] = caller(fullMethodName);
      object[methodName].description = methods[fullMethodName].description;
      object[methodName].params = methods[fullMethodName].params;
    };

    Object.keys(methods).forEach(createMethod);

    this.emit("state:online");
  }

  static _getConsole(settings) {
    if (typeof settings.console !== "undefined") {
      return settings.console;
    }
    const con = (typeof console !== "undefined" && console) || {};
    con.log = con.log || (() => {});
    con.warn = con.warn || (() => {});
    con.error = con.error || (() => {});
    return con;
  }

  static _snakeToCamel(name) {
    return name.replace(/(_[a-z])/g, match =>
      match.toUpperCase().replace("_", "")
    );
  }
}

class ConnectionError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConnectionError";
  }
}
Mopidy.ConnectionError = ConnectionError;

class ServerError extends Error {
  constructor(message) {
    super(message);
    this.name = "ServerError";
  }
}
Mopidy.ServerError = ServerError;

Mopidy.WebSocket = WebSocket;

Mopidy.when = when;

Mopidy.prototype._nextRequestId = (() => {
  let lastUsed = -1;
  return () => {
    lastUsed += 1;
    return lastUsed;
  };
})();

module.exports = Mopidy;
