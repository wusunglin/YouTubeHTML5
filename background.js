/*jslint browser: true, es5: true, indent: 4 */
/*global chrome, localStorage */

"use strict";

chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {
    if (request === "getLocalStorage") {
        sendResponse({
            swap: localStorage.swap,
            itag: localStorage.itag,
            auto: localStorage.auto,
            keys: localStorage.keys
        });
    } else {
        sendResponse(null);
    }
});
