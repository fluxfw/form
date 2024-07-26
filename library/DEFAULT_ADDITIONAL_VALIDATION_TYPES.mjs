import { ADDITIONAL_VALIDATION_TYPE_REGULAR_EXPRESSION } from "./ADDITIONAL_VALIDATION_TYPE.mjs";

/** @typedef {import("./validateValue.mjs").validateValue} validateValue */

/**
 * @param {RegExp | string | null} value
 * @param {boolean | null} value_with_slashes
 * @returns {Promise<RegExp | null>}
 */
export async function valueToRegExp(value = null, value_with_slashes = null) {
    if ((value ?? "") === "") {
        return null;
    }

    if (value instanceof RegExp) {
        return value;
    }

    if (typeof value !== "string") {
        throw new Error();
    }

    if (!(value_with_slashes ?? false)) {
        return new RegExp(value);
    }

    if (!value.startsWith("/")) {
        throw new Error();
    }

    const last_slash_pos = value.lastIndexOf("/");

    if (last_slash_pos === -1 || last_slash_pos === 0) {
        throw new Error();
    }

    const pattern = value.substring(1, last_slash_pos);

    if (pattern === "" || pattern.endsWith("\\")) {
        throw new Error();
    }

    return new RegExp(pattern, value.substring(last_slash_pos + 1));
}

/**
 * @param {string | null} value
 * @returns {Promise<boolean | string>}
 */
export async function validateRegularExpressionValue(value = null) {
    if ((value ?? "") === "") {
        return true;
    }

    try {
        await valueToRegExp(
            value
        );
    } catch (error) {
        return "Invalid regular expression!";
    }

    return true;
}

/**
 * @type {{[key: string]: validateValue}}
 */
export const DEFAULT_ADDITIONAL_VALIDATION_TYPES = Object.freeze({
    [ADDITIONAL_VALIDATION_TYPE_REGULAR_EXPRESSION]: validateRegularExpressionValue
});
