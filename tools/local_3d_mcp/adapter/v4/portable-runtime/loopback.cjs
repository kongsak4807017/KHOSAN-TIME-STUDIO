// Process-local binding and Host guard for this standalone proof's temporary
// HTTP/WebSocket servers. No Studio installation or dependency file is edited.
const net = require('node:net');
const http = require('node:http');
const installation = Symbol.for('khosan.local3d.loopback-guard');
if (!globalThis[installation]) {
  globalThis[installation] = true;
  const listen = net.Server.prototype.listen;
  net.Server.prototype.listen = function (...args) {
    const first = args[0];
    if (first && typeof first === 'object' && Object.hasOwn(first, 'port')) {
      args[0] = {...first, host: '127.0.0.1'};
    } else if (typeof first === 'number' || (typeof first === 'string' && /^\d+$/.test(first))) {
      const rest = args.slice(1), options = {port: Number(first), host: '127.0.0.1'};
      if (typeof rest[0] === 'string') rest.shift();
      if (typeof rest[0] === 'number') options.backlog = rest.shift();
      const callback = rest.find(value => typeof value === 'function');
      args = callback ? [options, callback] : [options];
    }
    return listen.apply(this, args);
  };
  const emit = http.Server.prototype.emit;
  http.Server.prototype.emit = function (event, ...args) {
    if (event === 'request' || event === 'upgrade') {
      const request = args[0];
      const host = String(request?.headers?.host || '').toLowerCase();
      const port = request.socket.localPort;
      if (host !== `localhost:${port}` && host !== `127.0.0.1:${port}`) {
        if (event === 'request') {args[1].writeHead(403); args[1].end('Loopback Host required');}
        else args[1].destroy();
        return true;
      }
    }
    return emit.call(this, event, ...args);
  };
}
