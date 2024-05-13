import css from "./FormElement.css" with { type: "css" };
import root_css from "./FormElementRoot.css" with { type: "css" };

/** @typedef {import("./Input.mjs").Input} Input */
/** @typedef {import("./InputElement.mjs").InputElement} InputElement */
/** @typedef {import("./InputValue.mjs").InputValue} InputValue */
/** @typedef {import("./StyleSheetManager/StyleSheetManager.mjs").StyleSheetManager} StyleSheetManager */
/** @typedef {import("./validateValue.mjs").validateValue} validateValue */

export const FORM_ELEMENT_EVENT_CHANGE = "form-change";

export const FORM_ELEMENT_EVENT_INPUT = "form-input";

export const FORM_ELEMENT_VARIABLE_PREFIX = "--form-";

export class FormElement extends HTMLElement {
    /**
     * @type {Map<string, validateValue>}
     */
    #additional_validation_types;
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
     * @returns {Promise<FormElement>}
     */
    static async new(inputs = null, style_sheet_manager = null) {
        if (style_sheet_manager !== null) {
            await style_sheet_manager.generateVariablesRootStyleSheet(
                FORM_ELEMENT_VARIABLE_PREFIX,
                {
                    [`${FORM_ELEMENT_VARIABLE_PREFIX}active-button-background-color`]: "foreground-color",
                    [`${FORM_ELEMENT_VARIABLE_PREFIX}active-button-foreground-color`]: "background-color",
                    [`${FORM_ELEMENT_VARIABLE_PREFIX}background-color`]: "background-color",
                    [`${FORM_ELEMENT_VARIABLE_PREFIX}button-background-color`]: "accent-color",
                    [`${FORM_ELEMENT_VARIABLE_PREFIX}button-focus-outline-color`]: "foreground-color",
                    [`${FORM_ELEMENT_VARIABLE_PREFIX}button-foreground-color`]: "accent-foreground-color",
                    [`${FORM_ELEMENT_VARIABLE_PREFIX}foreground-color`]: "foreground-color",
                    [`${FORM_ELEMENT_VARIABLE_PREFIX}input-border-color`]: "foreground-color",
                    [`${FORM_ELEMENT_VARIABLE_PREFIX}input-focus-outline-color`]: "foreground-color"
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

        const form_element = new this(
            style_sheet_manager
        );

        form_element.#shadow = form_element.attachShadow({
            mode: "closed"
        });

        await form_element.#style_sheet_manager?.addStyleSheetsToShadow(
            form_element.#shadow
        );

        form_element.#shadow.adoptedStyleSheets.push(css);

        const _form_element = document.createElement("form");
        _form_element.addEventListener("submit", e => {
            e.preventDefault();
        });
        form_element.#shadow.append(_form_element);

        if (inputs !== null) {
            await form_element.setInputs(
                inputs
            );
        }

        return form_element;
    }

    /**
     * @param {StyleSheetManager | null} style_sheet_manager
     * @private
     */
    constructor(style_sheet_manager) {
        super();

        this.#style_sheet_manager = style_sheet_manager;
        this.#additional_validation_types = new Map();
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
        return this.#input_elements.map(input_element => input_element.input);
    }

    /**
     * @param {boolean} disabled
     * @returns {Promise<void>}
     */
    async setDisabled(disabled) {
        for (const input_element of this.#input_elements) {
            await input_element.setDisabled(
                disabled
            );
        }
    }

    /**
     * @param {Input[]} inputs
     * @returns {Promise<void>}
     */
    async setInputs(inputs) {
        this.#input_elements.forEach(input_element => {
            input_element.remove();
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
        for (const input_element of this.#input_elements) {
            await input_element.setValue(
                values?.find(_value => _value.name === input_element.name)?.value ?? null
            );
        }
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
     * @param {Input} input
     * @returns {Promise<void>}
     */
    async #addInput(input) {
        const {
            INPUT_ELEMENT_EVENT_CHANGE,
            INPUT_ELEMENT_EVENT_INPUT,
            InputElement
        } = await import("./InputElement.mjs");

        const input_element = await InputElement.new(
            input,
            this.#style_sheet_manager
        );
        input_element.dataset.input = true;
        input_element.addEventListener(INPUT_ELEMENT_EVENT_CHANGE, e => {
            this.dispatchEvent(new CustomEvent(FORM_ELEMENT_EVENT_CHANGE, {
                detail: {
                    name: input_element.name,
                    value: e.detail.value
                }
            }));
        });
        input_element.addEventListener(INPUT_ELEMENT_EVENT_INPUT, e => {
            this.dispatchEvent(new CustomEvent(FORM_ELEMENT_EVENT_INPUT, {
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

        this.#form_element.append(input_element);
    }

    /**
     * @returns {HTMLFormElement}
     */
    get #form_element() {
        return this.#shadow.querySelector("form");
    }

    /**
     * @returns {InputElement[]}
     */
    get #input_elements() {
        return Array.from(this.#form_element.querySelectorAll("[data-input]"));
    }
}

export const FORM_ELEMENT_TAG_NAME = "form-form";

customElements.define(FORM_ELEMENT_TAG_NAME, FormElement);
