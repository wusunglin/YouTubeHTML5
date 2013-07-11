/*jslint browser: true, es5: true, indent: 4, regexp: true */
/*global chrome, MutationObserver */

"use strict";

// wiki/YouTube#Quality_and_codecs
var quality = {
    18: "MP4 360p",
    22: "MP4 720p",
    37: "MP4 1080p",
    38: "MP4 4K",
    43: "WebM 360p",
    44: "WebM 480p",
    45: "WebM 720p",
    46: "WebM 1080p",
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// YouTube Elements
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// credit: http://userscripts.org/scripts/show/25105

function decryptSignature(s) {

    var a, b;

    function swap(x, y) {
        var z = x[0];
        x[0] = x[y % x.length];
        x[y] = z;
        return x;
    }

    if (s.length === 88) {
        a = s.split("");
        a = a.slice(2);
        a = swap(a, 1);
        a = swap(a, 10);
        a = a.reverse();
        a = a.slice(2);
        a = swap(a, 23);
        a = a.slice(3);
        a = swap(a, 15);
        a = swap(a, 34);
        s = a.join("");
    }

    if (s.length === 87) {
        a = s.substr(44, 40).split("").reverse().join("");
        b = s.substr(3, 40).split("").reverse().join("");
        s = a.substr(21, 1) +
            a.substr(1, 20) +
            a.substr(0, 1) +
            b.substr(22, 9) +
            s.substr(0, 1) +
            a.substr(32, 8) +
            s.substr(43, 1) +
            b;
    }

    if (s.length === 86) {
        a = s.substr(2, 40);
        b = s.substr(43, 40);
        s = a +
            s.substr(42, 1) +
            b.substr(0, 20) +
            b.substr(39, 1) +
            b.substr(21, 18) +
            b.substr(20, 1);
    }

    if (s.length === 85) {
        a = s.substr(44, 40).split("").reverse().join("");
        b = s.substr(3, 40).split("").reverse().join("");
        s = a.substr(7, 1) +
            a.substr(1, 6) +
            a.substr(0, 1) +
            a.substr(8, 15) +
            s.substr(0, 1) +
            a.substr(24, 9) +
            s.substr(1, 1) +
            a.substr(34, 6) +
            s.substr(43, 1) +
            b;
    }

    if (s.length === 84) {
        a = s.substr(44, 40).split("").reverse().join("");
        b = s.substr(3, 40).split("").reverse().join("");
        s = a +
            s.substr(43, 1) +
            b.substr(0, 6) +
            s.substr(2, 1) +
            b.substr(7, 9) +
            b.substr(39, 1) +
            b.substr(17, 22) +
            b.substr(16, 1);
    }

    if (s.length === 83) {
        s = s.substr(0, 81);
    }

    if (s.length === 82) {
        a = s.substr(34, 48).split("").reverse().join("");
        b = s.substr(0, 33).split("").reverse().join("");
        s = a.substr(45, 1) +
            a.substr(2, 12) +
            a.substr(0, 1) +
            a.substr(15, 26) +
            s.substr(33, 1) +
            a.substr(42, 1) +
            a.substr(43, 1) +
            a.substr(44, 1) +
            a.substr(41, 1) +
            a.substr(46, 1) +
            b.substr(32, 1) +
            a.substr(14, 1) +
            b.substr(0, 32) +
            a.substr(47, 1);
    }

    return s;
}

function parseStreamMap(html) {
    var streamMap = {};
    html.match(/"url_encoded_fmt_stream_map":\s"([^"]+)"/)[1].split(",").forEach(function (s) {
        var tag = s.match(/itag=(\d{0,2})/)[1],
            url = s.match(/url=(.*?)(\\u0026|$)/)[1],
            sig = s.match(/[sig|s]=([A-Z0-9]*\.[A-Z0-9]*)/)[1];
        if (sig.length > 81) {
            sig = decryptSignature(sig);
        }
        if (quality.hasOwnProperty(tag)) {
            streamMap[tag] = decodeURIComponent(url) + "&signature=" + sig;
        }
    });
    return streamMap;
}

var youtube = {
    container : document.querySelector("#watch7-container"),
    content   : document.querySelector("#watch7-content"),
    player    : document.querySelector("#player"),
    video     : document.querySelector("#player-api"),
    next      : document.querySelector("#watch7-playlist-bar-next-button"),
    auto      : document.querySelector("#watch7-playlist-bar-autoplay-button"),
    source    : parseStreamMap(document.body.innerHTML),
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// State
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var state = (function () {
    var embiggen = (document.cookie.indexOf("wide=1") !== -1),
        format   = Object.keys(youtube.source)[0],
        speed    = 1,
        time     = 0,
        volume   = 1,
        muted    = false;
    return Object.freeze(Object.create(null, {
        embiggen: {
            get: function () { return embiggen; },
            set: function (x) {
                if (typeof x === "boolean") {
                    embiggen = x;
                    try {
                        chrome.storage.local.set({"embiggen": x});
                    } catch (ignore) {}
                }
            }
        },
        format: {
            get: function () { return format; },
            set: function (x) {
                if (typeof x === "string" && youtube.source.hasOwnProperty(x)) {
                    format = x;
                }
            }
        },
        speed: {
            get: function () { return speed; },
            set: function (x) {
                var s = parseFloat(x);
                if (!isNaN(s)) {
                    speed = s;
                }
            }
        },
        time: {
            get: function () { return time; },
            set: function (x) {
                var t = parseInt(x, 10);
                if (!isNaN(t)) {
                    time = t;
                }
            }
        },
        volume: {
            get: function () { return volume; },
            set: function (x) {
                var v = parseFloat(x);
                if (!isNaN(v)) {
                    volume = v;
                    try {
                        chrome.storage.local.set({"volume": v});
                    } catch (ignore) {}
                }
            }
        },
        muted: {
            get: function () { return muted; },
            set: function (x) {
                if (typeof x === "boolean") {
                    muted = x;
                    try {
                        chrome.storage.local.set({"muted": x});
                    } catch (ignore) {}
                }
            }
        }
    }));
}());

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Video
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var video, html5;

video = document.createElement("video");
video.setAttribute("id", "crx-html5-video");
video.setAttribute("controls", "");
video.setAttribute("preload", "");
video.setAttribute("autoplay", "");
video.setAttribute("src", youtube.source[Object.keys(youtube.source)[0]]);

html5 = document.createElement("div");
html5.setAttribute("id", "crx-html5-player");
html5.classList.add("player-height");
html5.classList.add("player-width");
html5.classList.add("off-screen-target");
html5.appendChild(video);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Video Events
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function hitbox(offsetY) {
    return ((parseInt(window.getComputedStyle(video).getPropertyValue("height"), 10) - 40) > offsetY);
}

video.addEventListener("click", function (e) {
    if (hitbox(e.offsetY)) {
        if (this.paused || this.ended) {
            this.play();
        } else {
            this.pause();
        }
    }
});

video.addEventListener("dblclick", function (e) {
    if (hitbox(e.offsetY)) {
        if (this.requestFullscreen) {
            this.requestFullscreen();
        } else {
            if (this.webkitRequestFullscreen) {
                this.webkitRequestFullscreen();
            }
        }
    }
});

video.addEventListener("play", function () {
    if (document.contains(this)) {
        this.playbackRate = state.speed;
        this.play();
    } else {
        this.setAttribute("src", "");
    }
});

video.addEventListener("loadedmetadata", function () {
    if (state.time > 0) {
        this.currentTime = state.time;
    } else {
        var m = 0,
            s = 0,
            t = location.hash.substring(1);
        if (t.indexOf("t=") !== -1) {
            try { m = parseInt(t.match(/t=.*?(\d*)m/)[1], 10); } catch (ignore) {}
            try { s = parseInt(t.match(/t=.*?(\d*)s/)[1], 10); } catch (ignore) {}
        }
        this.currentTime = ((m * 60) + s);
    }
});

video.addEventListener("timeupdate", function () {
    var t = parseInt(this.currentTime, 10);
    if (t > 0 && t % 5 === 0 && t !== state.time) {
        state.time = t;
    }
});

video.addEventListener("seeked", function () {
    state.time = Math.floor(parseInt(this.currentTime, 10) / 5) * 5;
});

video.addEventListener("volumechange", function () {
    if (this.muted) {
        state.muted = true;
    } else {
        state.muted = false;
        state.volume = this.volume;
    }
});

video.addEventListener("ended", function () {
    if (youtube.next && youtube.auto && youtube.auto.classList.contains("yt-uix-button-toggled")) {
        window.location.href = youtube.next.href;
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Toolbar
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var enabled, format, speed, embiggen, download, reload, menu, toolbar;

enabled = document.createElement("input");
enabled.setAttribute("id", "crx-html5-enabled");
enabled.setAttribute("type", "checkbox");
enabled.setAttribute("class", "yt-uix-tooltip");
enabled.setAttribute("data-tooltip-text", chrome.i18n.getMessage("enable"));
enabled.setAttribute("title", chrome.i18n.getMessage("enable"));

format = document.createElement("select");
format.setAttribute("id", "crx-html5-format");
format.setAttribute("class", "yt-uix-tooltip");
format.setAttribute("data-tooltip-text", chrome.i18n.getMessage("quality"));
format.setAttribute("title", chrome.i18n.getMessage("quality"));

Object.keys(youtube.source).forEach(function (k) {
    var o = document.createElement("option");
    if (k === state.format) {
        o.setAttribute("selected", "");
    }
    o.setAttribute("value", k);
    o.textContent = quality[k];
    format.appendChild(o);
});

speed = document.createElement("select");
speed.setAttribute("id", "crx-html5-speed");
speed.setAttribute("class", "yt-uix-tooltip");
speed.setAttribute("data-tooltip-text", chrome.i18n.getMessage("speed"));
speed.setAttribute("title", chrome.i18n.getMessage("speed"));

[0.25, 0.5, 1, 1.5, 2].forEach(function (k) {
    var o = document.createElement("option");
    if (k === state.speed) {
        o.setAttribute("selected", "");
    }
    o.setAttribute("value", k);
    o.textContent = (k === 1) ? "Normal" : k + "x";
    speed.appendChild(o);
});

embiggen = document.createElement("input");
embiggen.setAttribute("id", "crx-html5-embiggen");
embiggen.setAttribute("type", "checkbox");
embiggen.setAttribute("class", "yt-uix-tooltip");
embiggen.setAttribute("data-tooltip-text", chrome.i18n.getMessage("embiggen"));
embiggen.setAttribute("title", chrome.i18n.getMessage("embiggen"));

if (state.embiggen) {
    embiggen.setAttribute("data-tooltip-text", chrome.i18n.getMessage("shrink"));
    embiggen.setAttribute("title", chrome.i18n.getMessage("shrink"));
    embiggen.setAttribute("checked", "");
}

download = document.createElement("a");
download.setAttribute("id", "crx-html5-download");
download.setAttribute("class", "yt-uix-tooltip");
download.setAttribute("data-tooltip-text", chrome.i18n.getMessage("download"));
download.setAttribute("title", chrome.i18n.getMessage("download"));
download.textContent = chrome.i18n.getMessage("download");

reload = document.createElement("a");
reload.setAttribute("id", "crx-html5-reload");
reload.setAttribute("class", "yt-uix-tooltip");
reload.setAttribute("data-tooltip-text", chrome.i18n.getMessage("reload"));
reload.setAttribute("title", chrome.i18n.getMessage("reload"));
reload.textContent = chrome.i18n.getMessage("reload");

menu = document.createElement("div");
menu.setAttribute("id", "crx-html5-menu");
menu.appendChild(enabled);
menu.appendChild(format);
menu.appendChild(speed);
menu.appendChild(embiggen);
menu.appendChild(download);
menu.appendChild(reload);

toolbar = document.createElement("div");
toolbar.setAttribute("id", "crx-html5-toolbar");
toolbar.appendChild(menu);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Toolbar Events
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function togglePlayer() {
    if (!document.contains(video)) {
        enabled.checked = true;
        enabled.setAttribute("data-tooltip-text", chrome.i18n.getMessage("disable"));
        enabled.setAttribute("title", chrome.i18n.getMessage("disable"));
        document.body.classList.add("crx-html5");
        youtube.player.replaceChild(html5, youtube.video);
        video.setAttribute("src", youtube.source[state.format]);
    } else {
        enabled.checked = false;
        enabled.setAttribute("data-tooltip-text", chrome.i18n.getMessage("enable"));
        enabled.setAttribute("title", chrome.i18n.getMessage("enable"));
        document.body.classList.remove("crx-html5");
        youtube.player.replaceChild(youtube.video, html5);
    }
}

function toggleSize() {
    if (embiggen.checked) {
        embiggen.setAttribute("data-tooltip-text", chrome.i18n.getMessage("shrink"));
        embiggen.setAttribute("title", chrome.i18n.getMessage("shrink"));
        youtube.container.classList.add("watch-wide");
        youtube.player.classList.add("watch-medium");
        youtube.player.classList.add("watch-playlist-collapsed");
    } else {
        embiggen.setAttribute("data-tooltip-text", chrome.i18n.getMessage("embiggen"));
        embiggen.setAttribute("title", chrome.i18n.getMessage("embiggen"));
        youtube.container.classList.remove("watch-wide");
        youtube.player.classList.remove("watch-medium");
        youtube.player.classList.remove("watch-playlist-collapsed");
    }
}

enabled.addEventListener("change", function () {
    togglePlayer();
});

format.addEventListener("change", function () {
    state.format = this.value;
    video.setAttribute("src", youtube.source[state.format]);
});

speed.addEventListener("change", function () {
    state.speed = this.value;
    video.playbackRate = state.speed;
});

embiggen.addEventListener("change", function () {
    state.embiggen = this.checked;
    toggleSize();
});

download.addEventListener("click", function () {
    var x = (parseInt(state.format, 10) < 43) ? ".mp4" : ".webm";
    this.setAttribute("download", document.title + x);
    this.setAttribute("href", youtube.source[state.format]);
});

reload.addEventListener("click", function () {
    video.setAttribute("src", youtube.source[state.format]);
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// init
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

youtube.content.insertBefore(toolbar, youtube.content.firstElementChild);

chrome.storage.local.get(null, function (options) {

    // (bool)   space    = use shift+space to play/pause video
    // (string) format   = preferred format if available
    // (float)  volume   = volume
    // (bool)   muted    = muted
    // (bool)   autoplay = autoplay
    // (bool)   embiggen = embiggen video player
    // (bool)   enabled  = auto switch to html5 video

    if (options.space === true) {
        document.addEventListener("keydown", function (e) {
            if (e.shiftKey && e.keyCode === 32) {
                if (video.paused || video.ended) {
                    video.play();
                } else {
                    video.pause();
                }
            }
        });
    }

    if (typeof options.format === "string") {
        if (["37", "22"].indexOf(options.format) !== -1) {
            if (options.format === "37" && !youtube.source.hasOwnProperty(options.format)) { options.format = "22"; }
            if (options.format === "22" && !youtube.source.hasOwnProperty(options.format)) { options.format = "18"; }
        }
        if (["46", "45", "44"].indexOf(options.format) !== -1) {
            if (options.format === "46" && !youtube.source.hasOwnProperty(options.format)) { options.format = "45"; }
            if (options.format === "45" && !youtube.source.hasOwnProperty(options.format)) { options.format = "44"; }
            if (options.format === "44" && !youtube.source.hasOwnProperty(options.format)) { options.format = "43"; }
        }
        state.format = options.format;
    }

    [].slice.call(format.options).some(function (o) {
        if (o.value === state.format) {
            o.selected = true;
            return true;
        }
    });

    if (!isNaN(parseFloat(options.volume))) {
        state.volume = options.volume;
        video.volume = state.volume;
    }

    if (typeof options.muted === "boolean") {
        state.muted = options.muted;
        video.muted = state.muted;
    }

    if (options.autoplay === false) {
        video.removeAttribute("autoplay");
    }

    if (typeof options.embiggen === "boolean") {
        state.embiggen = options.embiggen;
        embiggen.checked = options.embiggen;
        toggleSize();
    }

    if (options.enabled === true) {

        // this should stop YouTube's html5 video player loading in the background
        var observer = new MutationObserver(function (mutations) {
            mutations.some(function () {
                var v = youtube.video.querySelector("video");
                if (v) {
                    v.addEventListener("timeupdate", function () {
                        if (document.contains(video)) {
                            this.pause();
                        }
                    });
                    observer.disconnect();
                    return true;
                }
            });
        });

        observer.observe(youtube.video, {subtree: true, childList: true});

        togglePlayer();
    }

});
