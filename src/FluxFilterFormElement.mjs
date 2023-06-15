import { flux_css_api } from "../../flux-css-api/src/FluxCssApi.mjs";
import { FluxInputElement } from "./FluxInputElement.mjs";
import { FLUX_FILTER_FORM_EVENT_CHANGE, FLUX_FILTER_FORM_EVENT_INPUT } from "./FLUX_FILTER_FORM_EVENT.mjs";
import { FLUX_INPUT_EVENT_CHANGE, FLUX_INPUT_EVENT_INPUT } from "./FLUX_INPUT_EVENT.mjs";

/** @typedef {import("./Input.mjs").Input} Input */
/** @typedef {import("./InputValue.mjs").InputValue} InputValue */
/** @typedef {import("./validateValue.mjs").validateValue} validateValue */

const variables_css = await flux_css_api.import(
    `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxFilterFormElementVariables.css`
);

document.adoptedStyleSheets.unshift(variables_css);

const css = await flux_css_api.import(
    `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxFilterFormElement.css`
);

export class FluxFilterFormElement extends HTMLElement {
    /**
     * @type {Map<string, validateValue>}
     */
    #additional_validation_types;
    /**
     * @type {Input[]}
     */
    #inputs;
    /**
     * @type {ShadowRoot}
     */
    #shadow;

    /**
     * @param {Input[]} inputs
     * @returns {Promise<FluxFilterFormElement>}
     */
    static async newWithInputs(inputs) {
        const flux_filter_form_element = this.new();

        await flux_filter_form_element.setInputs(inputs);

        return flux_filter_form_element;
    }

    /**
     * @returns {FluxFilterFormElement}
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
        this.#inputs = [];

        this.#shadow = this.attachShadow({
            mode: "closed"
        });

        this.#shadow.adoptedStyleSheets.push(css);

        const form_element = document.createElement("form");
        form_element.addEventListener("submit", e => {
            e.preventDefault();
        });

        const add_input_container_element = document.createElement("div");
        add_input_container_element.classList.add("container");
        const add_input_element = document.createElement("select");
        add_input_element.dataset.add_input = true;
        const option_element = document.createElement("option");
        option_element.label = "+";
        option_element.value = "";
        add_input_element.appendChild(option_element);
        add_input_element.addEventListener("input", async () => {
            if (add_input_element.value === "") {
                return;
            }

            const input = this.#not_added_inputs[add_input_element.value] ?? null;

            this.#updateAddInputs();

            if (input === null) {
                return;
            }

            const flux_input_element = await this.#addInput(
                input
            );

            if (flux_input_element === null) {
                return;
            }

            this.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_EVENT_INPUT, {
                detail: {
                    name: flux_input_element.name,
                    value: flux_input_element.value
                }
            }));
            this.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_EVENT_CHANGE, {
                detail: {
                    name: flux_input_element.name,
                    value: flux_input_element.value
                }
            }));
        });
        add_input_container_element.appendChild(add_input_element);
        form_element.appendChild(add_input_container_element);

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
        return this.#inputs.map((input, index) => this.#getFluxInputElementByIndex(
            index
        )?.input ?? structuredClone(input));
    }

    /**
     * @returns {Input[]}
     */
    get inputs_with_name() {
        return this.inputs.map(input => (input.name ?? "") !== "");
    }

    /**
     * @param {boolean} disabled
     * @returns {Promise<void>}
     */
    async setDisabled(disabled) {
        this.#form_element.querySelectorAll("button").forEach(button_element => {
            button_element.disabled = disabled;
        });

        for (const flux_input_element of this.#flux_input_elements) {
            await flux_input_element.setDisabled(
                disabled
            );
        }

        this.#updateAddInputs();
    }

    /**
     * @param {Input[]} inputs
     * @returns {Promise<void>}
     */
    async setInputs(inputs) {
        this.#flux_input_elements.forEach(flux_input_element => {
            flux_input_element.remove();
        });

        this.#inputs = structuredClone(inputs);

        for (const input of this.#inputs) {
            if (!Object.hasOwn(input, "value")) {
                continue;
            }

            await this.#addInput(
                input,
                false
            );
        }

        this.#updateAddInputs();
    }

    /**
     * @param {InputValue[] | null} values
     * @returns {Promise<void>}
     */
    async setValues(values = null) {
        for (const input of this.#inputs) {
            if ((input.name ?? "") === "") {
                continue;
            }

            const value = values?.filter(_value => _value.name === input.name) ?? [];

            if (value.length > 0) {
                await (await this.#addInput(
                    input,
                    false
                )).setValue(
                    value[0].value ?? null
                );
            } else {
                this.#removeInput(
                    input,
                    false
                );
            }
        }

        this.#updateAddInputs();
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
        return this.#flux_input_elements_with_name.map(flux_input_element => ({
            name: flux_input_element.name,
            value: flux_input_element.value
        }));
    }

    /**
     * @param {Input} input
     * @param {boolean | null} update_add_inputs
     * @returns {Promise<FluxInputElement | null>}
     */
    async #addInput(input, update_add_inputs = null) {
        const index = this.#inputs.indexOf(input);

        if (index === -1) {
            return null;
        }

        const exists_flux_input_element = this.#getFluxInputElementByIndex(
            index
        );

        if (exists_flux_input_element !== null) {
            return exists_flux_input_element;
        }

        const container_element = document.createElement("div");
        container_element.classList.add("container");

        const flux_input_element = await FluxInputElement.newWithInput(
            input
        );
        flux_input_element.dataset.input = index;
        flux_input_element.addEventListener(FLUX_INPUT_EVENT_CHANGE, e => {
            this.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_EVENT_CHANGE, {
                detail: {
                    name: flux_input_element.name,
                    value: e.detail.value
                }
            }));
        });
        flux_input_element.addEventListener(FLUX_INPUT_EVENT_INPUT, e => {
            this.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_EVENT_INPUT, {
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

        const remove_button_element = document.createElement("button");
        remove_button_element.innerText = "X";
        remove_button_element.type = "button";
        remove_button_element.addEventListener("click", () => {
            this.#removeInput(
                input
            );

            this.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_EVENT_INPUT, {
                detail: {
                    name: flux_input_element.name
                }
            }));
            this.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_EVENT_CHANGE, {
                detail: {
                    name: flux_input_element.name
                }
            }));
        });
        container_element.appendChild(remove_button_element);

        container_element.appendChild(flux_input_element);

        this.#form_element.lastElementChild.before(container_element);

        if (update_add_inputs ?? true) {
            this.#updateAddInputs();
        }

        return flux_input_element;
    }

    /**
     * @returns {FluxInputElement[]}
     */
    get #flux_input_elements() {
        return Array.from(this.#form_element.querySelectorAll("[data-input]"));
    }

    /**
     * @returns {FluxInputElement[]}
     */
    get #flux_input_elements_with_name() {
        return this.#flux_input_elements.filter(flux_input_element => flux_input_element.name !== "");
    }

    /**
     * @returns {HTMLFormElement}
     */
    get #form_element() {
        return this.#shadow.querySelector("form");
    }

    /**
     * @param {number} index
     * @returns {FluxInputElement | null}
     */
    #getFluxInputElementByIndex(index) {
        return this.#flux_input_elements.find(flux_input_element => flux_input_element.dataset.input === `${index}`) ?? null;
    }

    /**
     * @returns {Input[]}
     */
    get #not_added_inputs() {
        return this.#inputs.filter((
            input,
            index
        ) => this.#getFluxInputElementByIndex(
            index
        ) === null);
    }

    /**
     * @param {Input} input
     * @param {boolean | null} update_add_inputs
     * @returns {void}
     */
    #removeInput(input, update_add_inputs = null) {
        const index = this.#inputs.indexOf(input);

        if (index === -1) {
            return;
        }

        const flux_input_element = this.#getFluxInputElementByIndex(
            index
        );

        if (flux_input_element === null) {
            return;
        }

        flux_input_element.parentElement.remove();

        if (update_add_inputs ?? true) {
            this.#updateAddInputs();
        }
    }

    /**
     * @returns {void}
     */
    #updateAddInputs() {
        const add_input_element = this.#form_element.querySelector("[data-add_input]");

        const inputs = Array.from(this.#not_added_inputs.entries()).sort(([
            ,
            input_1
        ], [
            ,
            input_2
        ]) => {
            const label_1 = input_1.label?.toLowerCase() ?? "";
            const label_2 = input_2.label?.toLowerCase() ?? "";

            return label_1 > label_2 ? 1 : label_1 < label_2 ? -1 : 0;
        });

        Array.from(add_input_element.options).filter(option_element => option_element.value !== "").forEach(option_element => {
            option_element.remove();
        });

        add_input_element.value = "";

        for (const [
            index,
            _input
        ] of inputs) {
            const option_element = document.createElement("option");
            option_element.label = _input.label ?? "";
            option_element.value = index;
            add_input_element.appendChild(option_element);
        }

        add_input_element.hidden = inputs.length === 0;
    }
}

export const FLUX_FILTER_FORM_ELEMENT_TAG_NAME = "flux-filter-form";

customElements.define(FLUX_FILTER_FORM_ELEMENT_TAG_NAME, FluxFilterFormElement);
