/*jslint browser: true, es5: true, indent: 4, regexp: true */
/*global chrome */

"use strict";

var quality, youtube, state, video, toolbar, menu, enabled, format, speed, embiggen, download, reload;

// wiki/YouTube#Quality_and_codecs
quality = {
    18: "MP4 360p",
    22: "MP4 720p",
    37: "MP4 1080p",
    38: "MP4 3072p",
    43: "WebM 360p",
    44: "WebM 480p",
    45: "WebM 720p",
    46: "WebM 1080p",
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// YouTube Elements
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function parseStreamMap(html) {
    var streamMap = {};
    html.match(/"url_encoded_fmt_stream_map":\s"([^"]+)"/)[1].split(",").forEach(function (s) {
        var tag = s.match(/itag=(\d{0,2})/)[1],
            url = s.match(/url=(.*?)(\\u0026|$)/)[1],
            sig = s.match(/sig=([A-Z0-9]*\.[A-Z0-9]*)/)[1];
        if (quality.hasOwnProperty(tag)) {
            streamMap[tag] = decodeURIComponent(url) + "&signature=" + sig;
        }
    });
    return streamMap;
}

youtube = {
    container : document.getElementById("watch7-container"),
    content   : document.getElementById("watch7-content"),
    player    : document.getElementById("player"),
    flash     : document.getElementById("player-api"),
    html5     : document.getElementById("player-api").cloneNode(false),
    source    : parseStreamMap(document.body.innerHTML),
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// State
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

state = (function () {
    var autoplay = true,
        embiggen = (document.cookie.indexOf("wide=1") !== -1),
        format   = Object.keys(youtube.source)[0],
        speed    = 1,
        time     = 0,
        volume   = 1,
        muted    = false;
    return Object.freeze(Object.create(null, {
        autoplay: {
            get: function () { return autoplay; },
            set: function (x) {
                if (typeof x === "boolean") {
                    autoplay = x;
                }
            }
        },
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

video = document.createElement("video");
video.setAttribute("id", "crx-html5-video");
video.setAttribute("width", "100%");
video.setAttribute("height", "100%");
video.setAttribute("controls", "");
video.setAttribute("preload", "");
video.setAttribute("src", youtube.source[Object.keys(youtube.source)[0]]);

youtube.html5.classList.add("crx-html5-player");
youtube.html5.appendChild(video);

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

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Toolbar
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

toolbar = document.createElement("div");
toolbar.setAttribute("id", "crx-html5");

menu = document.createElement("div");
menu.setAttribute("id", "crx-html5-menu");

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

menu.appendChild(enabled);
menu.appendChild(format);
menu.appendChild(speed);
menu.appendChild(embiggen);
menu.appendChild(download);
menu.appendChild(reload);
toolbar.appendChild(menu);

youtube.content.insertBefore(toolbar, youtube.content.firstElementChild);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Toolbar Events
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function togglePlayer() {
    if (!document.contains(video)) {
        enabled.checked = true;
        enabled.setAttribute("data-tooltip-text", chrome.i18n.getMessage("disable"));
        enabled.setAttribute("title", chrome.i18n.getMessage("disable"));
        youtube.player.replaceChild(youtube.html5, youtube.flash);
        if (state.autoplay) {
            video.setAttribute("autoplay", "");
        }
        video.setAttribute("src", youtube.source[state.format]);
        video.play();
    } else {
        enabled.checked = false;
        enabled.setAttribute("data-tooltip-text", chrome.i18n.getMessage("enable"));
        enabled.setAttribute("title", chrome.i18n.getMessage("enable"));
        youtube.player.replaceChild(youtube.flash, youtube.html5);
    }
}

function toggleSize() {
    if (embiggen.checked) {
        embiggen.setAttribute("data-tooltip-text", chrome.i18n.getMessage("shrink"));
        embiggen.setAttribute("title", chrome.i18n.getMessage("shrink"));
        youtube.container.classList.add("watch-wide");
        youtube.player.classList.add("watch-playlist-collapsed");
        youtube.player.classList.add("watch-medium");
    } else {
        embiggen.setAttribute("data-tooltip-text", chrome.i18n.getMessage("embiggen"));
        embiggen.setAttribute("title", chrome.i18n.getMessage("embiggen"));
        youtube.container.classList.remove("watch-wide");
        youtube.player.classList.remove("watch-playlist-collapsed");
        youtube.player.classList.remove("watch-medium");
    }
}

enabled.addEventListener("change", function() {
    togglePlayer();
});

format.addEventListener("change", function() {
    state.format = this.value;
    video.setAttribute("src", youtube.source[state.format]);
});

speed.addEventListener("change", function() {
    state.speed = this.value;
    video.playbackRate = state.speed;
});

embiggen.addEventListener("change", function() {
    state.embiggen = this.checked;
    toggleSize();
});

download.addEventListener("click", function() {
    var x = (parseInt(state.format, 10) < 43) ? ".mp4" : ".webm";
    this.setAttribute("download", document.title + x);
    this.setAttribute("href", youtube.source[state.format]);
});

reload.addEventListener("click", function() {
    video.setAttribute("src", youtube.source[state.format]);
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// init
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

chrome.storage.local.get(null, function(options) {

    // options {
    //     (bool)   space    = use shift+space to play/pause video
    //     (string) format   = preferred format if available
    //     (float)  volume   = volume
    //     (bool)   muted    = muted
    //     (bool)   autoplay = autoplay
    //     (bool)   embiggen = embiggen video player
    //     (bool)   enabled  = auto switch to html5 video
    // }

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
        state.autoplay = false;
    }

    if (typeof options.embiggen === "boolean") {
        state.embiggen = options.embiggen;
        embiggen.checked = options.embiggen;
        toggleSize();
    }

    if (options.enabled === true) {
        togglePlayer();
    }

});
