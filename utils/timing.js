"use strict";

// Start a labeled timer and return a function that logs elapsed time.
function start(label) {
  const t0 = Date.now();
  let lastMark = t0;
  const marks = [];

  return {
        mark(name) {
      const now = Date.now();
      marks.push({ name, ms: now - lastMark });
      lastMark = now;
    },
        end(extra = "") {
      const total = Date.now() - t0;
      if (marks.length) {
        const breakdown = marks.map(m => `${m.name}=${m.ms}ms`).join(", ");
        console.log(`[TIMING] ${label}: ${total}ms (${breakdown})${extra ? " " + extra : ""}`);
      } else {
        console.log(`[TIMING] ${label}: ${total}ms${extra ? " " + extra : ""}`);
      }
      return total;
    },
  };
}

export { start  };
export default { start };
