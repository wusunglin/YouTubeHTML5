/*jslint browser: true, es5: true, indent: 4*/
/*global chrome */

"use strict";

var title = chrome.i18n.getMessage("options");

if (title) {
    document.title = title;
}

[].forEach.call(document.querySelectorAll("*[data-i18n]"), function (el) {
    var m = chrome.i18n.getMessage(el.dataset.i18n);
    if (m) {
        el.textContent = m;
    }
});

var enabled    = document.getElementById("enabled"),
    autoplay   = document.getElementById("autoplay"),
    embiggen   = document.getElementById("embiggen"),
    space      = document.getElementById("space"),
    prioritise = document.getElementById("prioritise"),
    mp4        = document.getElementById("mp4"),
    webm       = document.getElementById("webm"),
    f360       = document.getElementById("f360"),
    f480       = document.getElementById("f480"),
    f720       = document.getElementById("f720"),
    f1080      = document.getElementById("f1080");

enabled.addEventListener("change", function () {
    chrome.storage.local.set({"enabled": this.checked});
});

autoplay.addEventListener("change", function () {
    chrome.storage.local.set({"autoplay": this.checked});
});

embiggen.addEventListener("change", function () {
    chrome.storage.local.set({"embiggen": this.checked});
});

space.addEventListener("change", function () {
    chrome.storage.local.set({"space": this.checked});
});

prioritise.addEventListener("change", function () {
    chrome.storage.local.set({"prioritise": this.checked});
});

function format() {
    var f = null;
    if (mp4.checked) {
        f480.disabled = true;
        if (f360.checked) { f = "18"; }
        if (f480.checked) { f = "18"; f360.checked = true; }
        if (f720.checked) { f = "22"; }
        if (f1080.checked) { f = "37"; }
    } else {
        f480.disabled = false;
        if (f360.checked) { f = "43"; }
        if (f480.checked) { f = "44"; }
        if (f720.checked) { f = "45"; }
        if (f1080.checked) { f = "46"; }
    }
    chrome.storage.local.set({"format": f});
}

mp4.addEventListener("change", format);
webm.addEventListener("change", format);
f360.addEventListener("change", format);
f480.addEventListener("change", format);
f720.addEventListener("change", format);
f1080.addEventListener("change", format);

// init

chrome.storage.local.get(null, function (options) {

    if (typeof options.enabled === "boolean") {
        enabled.checked = options.enabled;
    }

    if (typeof options.autoplay === "boolean") {
        autoplay.checked = options.autoplay;
    }

    if (typeof options.embiggen === "boolean") {
        embiggen.checked = options.embiggen;
    }

    if (typeof options.space === "boolean") {
        space.checked = options.space;
    }

    if (typeof options.prioritise === "boolean") {
        prioritise.checked = options.prioritise;
    }

    switch (options.format) {
    case "18":
        mp4.checked = true;
        f360.checked = true;
        f480.disabled = true;
        break;
    case "22":
        mp4.checked = true;
        f720.checked = true;
        f480.disabled = true;
        break;
    case "37":
        mp4.checked = true;
        f1080.checked = true;
        f480.disabled = true;
        break;
    case "43":
        webm.checked = true;
        f360.checked = true;
        break;
    case "45":
        webm.checked = true;
        f720.checked = true;
        break;
    case "46":
        webm.checked = true;
        f1080.checked = true;
        break;
    }

    var video = document.createElement("video");

    if (!video.canPlayType("video/mp4")) {
        mp4.disabled = true;
        webm.checked = true;
    }

});
