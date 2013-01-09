/*jslint browser: true, es5: true, indent: 4, plusplus: true*/
/*global localStorage */

"use strict";

var swap = document.getElementById("swap"),
    itag = document.getElementById("itag"),
    auto = document.getElementById("auto"),
    fmts = document.getElementById("fmts");

swap.addEventListener("change", function () {
    var s = this.options[this.selectedIndex].value;
    if (parseInt(s, 10)) {
        fmts.removeAttribute("hidden");
    } else {
        fmts.setAttribute("hidden");
    }
    localStorage.swap = s;
});

itag.addEventListener("change", function () {
    localStorage.itag = this.options[this.selectedIndex].value;
});

auto.addEventListener("change", function () {
    localStorage.auto = this.options[this.selectedIndex].value;
});

function init(name, el) {
    var i = 0,
        s = localStorage[name];
    if (!s) {
        localStorage[name] = el.options[el.selectedIndex].value;
    } else {
        for (i = 0; i < el.options.length; ++i) {
            if (el.options[i].value === s) {
                el.selectedIndex = i;
            }
        }
    }
}

init("swap", swap);
init("itag", itag);
init("auto", auto);

if (parseInt(localStorage.swap, 10)) {
    fmts.removeAttribute("hidden");
}
