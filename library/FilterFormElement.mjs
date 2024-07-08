import css from "./FilterFormElement.css" with { type: "css" };
import root_css from "./FilterFormElementRoot.css" with { type: "css" };

/** @typedef {import("./Input.mjs").Input} Input */
/** @typedef {import("./InputElement.mjs").InputElement} InputElement */
/** @typedef {import("./InputValue.mjs").InputValue} InputValue */
/** @typedef {import("./StyleSheetManager/StyleSheetManager.mjs").StyleSheetManager} StyleSheetManager */
/** @typedef {import("./validateValue.mjs").validateValue} validateValue */

export const FILTER_FORM_ELEMENT_EVENT_CHANGE = "filter-form-change";

export const FILTER_FORM_ELEMENT_EVENT_INPUT = "filter-form-input";

export const FILTER_FORM_ELEMENT_VARIABLE_PREFIX = "--filter-form-";

export class FilterFormElement extends HTMLElement {
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
     * @returns {Promise<FilterFormElement>}
     */
    static async new(inputs = null, style_sheet_manager = null) {
        if (style_sheet_manager !== null) {
            await style_sheet_manager.generateVariablesRootStyleSheet(
                FILTER_FORM_ELEMENT_VARIABLE_PREFIX,
                {
                    [`${FILTER_FORM_ELEMENT_VARIABLE_PREFIX}active-button-background-color`]: "foreground-color",
                    [`${FILTER_FORM_ELEMENT_VARIABLE_PREFIX}active-button-foreground-color`]: "background-color",
                    [`${FILTER_FORM_ELEMENT_VARIABLE_PREFIX}background-color`]: "background-color",
                    [`${FILTER_FORM_ELEMENT_VARIABLE_PREFIX}button-background-color`]: "accent-color",
                    [`${FILTER_FORM_ELEMENT_VARIABLE_PREFIX}button-focus-outline-color`]: "foreground-color",
                    [`${FILTER_FORM_ELEMENT_VARIABLE_PREFIX}button-foreground-color`]: "accent-foreground-color",
                    [`${FILTER_FORM_ELEMENT_VARIABLE_PREFIX}foreground-color`]: "foreground-color",
                    [`${FILTER_FORM_ELEMENT_VARIABLE_PREFIX}input-border-color`]: "foreground-color",
                    [`${FILTER_FORM_ELEMENT_VARIABLE_PREFIX}input-focus-outline-color`]: "foreground-color"
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

        const filter_form_element = new this(
            style_sheet_manager
        );

        filter_form_element.#shadow = filter_form_element.attachShadow({
            mode: "closed"
        });

        await filter_form_element.#style_sheet_manager?.addStyleSheetsToShadow(
            filter_form_element.#shadow
        );

        filter_form_element.#shadow.adoptedStyleSheets.push(css);

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

            const input = filter_form_element.#not_added_inputs[add_input_element.value] ?? null;

            filter_form_element.#updateAddInputs();

            if (input === null) {
                return;
            }

            const input_element = await filter_form_element.#addInput(
                input
            );

            if (input_element === null) {
                return;
            }

            filter_form_element.dispatchEvent(new CustomEvent(FILTER_FORM_ELEMENT_EVENT_INPUT, {
                detail: {
                    name: input_element.name,
                    value: input_element.value
                }
            }));
            filter_form_element.dispatchEvent(new CustomEvent(FILTER_FORM_ELEMENT_EVENT_CHANGE, {
                detail: {
                    name: input_element.name,
                    value: input_element.value
                }
            }));
        });
        add_input_container_element.append(add_input_element);
        form_element.append(add_input_container_element);

        filter_form_element.#shadow.append(form_element);

        if (inputs === null) {
            await filter_form_element.setInputs(
                inputs
            );
        }

        return filter_form_element;
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
            throw new Error(`Additional validation type ${type} already exists!`);
        }

        this.#additional_validation_types.set(type, validate_value);

        for (const input_element of this.#input_elements) {
            await input_element.addAdditionalValidationType(
                type,
                validate_value
            );
        }
    }

    /**
     * @returns {Input[]}
     */
    get inputs() {
        return this.#inputs.map((input, index) => this.#getInputElementByIndex(
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

        for (const input_element of this.#input_elements) {
            await input_element.setDisabled(
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
        this.#input_elements.forEach(input_element => {
            input_element.remove();
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
        for (const input_element of this.#input_elements) {
            if (!await input_element.validate(
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
        return this.#input_elements.map(input_element => ({
            name: input_element.name,
            value: input_element.value
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
     * @returns {Promise<InputElement | null>}
     */
    async #addInput(input, update_add_inputs = null) {
        const index = this.#inputs.indexOf(input);

        if (index === -1) {
            return null;
        }

        const exists_input_element = this.#getInputElementByIndex(
            index
        );

        if (exists_input_element !== null) {
            return exists_input_element;
        }

        const add_input_element = this.#add_input_element;

        const container_element = document.createElement("div");
        container_element.classList.add("container");

        const {
            INPUT_ELEMENT_EVENT_CHANGE,
            INPUT_ELEMENT_EVENT_INPUT,
            InputElement
        } = await import("./InputElement.mjs");

        const input_element = await InputElement.new(
            input,
            this.#style_sheet_manager
        );
        if (add_input_element.disabled) {
            await input_element.setDisabled(
                true
            );
        }
        input_element.dataset.input = index;
        input_element.addEventListener(INPUT_ELEMENT_EVENT_CHANGE, e => {
            this.dispatchEvent(new CustomEvent(FILTER_FORM_ELEMENT_EVENT_CHANGE, {
                detail: {
                    name: input_element.name,
                    value: e.detail.value
                }
            }));
        });
        input_element.addEventListener(INPUT_ELEMENT_EVENT_INPUT, e => {
            this.dispatchEvent(new CustomEvent(FILTER_FORM_ELEMENT_EVENT_INPUT, {
                detail: {
                    name: input_element.name,
                    value: e.detail.value
                }
            }));
        });

        for (const [
            type,
            validate_value
        ] of this.#additional_validation_types) {
            await input_element.addAdditionalValidationType(
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

            this.dispatchEvent(new CustomEvent(FILTER_FORM_ELEMENT_EVENT_INPUT, {
                detail: {
                    name: input_element.name
                }
            }));
            this.dispatchEvent(new CustomEvent(FILTER_FORM_ELEMENT_EVENT_CHANGE, {
                detail: {
                    name: input_element.name
                }
            }));
        });
        container_element.append(remove_button_element);

        container_element.append(input_element);

        this.#form_element.lastElementChild.before(container_element);

        if (update_add_inputs ?? true) {
            this.#updateAddInputs();
        }

        return input_element;
    }

    /**
     * @returns {HTMLFormElement}
     */
    get #form_element() {
        return this.#shadow.querySelector("form");
    }

    /**
     * @param {number} index
     * @returns {InputElement | null}
     */
    #getInputElementByIndex(index) {
        return this.#input_elements.find(input_element => input_element.dataset.input === `${index}`) ?? null;
    }

    /**
     * @returns {InputElement[]}
     */
    get #input_elements() {
        return Array.from(this.#form_element.querySelectorAll("[data-input]"));
    }

    /**
     * @returns {Input[]}
     */
    get #not_added_inputs() {
        return this.#inputs.filter((
            input,
            index
        ) => this.#getInputElementByIndex(
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

        const input_element = this.#getInputElementByIndex(
            index
        );

        if (input_element === null) {
            return;
        }

        input_element.parentElement.remove();

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

export const FILTER_FORM_ELEMENT_TAG_NAME = "filter-form";

customElements.define(FILTER_FORM_ELEMENT_TAG_NAME, FilterFormElement);
