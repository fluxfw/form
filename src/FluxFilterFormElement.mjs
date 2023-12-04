import { flux_import_css } from "../../flux-style-sheet-manager/src/FluxImportCss.mjs";

/** @typedef {import("./FluxInputElement.mjs").FluxInputElement} FluxInputElement */
/** @typedef {import("./Input.mjs").Input} Input */
/** @typedef {import("./InputValue.mjs").InputValue} InputValue */
/** @typedef {import("./StyleSheetManager/StyleSheetManager.mjs").StyleSheetManager} StyleSheetManager */
/** @typedef {import("./validateValue.mjs").validateValue} validateValue */

const root_css = await flux_import_css.import(
    `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxFilterFormElementRoot.css`
);

const css = await flux_import_css.import(
    `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxFilterFormElement.css`
);

export const FLUX_FILTER_FORM_ELEMENT_EVENT_CHANGE = "flux-filter-form-change";

export const FLUX_FILTER_FORM_ELEMENT_EVENT_INPUT = "flux-filter-form-input";

export const FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX = "--flux-filter-form-";

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
     * @type {StyleSheetManager | null}
     */
    #style_sheet_manager;

    /**
     * @param {Input[] | null} inputs
     * @param {StyleSheetManager | null} style_sheet_manager
     * @returns {Promise<FluxFilterFormElement>}
     */
    static async new(inputs = null, style_sheet_manager = null) {
        if (style_sheet_manager !== null) {
            await style_sheet_manager.generateVariablesRootStyleSheet(
                FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX,
                {
                    [`${FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX}active-button-background-color`]: "foreground-color",
                    [`${FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX}active-button-foreground-color`]: "background-color",
                    [`${FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX}background-color`]: "background-color",
                    [`${FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX}button-background-color`]: "accent-color",
                    [`${FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX}button-focus-outline-color`]: "foreground-color",
                    [`${FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX}button-foreground-color`]: "accent-color-foreground-color",
                    [`${FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX}foreground-color`]: "foreground-color",
                    [`${FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX}input-background-color`]: "background-color",
                    [`${FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX}input-border-color`]: "foreground-color",
                    [`${FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX}input-focus-outline-color`]: "foreground-color",
                    [`${FLUX_FILTER_FORM_ELEMENT_VARIABLE_PREFIX}input-foreground-color`]: "foreground-color"
                },
                true
            );

            await style_sheet_manager.addRootStyleSheet(
                root_css,
                true
            );
        } else {
            if (!document.adoptedStyleSheets.includes(root_css)) {
                document.adoptedStyleSheets.unshift(root_css);
            }
        }

        const flux_filter_form_element = new this(
            style_sheet_manager
        );

        flux_filter_form_element.#shadow = flux_filter_form_element.attachShadow({
            mode: "closed"
        });

        await flux_filter_form_element.#style_sheet_manager?.addStyleSheetsToShadow(
            flux_filter_form_element.#shadow
        );

        flux_filter_form_element.#shadow.adoptedStyleSheets.push(css);

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
        add_input_element.append(option_element);
        add_input_element.addEventListener("input", async () => {
            if (add_input_element.value === "") {
                return;
            }

            const input = flux_filter_form_element.#not_added_inputs[add_input_element.value] ?? null;

            flux_filter_form_element.#updateAddInputs();

            if (input === null) {
                return;
            }

            const flux_input_element = await flux_filter_form_element.#addInput(
                input
            );

            if (flux_input_element === null) {
                return;
            }

            flux_filter_form_element.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_ELEMENT_EVENT_INPUT, {
                detail: {
                    name: flux_input_element.name,
                    value: flux_input_element.value
                }
            }));
            flux_filter_form_element.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_ELEMENT_EVENT_CHANGE, {
                detail: {
                    name: flux_input_element.name,
                    value: flux_input_element.value
                }
            }));
        });
        add_input_container_element.append(add_input_element);
        form_element.append(add_input_container_element);

        flux_filter_form_element.#shadow.append(form_element);

        if (inputs === null) {
            await flux_filter_form_element.setInputs(
                inputs
            );
        }

        return flux_filter_form_element;
    }

    /**
     * @param {StyleSheetManager | null} style_sheet_manager
     * @private
     */
    constructor(style_sheet_manager) {
        super();

        this.#style_sheet_manager = style_sheet_manager;
        this.#additional_validation_types = new Map();
        this.#inputs = [];
    }

    /**
     * @param {string} type
     * @param {validateValue} validate_value
     * @returns {Promise<void>}
     */
    async addAdditionalValidationType(type, validate_value) {
        if (this.#additional_validation_types.has(type)) {
            throw new Error(`Additional validation type ${type} already exists`);
        }

        this.#additional_validation_types.set(type, validate_value);

        for (const flux_input_element of this.#flux_input_elements) {
            await flux_input_element.addAdditionalValidationType(
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
     * @param {boolean} disabled
     * @returns {Promise<void>}
     */
    async setDisabled(disabled) {
        this.#form_element.querySelectorAll("button").forEach(element => {
            element.disabled = disabled;
        });

        this.#add_input_element.disabled = disabled;

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
        return this.#flux_input_elements.map(flux_input_element => ({
            name: flux_input_element.name,
            value: flux_input_element.value
        }));
    }

    /**
     * @returns {HTMLSelectElement}
     */
    get #add_input_element() {
        return this.#form_element.querySelector("[data-add_input]");
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

        const add_input_element = this.#add_input_element;

        const container_element = document.createElement("div");
        container_element.classList.add("container");

        const {
            FLUX_INPUT_ELEMENT_EVENT_CHANGE,
            FLUX_INPUT_ELEMENT_EVENT_INPUT,
            FluxInputElement
        } = await import("./FluxInputElement.mjs");

        const flux_input_element = await FluxInputElement.new(
            input,
            this.#style_sheet_manager
        );
        if (add_input_element.disabled) {
            await flux_input_element.setDisabled(
                true
            );
        }
        flux_input_element.dataset.input = index;
        flux_input_element.addEventListener(FLUX_INPUT_ELEMENT_EVENT_CHANGE, e => {
            this.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_ELEMENT_EVENT_CHANGE, {
                detail: {
                    name: flux_input_element.name,
                    value: e.detail.value
                }
            }));
        });
        flux_input_element.addEventListener(FLUX_INPUT_ELEMENT_EVENT_INPUT, e => {
            this.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_ELEMENT_EVENT_INPUT, {
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
            await flux_input_element.addAdditionalValidationType(
                type,
                validate_value
            );
        }

        const remove_button_element = document.createElement("button");
        remove_button_element.disabled = add_input_element.disabled;
        remove_button_element.innerText = "X";
        remove_button_element.type = "button";
        remove_button_element.addEventListener("click", () => {
            this.#removeInput(
                input
            );

            this.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_ELEMENT_EVENT_INPUT, {
                detail: {
                    name: flux_input_element.name
                }
            }));
            this.dispatchEvent(new CustomEvent(FLUX_FILTER_FORM_ELEMENT_EVENT_CHANGE, {
                detail: {
                    name: flux_input_element.name
                }
            }));
        });
        container_element.append(remove_button_element);

        container_element.append(flux_input_element);

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
        const add_input_element = this.#add_input_element;

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

        add_input_element.value = "";

        Array.from(add_input_element.options).filter(option_element => option_element.value !== "").forEach(option_element => {
            option_element.remove();
        });

        for (const [
            index,
            _input
        ] of inputs) {
            const option_element = document.createElement("option");
            option_element.label = _input.label ?? "";
            option_element.value = index;
            add_input_element.append(option_element);
        }

        add_input_element.hidden = inputs.length === 0;
    }
}

export const FLUX_FILTER_FORM_ELEMENT_TAG_NAME = "flux-filter-form";

customElements.define(FLUX_FILTER_FORM_ELEMENT_TAG_NAME, FluxFilterFormElement);
