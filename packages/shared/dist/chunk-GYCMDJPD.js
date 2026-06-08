import {
  EVENT_HANDLER_RE
} from "./chunk-54626TAK.js";

// src/guards/primitive/is-event-key.ts
function isEventKey(key) {
  return EVENT_HANDLER_RE.test(key);
}

export {
  isEventKey
};
