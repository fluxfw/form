import { ADDITIONAL_VALIDATION_TYPE_REGULAR_EXPRESSION } from "./ADDITIONAL_VALIDATION_TYPE.mjs";
import { flux_css_api } from "../../flux-css-api/src/FluxCssApi.mjs";
import { FLUX_FORM_EVENT_CHANGE, FLUX_FORM_EVENT_INPUT } from "./FLUX_FORM_EVENT.mjs";
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

export class FluxFormElement extends HTMLElement {
    /**
     * @type {WeakMap<InputElement, string>}
     */
    #additional_validation_types;
    /**
     * @type {boolean}
     */
    #has_custom_validation_messages;
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

        this.#additional_validation_types = new WeakMap();
        this.#has_custom_validation_messages = false;

        this.#shadow = this.attachShadow({
            mode: "closed"
        });

        flux_css_api.adopt(
            this.#shadow,
            css
        );

        const form_element = document.createElement("form");
        form_element.addEventListener("input", () => {
            this.#removeCustomValidationMessages();
        });
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
     * @param {string} name
     * @returns {Input | null}
     */
    getInputByName(name) {
        const input_element = this.#getInputElementByName(
            name
        );

        if (input_element === null) {
            return null;
        }

        return this.#getInputFromInputElement(
            input_element
        );
    }

    /**
     * @param {string} name
     * @returns {InputValue | null}
     */
    getValueByName(name) {
        const input_element = this.#getInputElementByName(
            name
        );

        if (input_element === null) {
            return null;
        }

        return this.#getInputValueFromInputElement(
            input_element
        );
    }

    /**
     * @returns {Input[]}
     */
    get inputs() {
        return this.#input_elements.map(input_element => this.#getInputFromInputElement(
            input_element
        ));
    }

    /**
     * @param {Input[]} inputs
     * @returns {void}
     */
    set inputs(inputs) {
        this.#input_elements.forEach(input_element => {
            input_element.parentElement.remove();
            this.#additional_validation_types.delete(input_element);
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

            const additional_validation_type = input["additional-validation-type"] ?? "";
            if (additional_validation_type !== "") {
                this.#additional_validation_types.set(input_element, additional_validation_type);
            }

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
                const options = [
                    ...!input_element.multiple ? [
                        {
                            label: "--",
                            value: ""
                        }
                    ] : [],
                    ...input.options ?? []
                ];

                for (const option of options) {
                    const option_element = document.createElement("option");

                    option_element.disabled = option.disabled ?? false;

                    const title = option.title ?? "";
                    if (title !== "") {
                        option_element.title = title;
                    }

                    option_element.text = option.label;

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

            input_element.addEventListener("change", () => {
                this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_CHANGE, {
                    detail: this.#getInputValueFromInputElement(
                        input_element
                    )
                }));
            });

            input_element.addEventListener("input", () => {
                if (this.#isInputElementMultipleSelect(
                    input_element
                )) {
                    this.#updateMultipleSelectClearButton(
                        input_element
                    );
                }

                this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_INPUT, {
                    detail: this.#getInputValueFromInputElement(
                        input_element
                    )
                }));
            });

            container_element.appendChild(input_element);

            if (this.#isInputElementMultipleSelect(
                input_element
            )) {
                const clear_button = document.createElement("button");
                clear_button.innerText = "X";
                clear_button.type = "button";
                clear_button.addEventListener("click", () => {
                    this.#setValueToInputElement(
                        input_element
                    );
                });
                container_element.appendChild(clear_button);
            }

            this.#setValueToInputElement(
                input_element,
                input.value ?? null
            );

            const subtitle_element = document.createElement("div");
            subtitle_element.classList.add("subtitle");
            subtitle_element.innerText = input.subtitle ?? "";
            container_element.appendChild(subtitle_element);

            this.#form_element.appendChild(container_element);
        }
    }

    /**
     * @returns {Input[]}
     */
    get inputs_with_name() {
        return this.#input_elements_with_name.map(input_element => this.#getInputFromInputElement(
            input_element
        ));
    }

    /**
     * @param {boolean | null} report
     * @returns {boolean}
     */
    validate(report = null) {
        this.#removeCustomValidationMessages();

        if (!this.#form_element.checkValidity()) {
            if (report ?? true) {
                this.#form_element.reportValidity();
            }

            return false;
        }

        for (const input_element of this.#input_elements) {
            if (!this.#additional_validation_types.has(input_element)) {
                continue;
            }

            const additional_validation_type = this.#additional_validation_types.get(input_element) ?? "";

            if (additional_validation_type === "") {
                continue;
            }

            const value = this.#getValueFromInputElement(
                input_element
            );

            switch (additional_validation_type) {
                case ADDITIONAL_VALIDATION_TYPE_REGULAR_EXPRESSION:
                    if (this.#getTypeFromInputElement(
                        input_element
                    ) !== INPUT_TYPE_TEXT) {
                        continue;
                    }

                    if ((value ?? "") === "") {
                        continue;
                    }

                    try {
                        new RegExp(value);
                    } catch (error) {
                        this.#setCustomValidationMessage(
                            input_element,
                            "Invalid regular expression!"
                        );
                        return false;
                    }
                    break;

                default:
                    break;
            }
        }

        return true;
    }

    /**
     * @returns {InputValue[]}
     */
    get values() {
        return this.#input_elements_with_name.map(input_element => this.#getInputValueFromInputElement(
            input_element
        ));
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
     * @param {string} name
     * @returns {InputElement | null}
     */
    #getInputElementByName(name) {
        return this.#input_elements_with_name.find(input_element => input_element.name === name) ?? null;
    }

    /**
     * @param {InputElement} input_element
     * @returns {Input}
     */
    #getInputFromInputElement(input_element) {
        return {
            "additional-validation-type": this.#additional_validation_types.get(input_element) ?? "",
            disabled: input_element.disabled,
            "input-mode": input_element.inputMode ?? "",
            label: input_element.parentElement.querySelector(".label").innerText,
            max: input_element.max ?? "",
            "max-length": input_element.maxLength ?? -1,
            min: input_element.min ?? "",
            "min-length": input_element.minLength ?? -1,
            multiple: input_element.multiple ?? false,
            name: input_element.name,
            options: Array.from(input_element.querySelectorAll("option")).filter(option_element => input_element.multiple || option_element.value !== "").map(option_element => ({
                disabled: option_element.disabled,
                label: option_element.text,
                title: option_element.title,
                value: option_element.value
            })),
            pattern: input_element.pattern ?? "",
            placeholder: input_element.placeholder ?? "",
            "read-only": input_element.readOnly ?? false,
            required: input_element.required,
            step: input_element.step ?? "",
            subtitle: input_element.parentElement.querySelector(".subtitle").innerText,
            title: input_element.title,
            type: this.#getTypeFromInputElement(
                input_element
            ),
            value: this.#getValueFromInputElement(
                input_element
            )
        };
    }

    /**
     * @param {InputElement} input_element
     * @returns {InputValue}
     */
    #getInputValueFromInputElement(input_element) {
        return {
            name: input_element.name,
            value: this.#getValueFromInputElement(
                input_element
            )
        };
    }

    /**
     * @param {InputElement} input_element
     * @returns {string}
     */
    #getTypeFromInputElement(input_element) {
        return input_element instanceof HTMLSelectElement ? INPUT_TYPE_SELECT : input_element.type;
    }

    /**
     * @param {InputElement} input_element
     * @returns {Value}
     */
    #getValueFromInputElement(input_element) {
        const type = this.#getTypeFromInputElement(
            input_element
        );

        switch (true) {
            case type === INPUT_TYPE_CHECKBOX:
                return input_element.checked;

            case type === INPUT_TYPE_NUMBER:
                return !Number.isNaN(input_element.valueAsNumber) ? input_element.valueAsNumber : null;

            case this.#isInputElementMultipleSelect(
                input_element
            ):
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
     * @returns {boolean}
     */
    #isInputElementMultipleSelect(input_element) {
        return this.#getTypeFromInputElement(
            input_element
        ) === INPUT_TYPE_SELECT && input_element.multiple;
    }

    /**
     * @returns {void}
     */
    #removeCustomValidationMessages() {
        if (!this.#has_custom_validation_messages) {
            return;
        }

        this.#has_custom_validation_messages = false;

        for (const input_element of this.#input_elements_with_name) {
            input_element.setCustomValidity("");
        }
    }

    /**
     * @param {InputElement} input_element
     * @param {string} message
     * @returns {void}
     */
    #setCustomValidationMessage(input_element, message) {
        this.#has_custom_validation_messages = true;

        input_element.setCustomValidity(message);
        input_element.reportValidity();
    }

    /**
     * @param {InputElement} input_element
     * @param {Value} value
     * @returns {void}
     */
    #setValueToInputElement(input_element, value = null) {
        const type = this.#getTypeFromInputElement(
            input_element
        );

        switch (true) {
            case type === INPUT_TYPE_CHECKBOX:
                input_element.checked = value ?? false;
                break;

            case type === INPUT_TYPE_NUMBER:
                input_element.valueAsNumber = value !== null ? value : NaN;
                break;

            case this.#isInputElementMultipleSelect(
                input_element
            ): {
                    const _value = value ?? [];
                    for (const option_element of input_element.querySelectorAll("option")) {
                        option_element.selected = _value.includes(option_element.value);
                    }
                    this.#updateMultipleSelectClearButton(
                        input_element
                    );
                }
                break;

            default:
                input_element.value = value ?? "";
                break;
        }
    }

    /**
     * @param {HTMLSelectElement} input_element
     * @returns {void}
     */
    #updateMultipleSelectClearButton(input_element) {
        input_element.nextElementSibling.disabled = this.#getValueFromInputElement(
            input_element
        ).length === 0;
    }
}

export const FLUX_FORM_ELEMENT_TAG_NAME = "flux-form";

customElements.define(FLUX_FORM_ELEMENT_TAG_NAME, FluxFormElement);
