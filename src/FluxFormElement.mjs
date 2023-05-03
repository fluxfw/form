import { flux_css_api } from "../../flux-css-api/src/FluxCssApi.mjs";
import { INPUT_TYPE_CHECKBOX, INPUT_TYPE_NUMBER, INPUT_TYPE_SELECT, INPUT_TYPE_TEXT, INPUT_TYPE_TEXTAREA } from "./INPUT_TYPE.mjs";

/** @typedef {import("./Input.mjs").Input} Input */
/** @typedef {import("./InputElement.mjs").InputElement} InputElement */
/** @typedef {import("./InputValue.mjs").InputValue} InputValue */
/** @typedef {import("./Value.mjs").Value} Value */

flux_css_api.adopt(
    document,
    await flux_css_api.import(
        `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxFormElementVariables.css`
    ),
    true
);

const css = await flux_css_api.import(
    `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxFormElement.css`
);

export const FLUX_FORM_CHANGE_EVENT = "flux-form-change";
export const FLUX_FORM_INPUT_EVENT = "flux-form-input";

export class FluxFormElement extends HTMLElement {
    /**
     * @type {ShadowRoot}
     */
    #shadow;

    /**
     * @param {Input[] | null} inputs
     * @returns {FluxFormElement}
     */
    static new(inputs = null) {
        return new this(
            inputs ?? []
        );
    }

    /**
     * @param {Input[]} inputs
     * @private
     */
    constructor(inputs) {
        super();

        this.#shadow = this.attachShadow({
            mode: "closed"
        });

        flux_css_api.adopt(
            this.#shadow,
            css
        );

        const form_element = document.createElement("form");
        form_element.addEventListener("submit", e => {
            e.preventDefault();
        });
        this.#shadow.appendChild(form_element);

        this.inputs = inputs;
    }

    /**
     * @returns {string[]}
     */
    get disabled() {
        return this.#input_elements_with_name.filter(input_element => input_element.disabled).map(input_element => input_element.name);
    }

    /**
     * @param {string[] | boolean} values
     * @returns {void}
     */
    set disabled(values) {
        for (const input_element of this.#input_elements_with_name) {
            input_element.disabled = typeof values === "boolean" ? values : values.includes(input_element.name);
        }
    }

    /**
     * @returns {Input[]}
     */
    get inputs() {
        return this.#input_elements.map(input_element => ({
            disabled: input_element.disabled,
            "input-mode": input_element.inputMode ?? "",
            label: input_element.previousElementSibling.innerText,
            max: input_element.max ?? "",
            "max-length": input_element.maxLength ?? -1,
            min: input_element.min ?? "",
            "min-length": input_element.minLength ?? -1,
            multiple: input_element.multiple ?? false,
            name: input_element.name,
            options: Array.from(input_element.querySelectorAll("option")).map(option_element => ({
                disabled: option_element.disabled,
                label: option_element.label,
                title: option_element.title,
                value: option_element.value
            })),
            pattern: input_element.pattern ?? "",
            placeholder: input_element.placeholder ?? "",
            "read-only": input_element.readOnly ?? false,
            required: input_element.required,
            step: input_element.step ?? "",
            subtitle: input_element.nextElementSibling.innerText,
            title: input_element.title,
            type: input_element instanceof HTMLSelectElement ? INPUT_TYPE_SELECT : input_element.type,
            value: this.#getValueFromInputElement(
                input_element
            )
        }));
    }

    /**
     * @param {Input[]} inputs
     * @returns {void}
     */
    set inputs(inputs) {
        this.#input_elements.forEach(input_element => {
            input_element.parentElement.remove();
        });

        for (const input of inputs) {
            const container_element = document.createElement("label");

            const label_element = document.createElement("div");
            label_element.classList.add("label");
            label_element.innerText = input.label ?? "";
            container_element.appendChild(label_element);

            const type = input.type ?? INPUT_TYPE_TEXT;

            const input_element = document.createElement(type === INPUT_TYPE_SELECT || type === INPUT_TYPE_TEXTAREA ? type : "input");

            input_element.disabled = input.disabled ?? false;

            const input_mode = input["input-mode"] ?? "";
            if (input_mode !== "" && "inputMode" in input_element) {
                input_element.inputMode = input_mode;
            }

            const max = input.max ?? "";
            if (max !== "" && "max" in input_element) {
                input_element.max = max;
            }

            const max_length = input["max-length"] ?? -1;
            if (max_length !== -1 && "maxLength" in input_element) {
                input_element.maxLength = max_length;
            }

            const min = input.min ?? "";
            if (min !== "" && "min" in input_element) {
                input_element.min = min;
            }

            const min_length = input["min-length"] ?? -1;
            if (min_length !== -1 && "minLength" in input_element) {
                input_element.minLength = min_length;
            }

            if ("multiple" in input_element) {
                input_element.multiple = input.multiple ?? false;
            }

            const name = input.name ?? "";
            if (name !== "") {
                input_element.name = name;
            }

            if (type === INPUT_TYPE_SELECT) {
                const options = input.options ?? [];

                for (const option of options) {
                    const option_element = document.createElement("option");

                    option_element.disabled = option.disabled ?? false;

                    option_element.label = option.label;

                    const title = option.title ?? "";
                    if (title !== "") {
                        option_element.title = title;
                    }

                    option_element.value = option.value;

                    input_element.appendChild(option_element);
                }

                if (input_element.multiple) {
                    input_element.size = options.length;
                }
            }

            const pattern = input.pattern ?? "";
            if (pattern !== "" && "pattern" in input_element) {
                input_element.pattern = pattern;
            }

            const placeholder = input.placeholder ?? "";
            if (placeholder !== "" && "placeholder" in input_element) {
                input_element.placeholder = placeholder;
            }

            if ("readOnly" in input_element) {
                input_element.readOnly = input["read-only"] ?? false;
            }

            input_element.required = input.required ?? false;

            const step = input.step ?? "";
            if (step !== "" && "step" in input_element) {
                input_element.step = step;
            }

            const title = input.title ?? "";
            if (title !== "") {
                input_element.title = title;
            }

            if (input_element instanceof HTMLInputElement) {
                input_element.type = type;
            }

            this.#setValueToInputElement(
                input_element,
                input.value ?? null
            );

            input_element.addEventListener("change", () => {
                this.dispatchEvent(new CustomEvent(FLUX_FORM_CHANGE_EVENT, {
                    detail: {
                        name: input_element.name,
                        value: this.#getValueFromInputElement(
                            input_element
                        )
                    }
                }));
            });

            input_element.addEventListener("input", () => {
                this.dispatchEvent(new CustomEvent(FLUX_FORM_INPUT_EVENT, {
                    detail: {
                        name: input_element.name,
                        value: this.#getValueFromInputElement(
                            input_element
                        )
                    }
                }));
            });

            container_element.appendChild(input_element);

            const subtitle_element = document.createElement("div");
            subtitle_element.classList.add("subtitle");
            subtitle_element.innerText = input.subtitle ?? "";
            container_element.appendChild(subtitle_element);

            this.#form_element.appendChild(container_element);
        }
    }

    /**
     * @param {boolean | null} report
     * @returns {boolean}
     */
    validateInputs(report = null) {
        if (!this.#form_element.checkValidity()) {
            if (report ?? true) {
                this.#form_element.reportValidity();
            }

            return false;
        }

        return true;
    }

    /**
     * @returns {InputValue[]}
     */
    get values() {
        return this.#input_elements_with_name.map(input_element => ({
            name: input_element.name,
            value: this.#getValueFromInputElement(
                input_element
            )
        }));
    }

    /**
     * @param {InputValue[]} values
     * @returns {void}
     */
    set values(values) {
        for (const input_element of this.#input_elements_with_name) {
            const value = values.find(_value => _value.name === input_element.name) ?? null;

            if (value === null) {
                continue;
            }

            this.#setValueToInputElement(
                input_element,
                value.value
            );
        }
    }

    /**
     * @returns {HTMLFormElement}
     */
    get #form_element() {
        return this.#shadow.querySelector("form");
    }

    /**
     * @param {InputElement} input_element
     * @returns {Value}
     */
    #getValueFromInputElement(input_element) {
        switch (true) {
            case input_element.type === INPUT_TYPE_CHECKBOX:
                return input_element.checked;

            case input_element.type === INPUT_TYPE_NUMBER:
                return !Number.isNaN(input_element.valueAsNumber) ? input_element.valueAsNumber : null;

            case input_element instanceof HTMLSelectElement && input_element.multiple:
                return Array.from(input_element.querySelectorAll("option")).filter(option_element => option_element.selected).map(option_element => option_element.value);

            default:
                return input_element.value;
        }
    }

    /**
     * @returns {InputElement[]}
     */
    get #input_elements() {
        return Array.from(this.#form_element.elements);
    }

    /**
     * @returns {InputElement[]}
     */
    get #input_elements_with_name() {
        return this.#input_elements.filter(input_element => input_element.name !== "");
    }

    /**
     * @param {InputElement} input_element
     * @param {Value} value
     * @returns {void}
     */
    #setValueToInputElement(input_element, value = null) {
        switch (true) {
            case input_element.type === INPUT_TYPE_CHECKBOX:
                input_element.checked = value ?? false;
                break;

            case input_element.type === INPUT_TYPE_NUMBER:
                input_element.valueAsNumber = value !== null ? value : NaN;
                break;

            case input_element instanceof HTMLSelectElement && input_element.multiple: {
                const _value = value ?? [];
                for (const option_element of input_element.querySelectorAll("option")) {
                    option_element.selected = _value.includes(option_element.value);
                }
            }
                break;

            default:
                input_element.value = value ?? "";
                break;
        }
    }
}

export const FLUX_FORM_ELEMENT_TAG_NAME = "flux-form";

customElements.define(FLUX_FORM_ELEMENT_TAG_NAME, FluxFormElement);
