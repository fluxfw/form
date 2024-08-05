/** @typedef {import("./FormElement.mjs").FormElement} FormElement */
/** @typedef {import("./FormElementChangeEvent.mjs").FormElementChangeEvent} FormElementChangeEvent */
/** @typedef {import("./FormElementInputEvent.mjs").FormElementInputEvent} FormElementInputEvent */

/**
 * @typedef {FormElement & {addEventListener: ((type: "input-change", callback: (event: FormElementChangeEvent) => void, options?: boolean | AddEventListenerOptions) => void) & ((type: "input-input", callback: (event: FormElementInputEvent) => void, options?: boolean | AddEventListenerOptions) => void), removeEventListener: ((type: "input-change", callback: (event: FormElementChangeEvent) => void, options?: boolean | EventListenerOptions) => void) & ((type: "input-input", callback: (event: FormElementInputEvent) => void, options?: boolean | EventListenerOptions) => void)}} FormElementWithEvents
 */
