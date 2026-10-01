/**
 * F16 · the adapter registry (RR-120). An entry exists only for a source whose storage, attribution and licence were verified from primary
 * sources and recorded in _handoffs; each adapter reads a RECORDED response, and none fetches. Unknown ids are refused by the caller.
 */
import * as stackExchange from "./stack-exchange.mjs";

export const ADAPTERS = Object.freeze({ "stack-exchange": stackExchange });
