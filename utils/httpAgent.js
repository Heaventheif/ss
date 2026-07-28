"use strict";

import http from "http";
import https from "https";

// Shared keep-alive HTTPS agent for outgoing requests.
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,        
  keepAliveMsecs: 10000, 
});

// Shared keep-alive HTTP agent for outgoing requests.
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 10000,
});

export { httpsAgent, httpAgent  };
