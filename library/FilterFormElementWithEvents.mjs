/** @typedef {import("./FilterFormElement.mjs").FilterFormElement} FilterFormElement */
/** @typedef {import("./FilterFormElementChangeEvent.mjs").FilterFormElementChangeEvent} FilterFormElementChangeEvent */
/** @typedef {import("./FilterFormElementInputEvent.mjs").FilterFormElementInputEvent} FilterFormElementInputEvent */

/**
 * @typedef {FilterFormElement & {addEventListener: ((type: "input-change", callback: (event: FilterFormElementChangeEvent) => void, options?: boolean | AddEventListenerOptions) => void) & ((type: "input-input", callback: (event: FilterFormElementInputEvent) => void, options?: boolean | AddEventListenerOptions) => void), removeEventListener: ((type: "input-change", callback: (event: FilterFormElementChangeEvent) => void, options?: boolean | EventListenerOptions) => void) & ((type: "input-input", callback: (event: FilterFormElementInputEvent) => void, options?: boolean | EventListenerOptions) => void)}} FilterFormElementWithEvents
 */
