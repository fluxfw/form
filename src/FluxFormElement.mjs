import { flux_import_css } from "../../flux-style-sheet-manager/src/FluxImportCss.mjs";

/** @typedef {import("./FluxInputElement.mjs").FluxInputElement} FluxInputElement */
/** @typedef {import("./Input.mjs").Input} Input */
/** @typedef {import("./InputValue.mjs").InputValue} InputValue */
/** @typedef {import("./StyleSheetManager/StyleSheetManager.mjs").StyleSheetManager} StyleSheetManager */
/** @typedef {import("./validateValue.mjs").validateValue} validateValue */

const root_css = await flux_import_css.import(
    `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxFormElementRoot.css`
);

const css = await flux_import_css.import(
    `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxFormElement.css`
);

export const FLUX_FORM_ELEMENT_EVENT_CHANGE = "flux-form-change";

export const FLUX_FORM_ELEMENT_EVENT_INPUT = "flux-form-input";

export const FLUX_FORM_ELEMENT_VARIABLE_PREFIX = "--flux-form-";

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
     * @type {StyleSheetManager | null}
     */
    #style_sheet_manager;

    /**
     * @param {Input[] | null} inputs
     * @param {StyleSheetManager | null} style_sheet_manager
     * @returns {Promise<FluxFormElement>}
     */
    static async new(inputs = null, style_sheet_manager = null) {
        if (style_sheet_manager !== null) {
            await style_sheet_manager.generateVariablesRootStyleSheet(
                this.name,
                {
                    [`${FLUX_FORM_ELEMENT_VARIABLE_PREFIX}active-button-background-color`]: "foreground-color",
                    [`${FLUX_FORM_ELEMENT_VARIABLE_PREFIX}active-button-foreground-color`]: "background-color",
                    [`${FLUX_FORM_ELEMENT_VARIABLE_PREFIX}background-color`]: "background-color",
                    [`${FLUX_FORM_ELEMENT_VARIABLE_PREFIX}button-background-color`]: "accent-color",
                    [`${FLUX_FORM_ELEMENT_VARIABLE_PREFIX}button-focus-outline-color`]: "foreground-color",
                    [`${FLUX_FORM_ELEMENT_VARIABLE_PREFIX}button-foreground-color`]: "accent-color-foreground-color",
                    [`${FLUX_FORM_ELEMENT_VARIABLE_PREFIX}foreground-color`]: "foreground-color",
                    [`${FLUX_FORM_ELEMENT_VARIABLE_PREFIX}input-background-color`]: "background-color",
                    [`${FLUX_FORM_ELEMENT_VARIABLE_PREFIX}input-border-color`]: "foreground-color",
                    [`${FLUX_FORM_ELEMENT_VARIABLE_PREFIX}input-focus-outline-color`]: "foreground-color",
                    [`${FLUX_FORM_ELEMENT_VARIABLE_PREFIX}input-foreground-color`]: "foreground-color"
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

        const flux_form_element = new this(
            style_sheet_manager
        );

        flux_form_element.#shadow = flux_form_element.attachShadow({
            mode: "closed"
        });

        await flux_form_element.#style_sheet_manager?.addStyleSheetsToShadow(
            flux_form_element.#shadow
        );

        flux_form_element.#shadow.adoptedStyleSheets.push(css);

        const form_element = document.createElement("form");
        form_element.addEventListener("submit", e => {
            e.preventDefault();
        });
        flux_form_element.#shadow.append(form_element);

        if (inputs !== null) {
            await flux_form_element.setInputs(
                inputs
            );
        }

        return flux_form_element;
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
        const {
            FLUX_INPUT_ELEMENT_EVENT_CHANGE,
            FLUX_INPUT_ELEMENT_EVENT_INPUT,
            FluxInputElement
        } = await import("./FluxInputElement.mjs");

        const flux_input_element = await FluxInputElement.new(
            input,
            this.#style_sheet_manager
        );
        flux_input_element.dataset.input = true;
        flux_input_element.addEventListener(FLUX_INPUT_ELEMENT_EVENT_CHANGE, e => {
            this.dispatchEvent(new CustomEvent(FLUX_FORM_ELEMENT_EVENT_CHANGE, {
                detail: {
                    name: flux_input_element.name,
                    value: e.detail.value
                }
            }));
        });
        flux_input_element.addEventListener(FLUX_INPUT_ELEMENT_EVENT_INPUT, e => {
            this.dispatchEvent(new CustomEvent(FLUX_FORM_ELEMENT_EVENT_INPUT, {
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

        this.#form_element.append(flux_input_element);
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
