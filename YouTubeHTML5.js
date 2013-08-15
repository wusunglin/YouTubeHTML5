/*jslint browser: true, es5: true, indent: 4, regexp: true, evil: true */
/*global chrome, MutationObserver */

function main() {

    "use strict";

    var source, quality, state,
        yt_container, yt_content, yt_watch, yt_player, yt_next, yt_auto,
        video, player,
        enabled, format, speed, embiggen, download, reload, menu, toolbar,
        decoder, decrypt;

    source = {};

    // wiki/YouTube#Quality_and_codecs
    quality = (function () {
        var q = {},
            v = document.createElement("video");
        if (v.canPlayType("video/mp4")) {
            q["18"] = "MP4 360p";
            q["22"] = "MP4 720p";
            q["37"] = "MP4 1080p";
            q["38"] = "MP4 4K";
        }
        if (v.canPlayType("video/webm")) {
            q["43"] = "WebM 360p";
            q["44"] = "WebM 480p";
            q["45"] = "WebM 720p";
            q["46"] = "WebM 1080p";
        }
        return q;
    }());

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // State
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    state = (function () {
        var s_embiggen = (document.cookie.indexOf("wide=1") !== -1),
            s_format   = Object.keys(quality)[0],
            s_speed    = 1,
            s_time     = 0,
            s_volume   = 1,
            s_muted    = false;
        return Object.create(null, {
            embiggen: {
                get: function () { return s_embiggen; },
                set: function (x) {
                    if (typeof x === "boolean") {
                        s_embiggen = x;
                        chrome.storage.local.set({"embiggen": x});
                    }
                }
            },
            format: {
                get: function () { return s_format; },
                set: function (x) {
                    if (typeof x === "string" && source.hasOwnProperty(x)) {
                        s_format = x;
                    }
                }
            },
            speed: {
                get: function () { return s_speed; },
                set: function (x) {
                    var s = parseFloat(x);
                    if (!isNaN(s)) {
                        s_speed = s;
                    }
                }
            },
            time: {
                get: function () { return s_time; },
                set: function (x) {
                    var t = parseInt(x, 10);
                    if (!isNaN(t)) {
                        s_time = t;
                    }
                }
            },
            volume: {
                get: function () { return s_volume; },
                set: function (x) {
                    var v = parseFloat(x);
                    if (!isNaN(v)) {
                        s_volume = v;
                        chrome.storage.local.set({"volume": v});
                    }
                }
            },
            muted: {
                get: function () { return s_muted; },
                set: function (x) {
                    if (typeof x === "boolean") {
                        s_muted = x;
                        chrome.storage.local.set({"muted": x});
                    }
                }
            }
        });
    }());

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // YouTube Elements
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    yt_container = document.querySelector("#watch7-container");
    yt_content   = document.querySelector("#watch7-content");
    yt_watch     = document.querySelector("#player");
    yt_player    = document.querySelector("#player-api");
    yt_next      = document.querySelector("#watch7-playlist-bar-next-button");
    yt_auto      = document.querySelector("#watch7-playlist-bar-autoplay-button");

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // HTML5 Video
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    video = document.createElement("video");
    video.setAttribute("id", "crx-html5-video");
    video.setAttribute("controls", "");
    video.setAttribute("preload", "");
    video.setAttribute("autoplay", "");

    player = document.createElement("div");
    player.setAttribute("id", "crx-html5-player");
    player.classList.add("player-height", "player-width", "off-screen-target", "watch-content");
    player.appendChild(video);

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // HTML5 Video Events
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
                t = location.href;
            if (/[&|\?|#]t=/.test(t)) {
                try { m = parseInt(t.match(/[&|\?|#]t=.*?(\d*)m/)[1], 10); } catch (ignore) {}
                try { s = parseInt(t.match(/[&|\?|#]t=.*?(\d*)s/)[1], 10); } catch (ignore) {}
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
        if (yt_next && yt_next.href && yt_auto && yt_auto.classList.contains("yt-uix-button-toggled")) {
            window.location.href = yt_next.href;
        }
    });

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Toolbar
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

    speed = document.createElement("select");
    speed.setAttribute("id", "crx-html5-speed");
    speed.setAttribute("class", "yt-uix-tooltip");
    speed.setAttribute("data-tooltip-text", chrome.i18n.getMessage("speed"));
    speed.setAttribute("title", chrome.i18n.getMessage("speed"));

    ["0.25", "0.5", "1", "1.5", "2"].forEach(function (k) {
        var o = document.createElement("option");
        o.setAttribute("value", k);
        if (k === "1") {
            o.setAttribute("selected", "");
            o.textContent = "Normal";
        } else {
            o.textContent = k + "x";
        }
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

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Toolbar Events
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function togglePlayer() {
        if (document.contains(video)) {
            document.body.classList.remove("crx-html5");
            enabled.checked = false;
            enabled.setAttribute("data-tooltip-text", chrome.i18n.getMessage("enable"));
            enabled.setAttribute("title", chrome.i18n.getMessage("enable"));
            yt_watch.replaceChild(yt_player, player);
        } else {
            document.body.classList.add("crx-html5");
            enabled.checked = true;
            enabled.setAttribute("data-tooltip-text", chrome.i18n.getMessage("disable"));
            enabled.setAttribute("title", chrome.i18n.getMessage("disable"));
            yt_watch.replaceChild(player, yt_player);
            video.setAttribute("src", source[state.format]);
        }
    }

    function toggleSize() {
        if (embiggen.checked) {
            embiggen.setAttribute("data-tooltip-text", chrome.i18n.getMessage("shrink"));
            embiggen.setAttribute("title", chrome.i18n.getMessage("shrink"));
            yt_container.classList.add("watch-wide");
            yt_watch.classList.add("watch-medium", "watch-playlist-collapsed");
        } else {
            embiggen.setAttribute("data-tooltip-text", chrome.i18n.getMessage("embiggen"));
            embiggen.setAttribute("title", chrome.i18n.getMessage("embiggen"));
            yt_container.classList.remove("watch-wide");
            yt_watch.classList.remove("watch-medium", "watch-large", "watch-playlist-collapsed");
        }
    }

    enabled.addEventListener("change", function () {
        togglePlayer();
    });

    format.addEventListener("change", function () {
        state.format = this.value;
        video.setAttribute("src", source[state.format]);
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
        var ext = (parseInt(state.format, 10) < 43) ? ".mp4" : ".webm";
        this.setAttribute("download", document.title.replace(/^\u25B6\s/, "") + ext);
        this.setAttribute("href", source[state.format]);
    });

    reload.addEventListener("click", function () {
        video.setAttribute("src", source[state.format]);
    });

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Source
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    decoder = null;
    decrypt = false;

    function parseStreamMap() {
        var streamMap  = {},
            streamData = document.body.innerHTML.match(/"url_encoded_fmt_stream_map":\s"([^"]+)"/);

        if (streamData) {
            streamData = streamData[1].split(",");
        } else {
            streamData = document.body.innerHTML.match(/url_encoded_fmt_stream_map=([^;]+)/);
            if (streamData) {
                streamData = decodeURIComponent(streamData[1]).split(",");
            } else {
                if (document.querySelector("#player-unavailable").classList.contains("hid")) {
                    return window.location.reload(true);
                }
            }
        }

        streamData.forEach(function (stream) {
            var str = decodeURIComponent(stream),
                tag = str.match(/itag=(\d{0,2})/),
                url = str.match(/url=(.*?)(\\u0026|$)/),
                sig = str.match(/[sig|s]=([A-Z0-9]*\.[A-Z0-9]*(?:\.[A-Z0-9]*)?)/);

            if (tag && url && sig) {
                tag = tag[1];
                url = url[1];
                sig = sig[1];
            } else {
                return window.location.reload(true);
            }

            if (quality.hasOwnProperty(tag)) {
                url = url.replace(/[&|\?]itag=\d{0,2}/g, function (match) {
                    return match.indexOf("?") !== -1 ? "?" : "";
                });
                if (str.indexOf("sig=") === -1) {
                    if (typeof decoder === "function") {
                        sig = decoder(sig);
                    } else {
                        decrypt = true;
                    }
                }
                streamMap[tag] = decodeURIComponent(url) + "&itag=" + tag + "&signature=" + sig;
            }
        });

        source = streamMap;

        format.options.length = 0;

        Object.keys(source).forEach(function (k) {
            var o = document.createElement("option");
            if (k === state.format) {
                o.setAttribute("selected", "");
            }
            o.setAttribute("value", k);
            o.textContent = quality[k];
            format.appendChild(o);
        });
    }

    function decodeStreamMap(f) {
        try {
            eval("decoder = " + f);
        } catch (e) {
            decoder = function (s) {
                return s;
            };
        }
        parseStreamMap();
        video.setAttribute("src", source[state.format]);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Options
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function init(options) {

        // (bool)   space      = use shift+space to play/pause video
        // (bool)   prioritise = Prioritise quaility over codec
        // (string) format     = preferred format
        // (string) script     = YouTube asset script
        // (string) decode     = YouTube signature decode function
        // (float)  volume     = volume
        // (bool)   muted      = muted
        // (bool)   autoplay   = autoplay
        // (bool)   embiggen   = embiggen video player
        // (bool)   enabled    = auto switch to html5 video

        var script, xhr, observer;

        // Keyboard controls //////////////////////////////////////////////////////////////////////////////////////////

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

        // Preferred format ///////////////////////////////////////////////////////////////////////////////////////////

        if (typeof options.format === "string") {
            if (options.prioritise) {
                // 1080p
                if (options.format === "37" || options.format === "46") {
                    if (options.format === "37") {
                        options.format = source.hasOwnProperty("37") ? "37" : source.hasOwnProperty("46") ? "46" : "22";
                    } else {
                        options.format = source.hasOwnProperty("46") ? "46" : source.hasOwnProperty("37") ? "37" : "45";
                    }
                }
                // 720p
                if (options.format === "22" || options.format === "45") {
                    if (options.format === "22") {
                        options.format = source.hasOwnProperty("22") ? "22" : source.hasOwnProperty("45") ? "45" : "44";
                    } else {
                        options.format = source.hasOwnProperty("45") ? "45" : source.hasOwnProperty("22") ? "22" : "44";
                    }
                }
                // SD
                if (options.format === "44" || options.format === "18") {
                    if (options.format === "44") {
                        options.format = source.hasOwnProperty("44") ? "44" : source.hasOwnProperty("18") ? "18" : "43";
                    }
                }
            } else {
                // MP4
                if (options.format === "37" || options.format === "22") {
                    if (options.format === "37" && !source.hasOwnProperty(options.format)) { options.format = "22"; }
                    if (options.format === "22" && !source.hasOwnProperty(options.format)) { options.format = "18"; }
                }
                // WebM
                if (options.format === "46" || options.format === "45" || options.format === "44") {
                    if (options.format === "46" && !source.hasOwnProperty(options.format)) { options.format = "45"; }
                    if (options.format === "45" && !source.hasOwnProperty(options.format)) { options.format = "44"; }
                    if (options.format === "44" && !source.hasOwnProperty(options.format)) { options.format = "43"; }
                }
            }
            state.format = options.format;
        }

        [].slice.call(format.options).some(function (o) {
            if (o.value === state.format) {
                o.selected = true;
                return true;
            }
        });

        // Decrypt signature //////////////////////////////////////////////////////////////////////////////////////////

        if (decrypt) {

            try {
                script = document.body.innerHTML.match(/"js":\s"([^"]+)"/)[1].replace(/^http:/, "https:");
            } catch (ignore) {}

            if (script && (!options.script || !options.decode || script !== options.script)) {

                xhr = new XMLHttpRequest();
                xhr.open("GET", script, true);
                xhr.onload = function () {

                    var response = xhr.responseText;

                    if (!response) {
                        return;
                    }

                    var mainMatch, mainName, mainCodeMatch, mainCode, mainArgu,
                        swapMatch, swapName, swapCodeMatch, swapCode,
                        decodeFunction;

                    mainMatch = response.match(/\.signature=(\w+)\(/);
                    mainName = mainMatch ? mainMatch[1] : null;

                    if (!mainName) {
                        return;
                    }

                    mainCodeMatch = response.match(new RegExp("function\\s" + mainName + "\\((.*?)\\){([^}]+)}", "i"));

                    mainCode = mainCodeMatch ? mainCodeMatch[2] : null;
                    mainArgu = mainCodeMatch ? mainCodeMatch[1] : null;

                    if (!mainCode || !mainArgu) {
                        return;
                    }

                    swapMatch = mainCode.match(/\=\s*([\w]+)\s*\([\w]+,[\w]+\)/);
                    swapName  = swapMatch ? swapMatch[1] : null;
                    swapCode  = "";

                    if (swapName) {
                        swapCodeMatch = response.match(new RegExp("function\\s" + swapName + "\\(.*?\\){[^}]+}", "i"));
                        swapCode = swapCodeMatch ? swapCodeMatch[0] : "";
                    }

                    decodeFunction = "function (" + mainArgu + ") {" + swapCode + mainCode + "};";

                    decodeStreamMap(decodeFunction);

                    chrome.storage.local.set({"script": script});
                    chrome.storage.local.set({"decode": decodeFunction});
                };
                xhr.send();
            } else {
                if (options.decode) {
                    decodeStreamMap(options.decode);
                }
            }
        }

        // Volume /////////////////////////////////////////////////////////////////////////////////////////////////////

        if (!isNaN(parseFloat(options.volume))) {
            state.volume = options.volume;
            video.volume = state.volume;
        }

        if (typeof options.muted === "boolean") {
            state.muted = options.muted;
            video.muted = state.muted;
        }

        // Autoplay ///////////////////////////////////////////////////////////////////////////////////////////////////

        if (options.autoplay === false) {
            video.removeAttribute("autoplay");
        }

        // Player size ////////////////////////////////////////////////////////////////////////////////////////////////

        if (typeof options.embiggen === "boolean") {
            state.embiggen = options.embiggen;
            embiggen.checked = options.embiggen;
            toggleSize();
        }

        // Auto swap //////////////////////////////////////////////////////////////////////////////////////////////////

        if (options.enabled === true) {
            observer = new MutationObserver(function (mutations) {
                mutations.some(function () {
                    var v = yt_player.querySelector("video");
                    if (v) {
                        v.addEventListener("timeupdate", function () {
                            if (!document.contains(this)) {
                                this.pause();
                            }
                        });
                        observer.disconnect();
                        return true;
                    }
                });
            });
            observer.observe(yt_player, {
                subtree: true,
                childList: true
            });
            togglePlayer();
        }

    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Run
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    parseStreamMap();

    yt_content.insertBefore(toolbar, yt_content.firstElementChild);

    chrome.storage.local.get(null, init);
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// YouTube observer (for dynamic site)
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var youtube_container = document.getElementById("page-container"),
    youtube_content   = document.getElementById("content"),
    youtube_observer  = null;

if (/class[\w\s"'-=]+spf\-link/.test(youtube_container.innerHTML)) {
    var youtube_observer = new MutationObserver(function (mutations) {
        "use strict";
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length) {
                [].some.call(mutation.addedNodes, function (node) {
                    if (node.id === "watch7-container") {
                        main();
                        return true;
                    }
                });
            }
        });
    });
    youtube_observer.observe(youtube_content, {
        childList: true,
        subtree: true
    });
}

if (/^https?:\/\/www\.youtube.com\/watch\?/.test(window.location.href)) {
    main();
}
