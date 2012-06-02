/*jslint browser: true, es5: true, indent: 4, regexp: true */
/*global chrome, localStorage */

"use strict";

var format, streamMap, video, btn;

// support formats;

format = {
    label : {
        18 : "MP4 360p",
        22 : "MP4 720p (HD)",
        37 : "MP4 1080p (HD)",
        43 : "WebM 360p",
        44 : "WebM 480p",
        45 : "WebM 720p (HD)",
        46 : "WebM 1080p (HD)"
    },
    mp4 : {
        "360p" : 18,
        "720p" : 22,
        "1080p" : 37,
    },
    WebM : {
        "360p" : 43,
        "480p" : 44,
        "720p" : 45,
        "1080p" : 46
    }
};

// parse Stream Map

streamMap = {};

document.body.innerHTML
    .match(/\"url_encoded_fmt_stream_map\":\s*\"([^\"]+)\"/)[1]
    .split(",")
    .forEach(function (s) {
        var tag = parseInt(s.match(/itag=(\d{0,2})/)[1], 10),
            url = decodeURIComponent(s).split("\\u0026")[0].substring(4);
        streamMap[tag] = url;
    });

// HTML5 video element

video = document.createElement('video');
video.controls = true;
video.autoplay = true;
video.addEventListener('dblclick', function () {
    this.webkitRequestFullScreen();
});

function play(src) {
    var c = document.getElementById('watch-player'),
        w = window.getComputedStyle(c, null).getPropertyValue('width'),
        h = window.getComputedStyle(c, null).getPropertyValue('height'),
        y = null;

    video.setAttribute('width', w);
    video.setAttribute('height', h);
    video.setAttribute('src', src);
    video.load(); // ?

    if (!c.contains(video)) {
        // chrome bug? <video> continues to download  and play after being removed using innerHTML
        y = c.querySelector('video.video-stream');
        if (y) {
            y.setAttribute('src', null);
            y.load();
        }
        c.innerHTML = "";
        c.appendChild(video);
    }
}

// place button below video

btn = {
    button : document.createElement('button'),
    wrap   : document.createElement('span'),
    icon   : document.createElement('span'),
    arrow  : document.createElement('img'),
    list   : document.createElement('ol'),
};

btn.icon.setAttribute('class', 'yt-uix-button-content');
btn.icon.innerHTML = '<img src="' + chrome.extension.getURL("16.png") + '" />';

btn.arrow.setAttribute('style', 'vertical-align:baseline;');
btn.arrow.setAttribute('class', 'yt-uix-button-arrow');

btn.list.setAttribute('style', 'display:none;');
btn.list.setAttribute('class', 'yt-uix-button-menu');

Object.keys(streamMap).forEach(function (t) {

    var li, a, span;

    if (format.label[t]) {

        li = document.createElement('li');

        a = document.createElement('a');
        a.setAttribute('style', 'text-decoration:none;');
        a.setAttribute('href', streamMap[t]);
        a.onclick = function () {
            play(streamMap[t]);
            return false;
        };

        span = document.createElement('span');
        span.setAttribute('class', 'yt-uix-button-menu-item');
        span.textContent = format.label[t];

        a.appendChild(span);
        li.appendChild(a);
        btn.list.appendChild(li);
    }
});

btn.wrap.appendChild(btn.icon);
btn.wrap.appendChild(btn.arrow);
btn.wrap.appendChild(btn.list);

btn.button.setAttribute('class', 'yt-uix-button yt-uix-button-default yt-uix-tooltip yt-uix-tooltip-reverse');
btn.button.setAttribute('onclick', 'return false;');
btn.button.appendChild(btn.wrap);

document.getElementById('watch-actions').appendChild(btn.button);

// automatically swap to HTML5 player?

chrome.extension.sendRequest("getLocalStorage", function (ls) {
    if (ls) {
        var swap = parseInt(ls.swap, 10),
            itag = parseInt(ls.itag, 10),
            auto = parseInt(ls.auto, 10);
        if (auto === 0) {
            video.autoplay = false;
        }
        if (swap) {
            if (itag === format.mp4["1080p"]) {
                itag = (streamMap.hasOwnProperty(itag)) ? format.mp4["1080p"] : format.mp4["720p"];
            }
            if (itag === format.mp4["720p"]) {
                itag = (streamMap.hasOwnProperty(itag)) ? format.mp4["720p"] : format.mp4["360p"];
            }
            if (itag === format.mp4["360p"]) {
                itag = (streamMap.hasOwnProperty(itag)) ? format.mp4["360p"] : null;
            }
            if (itag === format.WebM["1080p"]) {
                itag = (streamMap.hasOwnProperty(itag)) ? format.WebM["1080p"] : format.WebM["720p"];
            }
            if (itag === format.WebM["720p"]) {
                itag = (streamMap.hasOwnProperty(itag)) ? format.WebM["720p"] : format.WebM["480p"];
            }
            if (itag === format.WebM["480p"]) {
                itag = (streamMap.hasOwnProperty(itag)) ? format.WebM["480p"] : format.WebM["360p"];
            }
            if (itag === format.WebM["360p"]) {
                itag = (streamMap.hasOwnProperty(itag)) ? format.WebM["360p"] : null;
            }
            if (itag) {
                play(streamMap[itag]);
            }
        }
    }
});
