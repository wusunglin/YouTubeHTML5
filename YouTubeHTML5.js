/*jslint browser: true, es5: true, indent: 4, regexp: true */
/*global chrome */

"use strict";

var format, streamMap, video, wrap, button, list, container;

format = {
    18 : "MP4 360p",
    22 : "MP4 720p (HD)",
    37 : "MP4 1080p (HD)",
    43 : "WebM 360p",
    44 : "WebM 480p",
    45 : "WebM 720p (HD)",
    46 : "WebM 1080p (HD)"
};

// parse Stream Map

streamMap = {};

document.body.innerHTML
    .match(/\"url_encoded_fmt_stream_map\":\s*\"([^\"]+)\"/)[1]
    .split(",")
    .forEach(function (s) {
        var tag = s.match(/itag=(\d{0,2})/)[1],
            sig = s.match(/sig=(.*)\\u0026/)[1],
            url = decodeURIComponent(s).split("\\u0026")[1].substring(4) + "&signature=" + sig;
        if (format.hasOwnProperty(tag)) {
            streamMap[tag] = url;
        }
    });

// HTML5 video element

video = document.createElement("video");
video.controls = true;
video.autoplay = true;

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

function play(src) {
    var c = document.getElementById("watch-player") || document.getElementById("watch7-player"),
        w = window.getComputedStyle(c, null).getPropertyValue("width"),
        h = window.getComputedStyle(c, null).getPropertyValue("height"),
        y = null;

    video.setAttribute("width", w);
    video.setAttribute("height", h);
    video.setAttribute("src", src);
    video.load(); // ?

    if (!c.contains(video)) {
        // chrome bug? <video> continues to download and play after being removed using innerHTML
        y = c.querySelector("video.video-stream");
        if (y) {
            y.setAttribute("src", null);
            y.load();
        }
        c.innerHTML = "";
        c.appendChild(video);
    }
}

// create button and menu

wrap = document.createElement("span");

button = document.createElement("button");
button.setAttribute("class", "yt-uix-button yt-uix-button-default yt-uix-button-empty")
button.setAttribute("role", "button");
button.setAttribute("type", "button");
button.innerHTML = '<span class="yt-uix-button-icon-wrapper">' +
    '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAZZJREFUeNqUUzGPAUEYfbuEkJCNi+z5AxoNrUrkinNK/oBSwg9RXVR6lYL6csmpLteiUigpHBeXRSHY5eYbO5vZ41y85O1kNt/75r1vdpXj8YhisWgC8OA2WO1226vamy/cDq7x2psZ430gEEAoFHIqFEUBOZSxXq+x2WyExtUA6XQa5XL56rGNRgPdbvesAbdjGMap22yG8XgMVVURDAZdLiaTycUIU3osl0u+GY1GqNfr/81g+qeDeDyOUqkEj+d0MZZlOapWqyVm4HLwKTvQdR35fP7isc1mE7JGNJjTY7/fo1ar8ekTaAaEw+GAarUK0zRlN/OzBoRcLodoNMoF8nX6/X4sFgvZDNeosh2Cz+dDLBZDJpNBOByGpmnIZrPcjYh4KYLzJa5WK75WKhV+fSKOPCNZo4iiQqFA/iJkNZFIIJlMIpVK8fz9fh+DwQDD4RC73Y50351O54603l+ZItvtFr1ej/MKnJmp0stnxg8a+rU/kPHdroUrggCLorHlgfGJ8dFu+Mr4wvjGrBuilrQ/AgwAO9GrsvF6bPwAAAAASUVORK5CYII=">' +
    '<span class="yt-uix-button-valign"></span>' +
    '<span>';

list = document.createElement("ol");
list.setAttribute("style", "display:none;");
list.setAttribute("class", "yt-uix-button-menu");

Object.keys(streamMap).forEach(function (tag) {
    var a = document.createElement("a"),
        li = document.createElement("li"),
        url = streamMap[tag];

    a.setAttribute("style", "text-decoration:none;");
    a.setAttribute("href", url);
    a.innerHTML = '<span class="yt-uix-button-menu-item">' + format[tag] + '</span>';
    a.onclick = function () {
        play(url);
        return false;
    };

    li.appendChild(a);
    list.appendChild(li);
});

// place button below video

container = document.getElementById("watch-actions") || document.getElementById("watch7-secondary-actions");

if (container) {
    button.appendChild(list);
    wrap.appendChild(button);
    if (container.id === "watch-actions") {
        container.appendChild(wrap);
    } else {
        container.insertBefore(wrap, container.firstChild);
    }
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
                play(streamMap[itag]);
            }
        }
    }
});
