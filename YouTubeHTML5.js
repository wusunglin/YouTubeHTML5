/*jslint browser: true, es5: true, indent: 4, regexp: true */
/*global chrome, localStorage */

"use strict";

var streamMap, video, btn;

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

function play(src) {
    var c = document.getElementById('watch-player'),
        w = window.getComputedStyle(c, null).getPropertyValue('width'),
        h = window.getComputedStyle(c, null).getPropertyValue('height');

    if (!c.contains(video)) {
        c.innerHTML = "";
        c.appendChild(video);
    }

    video.setAttribute('width', w);
    video.setAttribute('height', h);
    video.setAttribute('src', src);
    video.load(); // ?
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

Object.keys(streamMap).forEach(function (tag) {

    var format, li, a, span;

    format = {
        18 : 'MP4 360p',
        22 : 'MP4 720p (HD)',
        37 : 'MP4 1080p (HD)',
        43 : 'WebM 360p',
        44 : 'WebM 480p',
        45 : 'WebM 720p (HD)',
        46 : 'WebM 1080p (HD)',
    };

    if (format[tag]) {

        li = document.createElement('li');

        a = document.createElement('a');
        a.setAttribute('style', 'text-decoration:none;');
        a.setAttribute('href', streamMap[tag]);
        a.onclick = function () {
            play(streamMap[tag]);
            return false;
        };

        span = document.createElement('span');
        span.setAttribute('class', 'yt-uix-button-menu-item');
        span.textContent = format[tag];

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
            itag = parseInt(ls.itag, 10);
        if (swap) {
            if (itag === 22) { // MP4 HD availability check
                if (!streamMap.hasOwnProperty(itag)) {
                    itag = (streamMap.hasOwnProperty(18)) ? 18 : false;
                }
            }
            if (itag === 45) { // WebM HD availability check
                if (!streamMap.hasOwnProperty(itag)) {
                    itag = (streamMap.hasOwnProperty(43)) ? 43 : false;
                }
            }
            if (itag) {
                document.getElementById('watch-player').innerHTML = "";
                document.getElementById('watch-player').appendChild(video);
                play(streamMap[itag]);
            }
        }
    }
});
