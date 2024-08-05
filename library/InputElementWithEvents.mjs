/** @typedef {import("./InputElement.mjs").InputElement} InputElement */
/** @typedef {import("./InputElementChangeEvent.mjs").InputElementChangeEvent} InputElementChangeEvent */
/** @typedef {import("./InputElementInputEvent.mjs").InputElementInputEvent} InputElementInputEvent */

/**
 * @typedef {InputElement & {addEventListener: ((type: "input-change", callback: (event: InputElementChangeEvent) => void, options?: boolean | AddEventListenerOptions) => void) & ((type: "input-input", callback: (event: InputElementInputEvent) => void, options?: boolean | AddEventListenerOptions) => void), removeEventListener: ((type: "input-change", callback: (event: InputElementChangeEvent) => void, options?: boolean | EventListenerOptions) => void) & ((type: "input-input", callback: (event: InputElementInputEvent) => void, options?: boolean | EventListenerOptions) => void)}} InputElementWithEvents
 */
