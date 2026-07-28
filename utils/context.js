"use strict";

// Build a convenience message object (e.g. reply()) for a thread/message.
function buildMessageAPI(api, threadID, messageID) {
  return {
    
    
    
    
    
    
    
    reply: (t, cb) => new Promise((resolve) => {
      api.sendMessage(t, threadID, (err, info) => {
        if (cb) cb(err, info);
        resolve(info || {});
      }, messageID);
    }),
    unsend: (msgID) => {
      try { api.unsendMessage(msgID, () => {}); } catch (_) {}
    },
    registerReply: (id, d, cb, senderID) => {
      global.Kagenou.replies[id] = {
        callback: cb,
        author: senderID,
        timestamp: Date.now(),
        ...d,
      };
    },
  };
}

// Build the full context object passed to a command's handler.
function buildCommandContext({ api, event, args = [] }) {
  const { threadID, messageID } = event;
  return {
    api,
    event,
    args,
    message: buildMessageAPI(api, threadID, messageID),
    prefix: "",
    usersData: global.usersData,
    globalData: global.globalData,
    db: global.db,
  };
}

export { buildMessageAPI, buildCommandContext  };
