/*
This file is part of PhasorViz
(https://www.github.com/jeanpaulrichter/phasorviz)

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 3
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
*/

"use strict";

export { Color };

/*
    Color
        r           int [0-255]         red
        g           int [0-255]         green
        b           int [0-255]         blue
        a           float [0-1]         alpha
        hex         string              i.e. '#001122'
        rgba        string              i.e. 'rgba(24, 111, 200, 0.64)'

        Color( init )                   initialized by Color object or string, defaults to black
        set( s )                        set Color by string or other Color object
        equals( obj )                   returns true if obj has the same color
*/


class Color {
    constructor(s)
    {
        if(typeof s === 'undefined' || !this.set(s)) {
            this.hex = "#000000";
            this.rgba = "rgba(0, 0, 0, 1)";
            this.r = 0;
            this.g = 0;
            this.b = 0;
            this.a = 1;
        }
    }

    set(s)
    {
        if(typeof s === 'string') {
            if(s[0] == '#') {
                if(s.length == 7) {
                    let tr = parseInt(s.substr(1,2), 16);
                    let tg = parseInt(s.substr(3,2), 16);
                    let tb = parseInt(s.substr(5,2), 16);
                    if(!isNaN(tr) && !isNaN(tg) && ! isNaN(tb) &&
                        Number.isInteger(tr) && Number.isInteger(tg) && Number.isInteger(tb) &&
                        tr >= 0 && tr <= 255 && tg >= 0 && tg <= 255 && tb >= 0 && tb <= 255) {
                        this.hex = s;
                        this.alpha = 1;
                        this.r = tr;
                        this.g = tg;
                        this.b = tb;
                        this.rgba = 'rgba(' + this.r + ', ' + this.g + ', ' + this.b + ', ' + this.a + ')';
                        return true;
                    }
                }
            } else {
                var match = s.match(/^rgba?\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3}),? ?((0|1)\.?\d*?)?\)$/);
                if(match) {
                    var hex_temp = '#';
                    var v = [];
                    for(var i = 1; i < 4; i++) {
                        v[i - 1] = Number(match[i]);
                        var t = v[i - 1].toString(16);
                        hex_temp += (t.length == 1) ? ('0' + t) : t;
                    }
                    this.hex = hex_temp;
                    this.r = v[0];
                    this.g = v[1];
                    this.b = v[2];
                    this.a = match[4] ? Number(match[4]) : 1;
                    this.rgba = 'rgba(' + this.r + ', ' + this.g + ', ' + this.b + ', ' + this.a + ')';
                    return true;
                }
            }
            return false;
        } else if(typeof s === 'object') {
            if(typeof s.r === 'number' && Number.isInteger(s.r) && s.r >= 0 && s.r <= 255 &&
               typeof s.g === 'number' && Number.isInteger(s.g) && s.g >= 0 && s.g <= 255 &&
               typeof s.b === 'number' && Number.isInteger(s.b) && s.b >= 0 && s.b <= 255 &&
               typeof s.a === 'number' && s.a >= 0 && s.a <= 1)
            {
                this.r = s.r;
                this.g = s.g;
                this.b = s.b;
                this.a = s.a;
                this.rgba = 'rgba(' + this.r + ', ' + this.g + ', ' + this.b + ', ' + this.a + ')';
                let hex_temp = '#';
                let t = this.r.toString(16);
                hex_temp += (t.length == 1) ? ('0' + t) : t;
                t = this.g.toString(16);
                hex_temp += (t.length == 1) ? ('0' + t) : t;
                t = this.b.toString(16);
                hex_temp += (t.length == 1) ? ('0' + t) : t;
                this.hex = hex_temp;
                return true;
            } else {
                return false;
            }
        }
    }

    equals(x)
    {
        return (this.r === x.r && this.g === x.g && this.b === x.b && this.a === x.a);
    }
}