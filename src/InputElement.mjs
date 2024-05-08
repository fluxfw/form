import { DEFAULT_ADDITIONAL_VALIDATION_TYPES } from "./DEFAULT_ADDITIONAL_VALIDATION_TYPES.mjs";
import css from "./InputElement.css" with { type: "css" };
import root_css from "./InputElementRoot.css" with { type: "css" };
import { INPUT_TYPE_CHECKBOX, INPUT_TYPE_COLOR, INPUT_TYPE_DATE, INPUT_TYPE_DATETIME_LOCAL, INPUT_TYPE_ENTRIES, INPUT_TYPE_HIDDEN, INPUT_TYPE_NUMBER, INPUT_TYPE_PASSWORD, INPUT_TYPE_SELECT, INPUT_TYPE_TEXT, INPUT_TYPE_TEXTAREA, INPUT_TYPE_TIME } from "./INPUT_TYPE.mjs";

/** @typedef {import("./_InputElement.mjs")._InputElement} _InputElement */
/** @typedef {import("./Input.mjs").Input} Input */
/** @typedef {import("./InputValue.mjs").InputValue} InputValue */
/** @typedef {import("./StyleSheetManager/StyleSheetManager.mjs").StyleSheetManager} StyleSheetManager */
/** @typedef {import("./Value.mjs").Value} Value */
/** @typedef {import("./validateValue.mjs").validateValue} validateValue */

export const INPUT_ELEMENT_EVENT_CHANGE = "input-change";

export const INPUT_ELEMENT_EVENT_INPUT = "input-input";

export const INPUT_ELEMENT_VARIABLE_PREFIX = "--input-";

export class InputElement extends HTMLElement {
    /**
     * @type {Map<string, validateValue>}
     */
    #additional_validation_types;
    /**
     * @type {string}
     */
    #additional_validation_type;
    /**
     * @type {boolean}
     */
    #auto_focus;
    /**
     * @type {HTMLDivElement | null}
     */
    #container_element = null;
    /**
     * @type {Input[]>}
     */
    #entries;
    /**
     * @type {boolean}
     */
    #has_custom_validation_message;
    /**
     * @type {_InputElement | null}
     */
    #input_element = null;
    /**
     * @type {ShadowRoot}
     */
    #shadow;
    /**
     * @type {StyleSheetManager | null}
     */
    #style_sheet_manager;
    /**
     * @type {string}
     */
    #type;

    /**
     * @param {Input | null} input
     * @param {StyleSheetManager | null} style_sheet_manager
     * @returns {Promise<InputElement>}
     */
    static async new(input = null, style_sheet_manager = null) {
        if (style_sheet_manager !== null) {
            await style_sheet_manager.generateVariablesRootStyleSheet(
                INPUT_ELEMENT_VARIABLE_PREFIX,
                {
                    [`${INPUT_ELEMENT_VARIABLE_PREFIX}active-button-background-color`]: "foreground-color",
                    [`${INPUT_ELEMENT_VARIABLE_PREFIX}active-button-foreground-color`]: "background-color",
                    [`${INPUT_ELEMENT_VARIABLE_PREFIX}background-color`]: "background-color",
                    [`${INPUT_ELEMENT_VARIABLE_PREFIX}button-background-color`]: "accent-color",
                    [`${INPUT_ELEMENT_VARIABLE_PREFIX}button-focus-outline-color`]: "foreground-color",
                    [`${INPUT_ELEMENT_VARIABLE_PREFIX}button-foreground-color`]: "accent-foreground-color",
                    [`${INPUT_ELEMENT_VARIABLE_PREFIX}foreground-color`]: "foreground-color",
                    [`${INPUT_ELEMENT_VARIABLE_PREFIX}input-background-color`]: "background-color",
                    [`${INPUT_ELEMENT_VARIABLE_PREFIX}input-border-color`]: "foreground-color",
                    [`${INPUT_ELEMENT_VARIABLE_PREFIX}input-focus-outline-color`]: "foreground-color",
                    [`${INPUT_ELEMENT_VARIABLE_PREFIX}input-foreground-color`]: "foreground-color"
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

        const input_element = new this(
            style_sheet_manager
        );

        input_element.#shadow = input_element.attachShadow({
            mode: "closed"
        });

        await input_element.#style_sheet_manager?.addStyleSheetsToShadow(
            input_element.#shadow
        );

        input_element.#shadow.adoptedStyleSheets.push(css);

        input_element.#removeInput();

        for (const [
            type,
            validate_value
        ] of Object.entries(DEFAULT_ADDITIONAL_VALIDATION_TYPES)) {
            await input_element.addAdditionalValidationType(
                type,
                validate_value
            );
        }

        if (input !== null) {
            await input_element.setInput(
                input
            );
        }

        return input_element;
    }

    /**
     * @param {StyleSheetManager | null} style_sheet_manager
     * @private
     */
    constructor(style_sheet_manager) {
        super();

        this.#style_sheet_manager = style_sheet_manager;
        this.#additional_validation_types = new Map();
        this.#auto_focus = false;
        this.#has_custom_validation_message = false;
    }

    /**
     * @returns {void}
     */
    connectedCallback() {
        if (this.#auto_focus) {
            this.#input_element.focus();
        }
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
    }

    /**
     * @returns {boolean}
     */
    get disabled() {
        if (this.#input_element === null) {
            throw new Error("Missing input!");
        }

        return this.#input_element.disabled;
    }

    /**
     * @returns {Input}
     */
    get input() {
        if (this.#input_element === null) {
            throw new Error("Missing input!");
        }

        const options = Array.from(this.#input_element.querySelectorAll("option"));

        return {
            "additional-validation-type": this.#additional_validation_type,
            "auto-focus": this.#auto_focus,
            disabled: this.#input_element.disabled,
            entries: structuredClone(this.#entries),
            "input-mode": this.#input_element.inputMode ?? "",
            label: this.#container_element.querySelector(".label").innerText,
            max: this.#input_element.max ?? "",
            "max-length": this.#input_element.maxLength ?? -1,
            min: this.#input_element.min ?? "",
            "min-length": this.#input_element.minLength ?? -1,
            multiple: this.#input_element.multiple ?? false,
            name: this.name,
            options: options.filter(option_element => this.#input_element.multiple || option_element.value !== "").map(option_element => ({
                disabled: option_element.disabled,
                label: option_element.text,
                title: option_element.title,
                value: option_element.value
            })),
            options_no_empty_value: this.#input_element.multiple ? false : !options.some(option_element => option_element.value === ""),
            pattern: this.#input_element.pattern ?? "",
            placeholder: this.#input_element.placeholder ?? "",
            "read-only": this.#input_element.readOnly ?? false,
            required: this.#input_element.required,
            step: this.#input_element.step ?? "",
            subtitle: this.#container_element.querySelector(".subtitle").innerText,
            title: this.#input_element.title,
            type: this.#type,
            value: this.value
        };
    }

    /**
     * @returns {string}
     */
    get name() {
        if (this.#input_element === null) {
            throw new Error("Missing input!");
        }

        return this.#input_element.name;
    }

    /**
     * @param {string} name
     * @returns {void}
     */
    set name(name) {
        if (this.#input_element === null) {
            throw new Error("Missing input!");
        }

        this.#input_element.name = name;
    }

    /**
     * @param {boolean} disabled
     * @returns {Promise<void>}
     */
    async setDisabled(disabled) {
        if (this.#input_element === null) {
            throw new Error("Missing input!");
        }

        this.#input_element.disabled = disabled;

        this.#container_element.querySelectorAll("button").forEach(button_element => {
            button_element.disabled = disabled;
        });

        for (const form_element of Array.from(this.#container_element.querySelectorAll("[data-form]"))) {
            await form_element.setDisabled(
                disabled
            );
        }

        this.#updateClearButton();

        await this.#updateEntries();

        this.#updateSetCheckbox();
    }

    /**
     * @param {Input} input
     * @returns {Promise<void>}
     */
    async setInput(input) {
        this.#removeInput();

        this.#container_element = document.createElement("div");

        const label_element = document.createElement("div");
        label_element.classList.add("label");
        label_element.innerText = input.label ?? "";
        this.#container_element.append(label_element);

        this.#type = input.type ?? INPUT_TYPE_TEXT;

        this.#input_element = document.createElement(this.#type === INPUT_TYPE_SELECT || this.#type === INPUT_TYPE_TEXTAREA ? this.#type : "input");

        this.#additional_validation_type = input["additional-validation-type"] ?? "";

        this.#auto_focus = input["auto-focus"] ?? false;

        const input_mode = input["input-mode"] ?? "";
        if (input_mode !== "" && "inputMode" in this.#input_element) {
            this.#input_element.inputMode = input_mode;
        }

        const max = input.max ?? "";
        if (max !== "" && "max" in this.#input_element) {
            this.#input_element.max = max;
        }

        const max_length = input["max-length"] ?? -1;
        if (max_length !== -1 && "maxLength" in this.#input_element) {
            this.#input_element.maxLength = max_length;
        }

        const min = input.min ?? "";
        if (min !== "" && "min" in this.#input_element) {
            this.#input_element.min = min;
        }

        const min_length = input["min-length"] ?? -1;
        if (min_length !== -1 && "minLength" in this.#input_element) {
            this.#input_element.minLength = min_length;
        }

        if ("multiple" in this.#input_element) {
            this.#input_element.multiple = input.multiple ?? false;
        }

        this.name = input.name;

        if (this.#type === INPUT_TYPE_SELECT) {
            const options = [
                ...!this.#input_element.multiple ? !(input.options_no_empty_value ?? false) ? [
                    {
                        label: "--",
                        value: ""
                    }
                ] : [] : [],
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

                this.#input_element.append(option_element);
            }

            if (this.#input_element.multiple) {
                this.#input_element.size = options.length;
            }
        }

        const pattern = input.pattern ?? "";
        if (pattern !== "" && "pattern" in this.#input_element) {
            this.#input_element.pattern = pattern;
        }

        const placeholder = input.placeholder ?? "";
        if (placeholder !== "" && "placeholder" in this.#input_element) {
            this.#input_element.placeholder = placeholder;
        }

        if ("readOnly" in this.#input_element) {
            this.#input_element.readOnly = input["read-only"] ?? false;
        }

        this.#input_element.required = input.required ?? false;

        const step = input.step ?? "";
        if (step !== "" && "step" in this.#input_element) {
            this.#input_element.step = step;
        }

        const title = input.title ?? "";
        if (title !== "") {
            this.#input_element.title = title;
        }

        this.#entries = structuredClone(input.entries ?? []);

        if (this.#type === INPUT_TYPE_ENTRIES) {
            this.#input_element.type = INPUT_TYPE_HIDDEN;

            const _min_length = Math.max(this.#input_element.minLength, this.#input_element.required ? 1 : -1);

            const entries_element = document.createElement("div");
            entries_element.dataset.entries = true;
            this.#container_element.append(entries_element);

            if (_min_length === -1 || this.#input_element.maxLength === -1 || _min_length !== this.#input_element.maxLength) {
                const add_entry_button_element = document.createElement("button");
                add_entry_button_element.dataset.add_entry_button = true;
                add_entry_button_element.innerText = "+";
                add_entry_button_element.type = "button";
                add_entry_button_element.addEventListener("click", async () => {
                    await this.#addEntry();

                    const {
                        value
                    } = this;
                    this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_INPUT, {
                        detail: {
                            value
                        }
                    }));
                    this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_CHANGE, {
                        detail: {
                            value
                        }
                    }));
                });
                this.#container_element.append(add_entry_button_element);
            }
        } else {
            if (this.#input_element instanceof HTMLInputElement) {
                this.#input_element.type = this.#type;
            }

            this.#input_element.addEventListener("change", () => {
                this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_CHANGE, {
                    detail: {
                        value: this.value
                    }
                }));
            });
            this.#input_element.addEventListener("input", () => {
                this.#removeCustomValidationMessage();

                this.#updateClearButton();

                this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_INPUT, {
                    detail: {
                        value: this.value
                    }
                }));
            });
        }

        this.#container_element.append(this.#input_element);

        if (this.#type === INPUT_TYPE_COLOR) {
            const set_container_element = document.createElement("div");
            set_container_element.classList.add("container");

            const set_input_element = document.createElement("input");
            set_input_element.dataset.set_checkbox = true;
            set_input_element.required = this.#input_element.required;
            set_input_element.type = INPUT_TYPE_CHECKBOX;
            set_input_element.addEventListener("input", () => {
                this.#updateSetCheckbox();
            });
            set_container_element.append(set_input_element);

            set_container_element.append(this.#input_element);

            this.#container_element.append(set_container_element);
        }

        if (this.#type === INPUT_TYPE_PASSWORD) {
            const view_container_element = document.createElement("div");
            view_container_element.classList.add("container");

            view_container_element.append(this.#input_element);

            const view_button_element = document.createElement("button");
            view_button_element.innerText = "T";
            view_button_element.type = "button";
            view_button_element.addEventListener("click", () => {
                if (this.#input_element.type === INPUT_TYPE_PASSWORD) {
                    this.#input_element.type = INPUT_TYPE_TEXT;
                    view_button_element.innerText = "●";
                } else {
                    this.#input_element.type = INPUT_TYPE_PASSWORD;
                    view_button_element.innerText = "T";
                }
            });
            view_container_element.append(view_button_element);

            this.#container_element.append(view_container_element);
        }

        if ((this.#type === INPUT_TYPE_SELECT && this.#input_element.multiple) || [
            INPUT_TYPE_DATE,
            INPUT_TYPE_DATETIME_LOCAL,
            INPUT_TYPE_TIME
        ].includes(this.#type)) {
            const clear_container_element = document.createElement("div");
            clear_container_element.classList.add("container");

            clear_container_element.append(this.#input_element);

            const clear_button_element = document.createElement("button");
            clear_button_element.dataset.clear_button = true;
            clear_button_element.innerText = "X";
            clear_button_element.type = "button";
            clear_button_element.addEventListener("click", async () => {
                await this.setValue(
                    null
                );
            });
            clear_container_element.append(clear_button_element);

            this.#container_element.append(clear_container_element);
        }

        await this.setDisabled(
            input.disabled ?? false
        );
        await this.setValue(
            input.value ?? null
        );

        const subtitle_element = document.createElement("div");
        subtitle_element.classList.add("subtitle");
        subtitle_element.innerText = input.subtitle ?? "";
        this.#container_element.append(subtitle_element);

        this.#shadow.append(this.#container_element);
    }

    /**
     * @param {Value} value
     * @returns {Promise<void>}
     */
    async setValue(value) {
        if (this.#input_element === null) {
            throw new Error("Missing input!");
        }

        switch (true) {
            case this.#type === INPUT_TYPE_CHECKBOX:
                this.#input_element.checked = value ?? false;
                break;

            case this.#type === INPUT_TYPE_COLOR: {
                const _value = value ?? "";

                this.#container_element.querySelector("[data-set_checkbox]").checked = _value !== "";

                this.#input_element.value = _value;

                this.#updateSetCheckbox();
            }
                break;

            case this.#type === INPUT_TYPE_ENTRIES:
                Array.from(this.#container_element.querySelectorAll("[data-entry]")).forEach(entry_element => {
                    entry_element.remove();
                });

                for (const _value of value ?? []) {
                    await this.#addEntry(
                        _value,
                        false
                    );
                }

                await this.#updateEntries();
                break;

            case this.#type === INPUT_TYPE_NUMBER:
                if (value !== null) {
                    this.#input_element.valueAsNumber = value;
                } else {
                    this.#input_element.value = "";
                }
                break;

            case this.#type === INPUT_TYPE_SELECT && this.#input_element.multiple: {
                const values = value ?? [];

                for (const option_element of this.#input_element.querySelectorAll("option")) {
                    option_element.selected = values.includes(option_element.value);
                }
            }
                break;

            default:
                this.#input_element.value = value ?? "";
                break;
        }

        this.#updateClearButton();
    }

    /**
     * @param {boolean | null} report
     * @returns {Promise<boolean>}
     */
    async validate(report = null) {
        if (this.#input_element === null) {
            throw new Error("Missing input!");
        }

        this.#removeCustomValidationMessage();

        const _report = report ?? true;

        if (!this.#input_element.checkValidity()) {
            if (_report) {
                this.#input_element.reportValidity();
            }

            return false;
        }

        if (this.#type === INPUT_TYPE_ENTRIES) {
            for (const form_element of Array.from(this.#container_element.querySelectorAll("[data-form]"))) {
                if (!await form_element.validate()) {
                    return false;
                }
            }

            const entry_elements_length = this.#container_element.querySelectorAll("[data-entry]").length;
            if ((this.#input_element.required && entry_elements_length === 0) || (this.#input_element.minLength !== -1 && entry_elements_length < this.#input_element.minLength) || (this.#input_element.maxLength !== -1 && entry_elements_length > this.#input_element.maxLength)) {
                return false;
            }
        }

        if (this.#additional_validation_type !== "") {
            const validate_value = this.#additional_validation_types.get(this.#additional_validation_type) ?? null;

            if (validate_value === null) {
                throw new Error(`Unknown additional validation type ${this.#additional_validation_type}!`);
            }

            const validate_value_result = await validate_value(
                this.value
            );

            if (validate_value_result !== true) {
                if (_report && validate_value_result !== false) {
                    this.#setCustomValidationMessage(
                        validate_value_result
                    );
                }

                return false;
            }
        }

        return true;
    }

    /**
     * @returns {Value}
     */
    get value() {
        if (this.#input_element === null) {
            throw new Error("Missing input!");
        }

        switch (true) {
            case this.#type === INPUT_TYPE_CHECKBOX:
                return this.#input_element.checked;

            case this.#type === INPUT_TYPE_COLOR:
                return this.#container_element.querySelector("[data-set_checkbox]").checked ? this.#input_element.value : "";

            case this.#type === INPUT_TYPE_ENTRIES:
                return Array.from(this.#container_element.querySelectorAll("[data-form]")).map(form_element => form_element.values);

            case this.#type === INPUT_TYPE_NUMBER:
                return !Number.isNaN(this.#input_element.valueAsNumber) ? this.#input_element.valueAsNumber : null;

            case this.#type === INPUT_TYPE_SELECT && this.#input_element.multiple:
                return Array.from(this.#input_element.querySelectorAll("option")).filter(option_element => option_element.selected).map(option_element => option_element.value);

            default:
                return this.#input_element.value;
        }
    }

    /**
     * @param {InputValue[] | null} values
     * @param {boolean | null} update_entries
     * @returns {Promise<void>}
     */
    async #addEntry(values = null, update_entries = null) {
        if (this.#input_element.maxLength !== -1 && this.#container_element.querySelectorAll("[data-entry]").length >= this.#input_element.maxLength) {
            return;
        }

        const min_length = Math.max(this.#input_element.minLength, this.#input_element.required ? 1 : -1);

        const entry_element = document.createElement("div");
        entry_element.classList.add("container");
        entry_element.dataset.entry = true;

        if (this.#input_element.maxLength === -1 || this.#input_element.maxLength > 1) {
            const move_entry_up_button_element = document.createElement("button");
            move_entry_up_button_element.dataset.move_entry_up_button = true;
            move_entry_up_button_element.innerText = "/\\";
            move_entry_up_button_element.type = "button";
            move_entry_up_button_element.addEventListener("click", async () => {
                entry_element.previousElementSibling?.before(entry_element);

                await this.#updateEntries();

                const {
                    value
                } = this;
                this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_INPUT, {
                    detail: {
                        value
                    }
                }));
                this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_CHANGE, {
                    detail: {
                        value
                    }
                }));
            });
            entry_element.append(move_entry_up_button_element);

            const move_entry_down_button_element = document.createElement("button");
            move_entry_down_button_element.dataset.move_entry_down_button = true;
            move_entry_down_button_element.innerText = "\\/";
            move_entry_down_button_element.type = "button";
            move_entry_down_button_element.addEventListener("click", async () => {
                entry_element.nextElementSibling?.after(entry_element);

                await this.#updateEntries();

                const {
                    value
                } = this;
                this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_INPUT, {
                    detail: {
                        value
                    }
                }));
                this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_CHANGE, {
                    detail: {
                        value
                    }
                }));
            });
            entry_element.append(move_entry_down_button_element);
        }

        if (min_length === -1 || this.#input_element.maxLength === -1 || min_length !== this.#input_element.maxLength) {
            const remove_button_element = document.createElement("button");
            remove_button_element.dataset.remove_entry_button = true;
            remove_button_element.innerText = "X";
            remove_button_element.type = "button";
            remove_button_element.addEventListener("click", async e => {
                e.preventDefault();

                entry_element.remove();

                await this.#updateEntries();

                const {
                    value
                } = this;
                this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_INPUT, {
                    detail: {
                        value
                    }
                }));
                this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_CHANGE, {
                    detail: {
                        value
                    }
                }));
            });
            entry_element.append(remove_button_element);
        }

        const {
            FORM_ELEMENT_EVENT_CHANGE,
            FORM_ELEMENT_EVENT_INPUT,
            FormElement
        } = await import("./FormElement.mjs");

        const form_element = await FormElement.new(
            this.#entries,
            this.#style_sheet_manager
        );
        form_element.dataset.form = true;
        form_element.addEventListener(FORM_ELEMENT_EVENT_CHANGE, () => {
            this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_CHANGE, {
                detail: {
                    value: this.value
                }
            }));
        });
        form_element.addEventListener(FORM_ELEMENT_EVENT_INPUT, () => {
            this.dispatchEvent(new CustomEvent(INPUT_ELEMENT_EVENT_INPUT, {
                detail: {
                    value: this.value
                }
            }));
        });
        entry_element.append(form_element);

        this.#container_element.querySelector("[data-entries]").append(entry_element);

        await form_element.setDisabled(
            this.#input_element.disabled
        );
        await form_element.setValues(
            values
        );

        if (update_entries ?? true) {
            await this.#updateEntries();
        }
    }

    /**
     * @returns {void}
     */
    #removeCustomValidationMessage() {
        if (!this.#has_custom_validation_message) {
            return;
        }

        this.#has_custom_validation_message = false;

        this.#input_element.setCustomValidity("");
    }

    /**
     * @returns {void}
     */
    #removeInput() {
        this.#removeCustomValidationMessage();

        if (this.#container_element !== null) {
            this.#container_element.remove();
            this.#container_element = null;
        }

        this.#input_element = null;

        this.#additional_validation_type = "";

        this.#entries = [];

        this.#type = "";
    }

    /**
     * @param {string} message
     * @returns {void}
     */
    #setCustomValidationMessage(message) {
        this.#has_custom_validation_message = true;

        this.#input_element.setCustomValidity(message);
        this.#input_element.reportValidity();
    }

    /**
     * @returns {void}
     */
    #updateClearButton() {
        const clear_button_element = this.#container_element.querySelector("[data-clear_button]");

        if (clear_button_element === null) {
            return;
        }

        const {
            value
        } = this;

        clear_button_element.disabled = this.#input_element.disabled || value === null || value === "" || value === false || value.length === 0;
    }

    /**
     * @returns {Promise<void>}
     */
    async #updateEntries() {
        if (this.#container_element.querySelector("[data-entries]") === null) {
            return;
        }

        const min_length = Math.max(this.#input_element.minLength, this.#input_element.required ? 1 : -1);

        const entry_elements_length = this.#container_element.querySelectorAll("[data-entry]").length;
        if (min_length !== -1 && entry_elements_length < min_length) {
            for (let i = entry_elements_length; i < min_length; i++) {
                await this.#addEntry(
                    null,
                    false
                );
            }
        }

        const entry_elements = this.#container_element.querySelectorAll("[data-entry]");

        const add_entry_button_element = this.#container_element.querySelector("[data-add_entry_button]");
        if (add_entry_button_element !== null) {
            add_entry_button_element.disabled = this.#input_element.disabled || (this.#input_element.maxLength !== -1 && entry_elements.length >= this.#input_element.maxLength);
        }

        entry_elements.forEach(entry_element => {
            const move_entry_up_button_element = entry_element.querySelector("[data-move_entry_up_button]");
            if (move_entry_up_button_element !== null) {
                move_entry_up_button_element.disabled = this.#input_element.disabled || entry_element.previousElementSibling === null;
            }

            const move_entry_down_button_element = entry_element.querySelector("[data-move_entry_down_button]");
            if (move_entry_down_button_element !== null) {
                move_entry_down_button_element.disabled = this.#input_element.disabled || entry_element.nextElementSibling === null;
            }

            const remove_entry_button_element = entry_element.querySelector("[data-remove_entry_button]");
            if (remove_entry_button_element !== null) {
                remove_entry_button_element.disabled = this.#input_element.disabled || (min_length !== -1 && entry_elements.length <= min_length);
            }
        });
    }

    /**
     * @returns {void}
     */
    #updateSetCheckbox() {
        const set_input_element = this.#container_element.querySelector("[data-set_checkbox]");

        if (set_input_element === null) {
            return;
        }

        set_input_element.disabled = this.#input_element.disabled;

        this.#input_element.hidden = !set_input_element.checked;
    }
}

export const INPUT_ELEMENT_TAG_NAME = "input";

customElements.define(INPUT_ELEMENT_TAG_NAME, InputElement);
