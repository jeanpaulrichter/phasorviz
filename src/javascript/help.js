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

'use strict';

import { constants } from './constants.js';

export { help };

/* a few helper functions */

const entityMap = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
	'/': '&#x2F;'
};

const help = {
	'round' : function(x)
    {
        if(x > 1) {
            x = Math.round( x * constants.rounding_precision ) / constants.rounding_precision;
        } else if(x < 1) {
            let s = '' + x;
            let i = 0;
            for(; i < s.length; i++) {
                if(s[i] != '0' && s[i] != '.' && s[i] != '-') {
                    break;
                }
            }
            if(s[0] === '-') {
                i--;
            }
            let p = Math.pow(10, i) * (constants.rounding_precision / 100) ;
            x = Math.round( x * p ) / p;
        }
        return x;
    },
	'escapeHtml' : function( string )
	{
		return String(string).replace(/[&<>"'/]/g, function (s) {
			return entityMap[s];
		});
	},
	'checkObj' : function( x )
	{
		if( typeof x !== 'object' ) {
			throw new Error();
		}
	},
    'checkInt' : function( x, min, max )
	{
		if( typeof x !== 'number' || !Number.isInteger(x) || x < min || x > max ) {
			throw new Error();
		}
    },
    'checkString' : function( s, max )
	{
		if( typeof s !== 'string' || s.length > max ) {
			throw new Error();
		}
    },
    'checkBool' : function( b )
	{
		if( typeof b !== 'boolean' ) {
			throw new Error();
		}
	},
    'checkNumber' : function( x, min ) {
		if( typeof x !== 'number' || !Number.isFinite(x) || x < min ) {
			throw new Error();
		}
	},
	'getBrowserString' : function() {
		var ua= navigator.userAgent, tem,
		M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
		if(/trident/i.test(M[1])){
			tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
			return 'IE '+(tem[1] || '');
		}
		if(M[1]=== 'Chrome'){
			tem= ua.match(/\b(OPR|Edge?)\/(\d+)/);
			if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera').replace('Edg ', 'Edge ');
		}
		M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
		if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
		return M.join(' ');
	}
}
Object.freeze(help);