import { ADDITIONAL_VALIDATION_TYPE_REGULAR_EXPRESSION } from "./ADDITIONAL_VALIDATION_TYPE.mjs";

/** @typedef {import("./validateValue.mjs").validateValue} validateValue */

/**
 * @param {string | null} value
 * @returns {Promise<boolean | string>}
 */
export async function validateRegularExpressionValue(value = null) {
    if ((value ?? "") === "") {
        return true;
    }

    try {
        if (typeof value !== "string") {
            throw new Error();
        }

        RegExp(value);
    } catch (error) {
        //console.error(error);
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
