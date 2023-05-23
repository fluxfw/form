import { ADDITIONAL_VALIDATION_TYPE_REGULAR_EXPRESSION } from "./ADDITIONAL_VALIDATION_TYPE.mjs";
import { flux_css_api } from "../../flux-css-api/src/FluxCssApi.mjs";
import { FLUX_FORM_EVENT_CHANGE, FLUX_FORM_EVENT_INPUT } from "./FLUX_FORM_EVENT.mjs";
import { INPUT_TYPE_CHECKBOX, INPUT_TYPE_COLOR, INPUT_TYPE_ENTRIES, INPUT_TYPE_HIDDEN, INPUT_TYPE_NUMBER, INPUT_TYPE_SELECT, INPUT_TYPE_TEXT, INPUT_TYPE_TEXTAREA } from "./INPUT_TYPE.mjs";

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

export const FLUX_FORM_ELEMENT_TAG_NAME = "flux-form";

export class FluxFormElement extends HTMLElement {
    /**
     * @type {WeakMap<InputElement, string>}
     */
    #additional_validation_types;
    /**
     * @type {WeakMap<InputElement, Input[]>}
     */
    #entries_types;
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
        this.#entries_types = new WeakMap();
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
            const disabled = typeof values === "boolean" ? values : values.includes(input_element.name);

            input_element.disabled = disabled;

            this.#getContainerElement(
                input_element
            ).querySelectorAll(`button, ${FLUX_FORM_ELEMENT_TAG_NAME}`).forEach(element => {
                element.disabled = disabled;
            });

            this.#updateClearButton(
                input_element
            );

            this.#updateEntries(
                input_element
            );

            this.#updateSetCheckbox(
                input_element
            );
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
            this.#getContainerElement(
                input_element
            ).remove();

            this.#additional_validation_types.delete(input_element);
            this.#entries_types.delete(input_element);
        });

        for (const input of inputs) {
            const container_element = document.createElement("div");
            container_element.classList.add("container");

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

            if (type === INPUT_TYPE_ENTRIES) {
                input_element.type = INPUT_TYPE_HIDDEN;

                const _min_length = Math.max(input_element.minLength, input_element.required ? 1 : -1);

                const entries_element = document.createElement("div");
                entries_element.dataset.entries = true;
                container_element.appendChild(entries_element);

                if (_min_length === -1 || input_element.maxLength === -1 || _min_length !== input_element.maxLength) {
                    const add_entry_button_element = document.createElement("button");
                    add_entry_button_element.dataset.add_entry_button = true;
                    add_entry_button_element.innerText = "+";
                    add_entry_button_element.type = "button";
                    add_entry_button_element.addEventListener("click", () => {
                        this.#addEntry(
                            input_element
                        );

                        const input_value = this.#getInputValueFromInputElement(
                            input_element
                        );
                        this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_INPUT, {
                            detail: input_value
                        }));
                        this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_CHANGE, {
                            detail: input_value
                        }));
                    });
                    container_element.appendChild(add_entry_button_element);
                }

                this.#entries_types.set(input_element, structuredClone(input.entries) ?? []);
            } else {
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
                    this.#updateClearButton(
                        input_element
                    );

                    this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_INPUT, {
                        detail: this.#getInputValueFromInputElement(
                            input_element
                        )
                    }));
                });
            }

            container_element.appendChild(input_element);

            if (type === INPUT_TYPE_COLOR) {
                const set_container_element = document.createElement("div");
                set_container_element.classList.add("inline_container");

                const set_input_element = document.createElement("input");
                set_input_element.dataset.set_checkbox = true;
                set_input_element.required = input_element.required;
                set_input_element.type = INPUT_TYPE_CHECKBOX;
                set_input_element.addEventListener("input", () => {
                    this.#updateSetCheckbox(
                        input_element
                    );
                });
                set_container_element.appendChild(set_input_element);

                set_container_element.appendChild(input_element);

                container_element.appendChild(set_container_element);
            }

            if (type === INPUT_TYPE_SELECT && input_element.multiple) {
                const clear_container_element = document.createElement("div");
                clear_container_element.classList.add("inline_container");

                clear_container_element.appendChild(input_element);

                const clear_button_element = document.createElement("button");
                clear_button_element.dataset.clear_button = true;
                clear_button_element.innerText = "X";
                clear_button_element.type = "button";
                clear_button_element.addEventListener("click", () => {
                    this.#setValueToInputElement(
                        input_element
                    );
                });
                clear_container_element.appendChild(clear_button_element);

                container_element.appendChild(clear_container_element);
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
            const type = this.#getTypeFromInputElement(
                input_element
            );
            const value = this.#getValueFromInputElement(
                input_element
            );

            if (type === INPUT_TYPE_ENTRIES) {
                const container_element = this.#getContainerElement(
                    input_element
                );

                if (Array.from(container_element.querySelectorAll(FLUX_FORM_ELEMENT_TAG_NAME)).some(flux_form_element => !flux_form_element.validate())) {
                    return false;
                }

                const entry_elements_length = container_element.querySelectorAll("[data-entry]").length;
                if ((input_element.required && entry_elements_length === 0) || (input_element.minLength !== -1 && entry_elements_length < input_element.minLength) || (input_element.maxLength !== -1 && entry_elements_length > input_element.maxLength)) {
                    return false;
                }
            }

            if (this.#additional_validation_types.has(input_element)) {
                const additional_validation_type = this.#additional_validation_types.get(input_element) ?? "";
                if (additional_validation_type !== "") {
                    switch (additional_validation_type) {
                        case ADDITIONAL_VALIDATION_TYPE_REGULAR_EXPRESSION:
                            if (type !== INPUT_TYPE_TEXT) {
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
     * @param {InputElement} input_element
     * @param {InputValue[] | null} values
     * @param {boolean | null} update_entries
     * @returns {void}
     */
    #addEntry(input_element, values = null, update_entries = null) {
        const container_element = this.#getContainerElement(
            input_element
        );

        if (input_element.maxLength !== -1 && container_element.querySelectorAll("[data-entry]").length >= input_element.maxLength) {
            return;
        }

        const min_length = Math.max(input_element.minLength, input_element.required ? 1 : -1);

        const entry_element = document.createElement("div");
        entry_element.classList.add("inline_container");
        entry_element.dataset.entry = true;

        if (input_element.maxLength === -1 || input_element.maxLength > 1) {
            const move_entry_up_button_element = document.createElement("button");
            move_entry_up_button_element.dataset.move_entry_up_button = true;
            move_entry_up_button_element.innerText = "/\\";
            move_entry_up_button_element.type = "button";
            move_entry_up_button_element.addEventListener("click", () => {
                entry_element.previousElementSibling?.before(entry_element);

                this.#updateEntries(
                    input_element
                );

                const input_value = this.#getInputValueFromInputElement(
                    input_element
                );
                this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_INPUT, {
                    detail: input_value
                }));
                this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_CHANGE, {
                    detail: input_value
                }));
            });
            entry_element.appendChild(move_entry_up_button_element);

            const move_entry_down_button_element = document.createElement("button");
            move_entry_down_button_element.dataset.move_entry_down_button = true;
            move_entry_down_button_element.innerText = "\\/";
            move_entry_down_button_element.type = "button";
            move_entry_down_button_element.addEventListener("click", () => {
                entry_element.nextElementSibling?.after(entry_element);

                this.#updateEntries(
                    input_element
                );

                const input_value = this.#getInputValueFromInputElement(
                    input_element
                );
                this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_INPUT, {
                    detail: input_value
                }));
                this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_CHANGE, {
                    detail: input_value
                }));
            });
            entry_element.appendChild(move_entry_down_button_element);
        }

        if (min_length === -1 || input_element.maxLength === -1 || min_length !== input_element.maxLength) {
            const remove_button_element = document.createElement("button");
            remove_button_element.dataset.remove_entry_button = true;
            remove_button_element.innerText = "X";
            remove_button_element.type = "button";
            remove_button_element.addEventListener("click", e => {
                e.preventDefault();

                entry_element.remove();

                this.#updateEntries(
                    input_element
                );

                const input_value = this.#getInputValueFromInputElement(
                    input_element
                );
                this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_INPUT, {
                    detail: input_value
                }));
                this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_CHANGE, {
                    detail: input_value
                }));
            });
            entry_element.appendChild(remove_button_element);
        }

        const flux_form_element = this.constructor.new(
            this.#entries_types.get(input_element) ?? []
        );
        flux_form_element.addEventListener(FLUX_FORM_EVENT_CHANGE, () => {
            this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_CHANGE, {
                detail: this.#getValueFromInputElement(
                    input_element
                )
            }));
        });
        flux_form_element.addEventListener(FLUX_FORM_EVENT_INPUT, () => {
            this.dispatchEvent(new CustomEvent(FLUX_FORM_EVENT_INPUT, {
                detail: this.#getValueFromInputElement(
                    input_element
                )
            }));
        });
        entry_element.appendChild(flux_form_element);

        container_element.querySelector("[data-entries]").appendChild(entry_element);

        flux_form_element.disabled = input_element.disabled;
        if (values !== null) {
            flux_form_element.values = values;
        }

        if (update_entries ?? true) {
            this.#updateEntries(
                input_element
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
     * @returns {HTMLDivElement}
     */
    #getContainerElement(input_element) {
        let parent_element = input_element;

        do {
            parent_element = parent_element.parentElement;
        } while (!parent_element.classList.contains("container"));

        return parent_element;
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
        const container_element = this.#getContainerElement(
            input_element
        );

        return {
            "additional-validation-type": this.#additional_validation_types.get(input_element) ?? "",
            disabled: input_element.disabled,
            entries: structuredClone(this.#entries_types.get(input_element)) ?? [],
            "input-mode": input_element.inputMode ?? "",
            label: container_element.querySelector(".label").innerText,
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
            subtitle: container_element.querySelector(".subtitle").innerText,
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
        switch (true) {
            case this.#entries_types.has(input_element):
                return INPUT_TYPE_ENTRIES;

            case input_element instanceof HTMLSelectElement:
                return INPUT_TYPE_SELECT;

            default:
                return input_element.type;
        }
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

            case type === INPUT_TYPE_COLOR:
                return this.#getContainerElement(
                    input_element
                ).querySelector("[data-set_checkbox]").checked ? input_element.value : "";

            case type === INPUT_TYPE_ENTRIES:
                return Array.from(this.#getContainerElement(
                    input_element
                ).querySelectorAll(FLUX_FORM_ELEMENT_TAG_NAME)).map(flux_form_element => flux_form_element.values);

            case type === INPUT_TYPE_NUMBER:
                return !Number.isNaN(input_element.valueAsNumber) ? input_element.valueAsNumber : null;

            case type === INPUT_TYPE_SELECT && input_element.multiple:
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

            case type === INPUT_TYPE_COLOR: {
                const _value = value ?? "";

                this.#getContainerElement(
                    input_element
                ).querySelector("[data-set_checkbox]").checked = _value !== "";

                input_element.value = _value;

                this.#updateSetCheckbox(
                    input_element
                );
            }
                break;

            case type === INPUT_TYPE_ENTRIES:
                Array.from(this.#getContainerElement(
                    input_element
                ).querySelectorAll("[data-entry]")).forEach(entry_element => {
                    entry_element.remove();
                });

                for (const _value of value ?? []) {
                    this.#addEntry(
                        input_element,
                        _value,
                        false
                    );
                }

                this.#updateEntries(
                    input_element
                );
                break;

            case type === INPUT_TYPE_NUMBER:
                input_element.valueAsNumber = value !== null ? value : NaN;
                break;

            case type === INPUT_TYPE_SELECT && input_element.multiple: {
                const values = value ?? [];

                for (const option_element of input_element.querySelectorAll("option")) {
                    option_element.selected = values.includes(option_element.value);
                }

                this.#updateClearButton(
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
     * @param {InputElement} input_element
     * @returns {void}
     */
    #updateClearButton(input_element) {
        const clear_button_element = this.#getContainerElement(
            input_element
        ).querySelector("[data-clear_button]");

        if (clear_button_element === null) {
            return;
        }

        const value = this.#getValueFromInputElement(
            input_element
        );

        clear_button_element.disabled = input_element.disabled || value === null || value === "" || value === false || value.length === 0;
    }

    /**
     * @param {InputElement} input_element
     * @returns {void}
     */
    #updateEntries(input_element) {
        const container_element = this.#getContainerElement(
            input_element
        );

        if (container_element.querySelector("[data-entries]") === null) {
            return;
        }

        const min_length = Math.max(input_element.minLength, input_element.required ? 1 : -1);

        const entry_elements_length = container_element.querySelectorAll("[data-entry]").length;
        if (min_length !== -1 && entry_elements_length < min_length) {
            for (let i = entry_elements_length; i < min_length; i++) {
                this.#addEntry(
                    input_element,
                    null,
                    false
                );
            }
        }

        const entry_elements = container_element.querySelectorAll("[data-entry]");

        const add_entry_button_element = container_element.querySelector("[data-add_entry_button]");
        if (add_entry_button_element !== null) {
            add_entry_button_element.disabled = input_element.disabled || (input_element.maxLength !== -1 && entry_elements.length >= input_element.maxLength);
        }

        entry_elements.forEach(entry_element => {
            const move_entry_up_button_element = entry_element.querySelector("[data-move_entry_up_button]");
            if (move_entry_up_button_element !== null) {
                move_entry_up_button_element.disabled = input_element.disabled || entry_element.previousElementSibling === null;
            }

            const move_entry_down_button_element = entry_element.querySelector("[data-move_entry_down_button]");
            if (move_entry_down_button_element !== null) {
                move_entry_down_button_element.disabled = input_element.disabled || entry_element.nextElementSibling === null;
            }

            const remove_entry_button_element = entry_element.querySelector("[data-remove_entry_button]");
            if (remove_entry_button_element !== null) {
                remove_entry_button_element.disabled = input_element.disabled || (min_length !== -1 && entry_elements.length <= min_length);
            }
        });
    }

    /**
     * @param {InputElement} input_element
     * @returns {void}
     */
    #updateSetCheckbox(input_element) {
        const set_input_element = this.#getContainerElement(
            input_element
        ).querySelector("[data-set_checkbox]");

        if (set_input_element === null) {
            return;
        }

        set_input_element.disabled = input_element.disabled;

        input_element.hidden = !set_input_element.checked;
    }
}

customElements.define(FLUX_FORM_ELEMENT_TAG_NAME, FluxFormElement);
