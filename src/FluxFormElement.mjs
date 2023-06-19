import { flux_css_api } from "../../flux-css-api/src/FluxCssApi.mjs";
import { FLUX_FORM_EVENT_CHANGE, FLUX_FORM_EVENT_INPUT } from "./FLUX_FORM_EVENT.mjs";
import { FLUX_INPUT_EVENT_CHANGE, FLUX_INPUT_EVENT_INPUT } from "./FLUX_INPUT_EVENT.mjs";

/** @typedef {import("./FluxInputElement.mjs").FluxInputElement} FluxInputElement */
/** @typedef {import("./Input.mjs").Input} Input */
/** @typedef {import("./InputValue.mjs").InputValue} InputValue */
/** @typedef {import("./validateValue.mjs").validateValue} validateValue */

const variables_css = await flux_css_api.import(
    `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxFormElementVariables.css`
);

document.adoptedStyleSheets.unshift(variables_css);

const css = await flux_css_api.import(
    `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxFormElement.css`
);

export class FluxFormElement extends HTMLElement {
    /**
     * @type {Map<string, validateValue>}
     */
    #additional_validation_types;
    /**
     * @type {ShadowRoot}
     */
    #shadow;

    /**
     * @param {Input[]} inputs
     * @returns {Promise<FluxFormElement>}
     */
    static async newWithInputs(inputs) {
        const flux_form_element = this.new();

        await flux_form_element.setInputs(inputs);

        return flux_form_element;
    }

    /**
     * @returns {FluxFormElement}
     */
    static new() {
        return new this();
    }

    /**
     * @private
     */
    constructor() {
        super();

        this.#additional_validation_types = new Map();

        this.#shadow = this.attachShadow({
            mode: "closed"
        });

        this.#shadow.adoptedStyleSheets.push(css);

        const form_element = document.createElement("form");
        form_element.addEventListener("submit", e => {
            e.preventDefault();
        });
        this.#shadow.appendChild(form_element);
    }

    /**
     * @param {string} type
     * @param {validateValue} validate_value
     * @returns {void}
     */
    addAdditionalValidationType(type, validate_value) {
        if (this.#additional_validation_types.has(type)) {
            throw new Error(`Additional validation type ${type} already exists`);
        }

        this.#additional_validation_types.set(type, validate_value);

        for (const flux_input_element of this.#flux_input_elements) {
            flux_input_element.addAdditionalValidationType(
                type,
                validate_value
            );
        }
    }

    /**
     * @returns {Input[]}
     */
    get inputs() {
        return this.#flux_input_elements.map(flux_input_element => flux_input_element.input);
    }

    /**
     * @param {boolean} disabled
     * @returns {Promise<void>}
     */
    async setDisabled(disabled) {
        for (const flux_input_element of this.#flux_input_elements) {
            await flux_input_element.setDisabled(
                disabled
            );
        }
    }

    /**
     * @param {Input[]} inputs
     * @returns {Promise<void>}
     */
    async setInputs(inputs) {
        this.#flux_input_elements.forEach(flux_input_element => {
            flux_input_element.remove();
        });

        for (const input of inputs) {
            await this.#addInput(
                input
            );
        }
    }

    /**
     * @param {InputValue[] | null} values
     * @returns {Promise<void>}
     */
    async setValues(values = null) {
        for (const flux_input_element of this.#flux_input_elements) {
            await flux_input_element.setValue(
                values?.find(_value => _value.name === flux_input_element.name)?.value ?? null
            );
        }
    }

    /**
     * @param {boolean | null} report
     * @returns {Promise<boolean>}
     */
    async validate(report = null) {
        for (const flux_input_element of this.#flux_input_elements) {
            if (!await flux_input_element.validate(
                report
            )) {
                return false;
            }
        }

        return true;
    }

    /**
     * @returns {InputValue[]}
     */
    get values() {
        return this.#flux_input_elements.map(flux_input_element => ({
            name: flux_input_element.name,
            value: flux_input_element.value
        }));
    }

    /**
     * @param {Input} input
     * @returns {Promise<void>}
     */
    async #addInput(input) {
        const flux_input_element = await (await import("./FluxInputElement.mjs")).FluxInputElement.newWithInput(
            input
        );
        flux_input_element.dataset.input = true;
        flux_input_element.addEventListener(FLUX_INPUT_EVENT_CHANGE, e => {
            this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_CHANGE, {
                detail: {
                    name: flux_input_element.name,
                    value: e.detail.value
                }
            }));
        });
        flux_input_element.addEventListener(FLUX_INPUT_EVENT_INPUT, e => {
            this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_INPUT, {
                detail: {
                    name: flux_input_element.name,
                    value: e.detail.value
                }
            }));
        });

        for (const [
            type,
            validate_value
        ] of this.#additional_validation_types) {
            flux_input_element.addAdditionalValidationType(
                type,
                validate_value
            );
        }

        this.#form_element.appendChild(flux_input_element);
    }

    /**
     * @returns {FluxInputElement[]}
     */
    get #flux_input_elements() {
        return Array.from(this.#form_element.querySelectorAll("[data-input]"));
    }

    /**
     * @returns {HTMLFormElement}
     */
    get #form_element() {
        return this.#shadow.querySelector("form");
    }
}

export const FLUX_FORM_ELEMENT_TAG_NAME = "flux-form";

customElements.define(FLUX_FORM_ELEMENT_TAG_NAME, FluxFormElement);
