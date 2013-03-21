/*jslint browser: true, es5: true, indent: 4, regexp: true */
/*global chrome */

"use strict";

var format, streamMap, video, wrapper, button, list, resize_s, resize_m, resize_l, popout, ytWatchContainer, ytWatchPlayer, ytWatchActions;

ytWatchContainer = document.getElementById("watch-container") || document.getElementById("watch7-container");
ytWatchPlayer = document.getElementById("player-api") || document.getElementById("watch-player") || document.getElementById("watch7-player");
ytWatchActions = document.getElementById("watch-actions") || document.getElementById("watch7-secondary-actions");


// supported formats

format = {
    18: "MP4 360p",
    22: "MP4 720p (HD)",
    37: "MP4 1080p (HD)",
    43: "WebM 360p",
    44: "WebM 480p",
    45: "WebM 720p (HD)",
    46: "WebM 1080p (HD)"
};


// parse Stream Map

streamMap = {};

document.body.innerHTML
    .match(/\"url_encoded_fmt_stream_map\":\s*\"([^\"]+)\"/)[0]
    .split(",")
    .forEach(function (s) {
        var tag = s.match(/itag=(\d{0,2})/)[1],
            sig = s.match(/sig=([A-Z0-9]*\.[A-Z0-9]*)/)[1];
        decodeURIComponent(s).split("\\u0026").some(function (e) {
            if (e.match(/^url=/) && format.hasOwnProperty(tag)) {
                streamMap[tag] = e.substring(4) + "&signature=" + sig;
                return true;
            }
        });
    });


// HTML5 video element

video = document.createElement("video");
video.controls = true;
video.autoplay = true;
video.setAttribute("width", "100%");
video.setAttribute("height", "100%");

video.addEventListener("dblclick", function () {
    this.webkitRequestFullScreen();
});

video.addEventListener("loadedmetadata", function () {
    var m = null,
        s = null,
        t = location.hash.substring(1),
        offset = 0;

    if (t.indexOf("t=") !== -1) {
        m = t.match(/(\d*)m/);
        if (Array.isArray(m)) {
            m = parseInt(m[1], 10);
            offset += (m * 60);
        }
        s = t.match(/(\d*)s/);
        if (Array.isArray(s)) {
            s = parseInt(s[1], 10);
            offset += s;
        }
    }
    this.currentTime = offset;
});

function playVideo(src) {
    video.setAttribute("src", src);
    video.load(); // ?
    if (!ytWatchPlayer.contains(video)) {
        // chrome bug? <video> continues to download and play after being removed using innerHTML
        var v = ytWatchPlayer.querySelector("video.video-stream");
        if (v) {
            v.setAttribute("src", null);
            v.load();
        }
        ytWatchPlayer.innerHTML = "";
        ytWatchPlayer.appendChild(video);
    }
}


// create button and menu

function createMenuItem(text, url, icon, onclick) {
    var l = document.createElement("li"),
        a = document.createElement("a");
    if (url) {
        a.setAttribute("href", url);
        a.setAttribute("style", "text-decoration:none;");
        a.innerHTML = '<span class="yt-uix-button-menu-item">' + text + '</span>';
        a.addEventListener("click", function (e) {
            e.preventDefault();
            playVideo(url);
        });
        l.appendChild(a);
    } else {
        l.innerHTML = '<span class="yt-uix-button-menu-item" style="background-image: url(' + chrome.extension.getURL(icon) + '); background-position: 4px center; background-repeat: no-repeat;">' + text + '</span>';
        l.addEventListener("click", onclick);
    }
    return l;
}

function resizeContainer(size) {
    ytWatchContainer.classList.remove("watch-wide");
    ytWatchContainer.classList.remove("watch-small");
    ytWatchContainer.classList.remove("watch-medium");
    ytWatchContainer.classList.remove("watch-large");
    if (!size || size === "small") {
        ytWatchContainer.classList.add("watch-small");
    } else {
        ytWatchContainer.classList.add("watch-wide");
        ytWatchContainer.classList.add("watch-" + size);
    }
}

wrapper = document.createElement("span");

button = document.createElement("button");
button.setAttribute("class", "yt-uix-button yt-uix-button-default yt-uix-button-empty");
button.setAttribute("role", "button");
button.setAttribute("type", "button");
button.innerHTML = '<span class="yt-uix-button-icon-wrapper"><img src="' + chrome.extension.getURL("images/icon.png") + '"><span class="yt-uix-button-valign"></span><span>';

list = document.createElement("ol");
list.setAttribute("style", "display:none;");
list.setAttribute("class", "yt-uix-button-menu");

resize_s = createMenuItem("Small", null, "images/resize_s.png", function () {
    resizeContainer("small");
});

resize_m = createMenuItem("Medium", null, "images/resize_m.png", function () {
    resizeContainer("medium");
});
resize_l = createMenuItem("Large", null, "images/resize_l.png", function () {
    resizeContainer("large");
});

// popout = createMenuItem("Popout player", null, "images/popout.png", function () {
//     var w = window.getComputedStyle(ytWatchPlayer, null).getPropertyValue("width"),
//         h = window.getComputedStyle(ytWatchPlayer, null).getPropertyValue("height");
//     window.open());
// });
// list.appendChild(popout);

Object.keys(streamMap).forEach(function (tag) {
    var li = createMenuItem(format[tag], streamMap[tag], "resize");
    list.appendChild(li);
});

list.appendChild(resize_s);
list.appendChild(resize_m);
list.appendChild(resize_l);
button.appendChild(list);
wrapper.appendChild(button);

if (ytWatchActions.id === "watch-actions") {
    ytWatchActions.appendChild(wrapper);
} else {
    ytWatchActions.insertBefore(wrapper, ytWatchActions.firstChild);
}


// automatically swap to HTML5 player?

chrome.extension.sendMessage("getLocalStorage", function (ls) {
    if (ls) {
        var swap = parseInt(ls.swap, 10),
            itag = parseInt(ls.itag, 10),
            auto = parseInt(ls.auto, 10);
        if (auto === 0) {
            video.autoplay = false;
        }
        if (swap && itag) {
            if (itag === 37 && !streamMap.hasOwnProperty(itag)) { itag = 22;   }
            if (itag === 22 && !streamMap.hasOwnProperty(itag)) { itag = 18;   }
            if (itag === 18 && !streamMap.hasOwnProperty(itag)) { itag = null; }
            if (itag === 46 && !streamMap.hasOwnProperty(itag)) { itag = 45;   }
            if (itag === 45 && !streamMap.hasOwnProperty(itag)) { itag = 44;   }
            if (itag === 44 && !streamMap.hasOwnProperty(itag)) { itag = 43;   }
            if (itag === 43 && !streamMap.hasOwnProperty(itag)) { itag = null; }
            if (itag) {
                playVideo(streamMap[itag]);
            }
        }
    }
});
