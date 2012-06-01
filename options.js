/*jslint browser: true, es5: true, indent: 4, plusplus: true*/
/*global localStorage */

"use strict";

var swap = document.getElementById('swap'),
    itag = document.getElementById('itag'),
    fmts = document.getElementById('fmts'),
    ls_swap = localStorage.swap,
    ls_itag = localStorage.itag,
    i = 0,
    j = 0;

swap.addEventListener('change', function () {
    var s = this.options[this.selectedIndex].value;
    if (parseInt(s, 10)) {
        fmts.removeAttribute('hidden');
    } else {
        fmts.setAttribute('hidden');
    }
    localStorage.swap = s;
});

itag.addEventListener('change', function () {
    localStorage.itag = this.options[this.selectedIndex].value;
});

if (!ls_swap) {
    localStorage.swap = swap.options[swap.selectedIndex].value;
} else {
    for (i = 0; i < swap.options.length; ++i) {
        if (swap.options[i].value === ls_swap) {
            swap.selectedIndex = i;
            if (parseInt(ls_swap, 10)) {
                fmts.removeAttribute('hidden');
            }
        }
    }
}

if (!ls_itag) {
    localStorage.itag = itag.options[itag.selectedIndex].value;
} else {
    for (j = 0; j < itag.options.length; ++j) {
        if (itag.options[j].value === ls_itag) {
            itag.selectedIndex = j;
        }
    }
}
