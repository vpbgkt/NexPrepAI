const PROXY_CONFIG = [
  {
    context: [
      "/api"
    ],
    target: "http://localhost:5000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: { "^/api": "/api" }, // Ensures /api prefix is maintained
    onProxyReq: function(proxyReq, req, res) {
      console.log(`[PROXY] Forwarding ${req.method} request from ${req.originalUrl} to ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
    },
    onError: function(err, req, res) {
      console.error('[PROXY] Error:', err);
      // It's important to send a response back to the browser, otherwise it might hang
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'text/plain'
        });
        res.end('Proxy error: ' + err.message);
      }
    }
  }
];

module.exports = PROXY_CONFIG;
