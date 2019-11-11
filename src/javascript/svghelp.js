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

export { Line, RECT, Text, svgadd };

/*
    simple helper for creating basic SVG elements
*/

class Line
{
    constructor( x1, y1, x2, y2 )
    {
        this.from = {
            'x' : x1,
            'y' : y1
        };
        this.to = {
            'x' : x2,
            'y' : y2
        };
    }

    set( x1, y1, x2, y2 )
    {
        this.from.x = x1;
        this.from.y = y1;
        this.to.x = x2;
        this.to.y = y2;
    }
}

class RECT
{
    constructor( x, y, width, height )
    {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    set( x, y, width, height )
    {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

class Text
{
    constructor( str, x, y, size, length = 0 )
    {
        this.label = str;
        this.x = x;
        this.y = y;
        this.size = size;
        this.length = length;
    }

    set( x, y, size, length = 0 )
    {
        this.x = x;
        this.y = y;
        this.size = size;
        this.length = length;
    }
}

var svgadd = function(node) {
    return {
        // --------- TEXT ----------------------------------------------------------
        'text' : function(s) {
            var el = document.createElementNS( constants.svg.ns, 'text' );

            if( typeof s === 'object' ) {
                el.setAttribute( 'x', s.x );
                el.setAttribute( 'y', s.y );
                el.textContent = s.label;
                el.setAttribute( 'font-size', s.size );
                if( s.length > 0 ) {
                    el.setAttribute( 'textLength', s.length );
                }
            } else if( typeof s === 'string' ) {
                el.textContent = s;
            }

            node.append( el );

            return {
                'pos' : function( x, y ) {
                    el.setAttribute( 'x', x );
                    el.setAttribute( 'y', y );
                    return this;
                },
                'length' : function( length ) {
                    el.setAttribute( 'textLength' , length );
                    return this;
                },
                'size' : function( size ) {
                    el.setAttribute( 'font-size', size );
                    return this;
                },
                'color' : function( color ) {
                    el.setAttribute( 'fill', color.hex );
                    el.setAttribute( 'opacity', color.a );
                    return this;
                },
                'class' : function( classname ) {
                    el.setAttribute( 'class', classname );
                    return this;
                },
                'adjustGlyphs' : function() {
                    el.setAttribute( 'lengthAdjust', 'spacingAndGlyphs' );
                    return this;
                },
                'get' : function() {
                    return el;
                }
            };
        },
        // --------- LINE ----------------------------------------------------------
        'line' : function( x1, y1, x2, y2 ) {
            var el = document.createElementNS( constants.svg.ns, 'line' );
            el.setAttribute( 'vector-effect', 'non-scaling-stroke' );

            if( typeof x1 === 'object' ) {
                el.setAttribute( 'x1', x1.from.x );
                el.setAttribute( 'y1', x1.from.y );
                el.setAttribute( 'x2', x1.to.x );
                el.setAttribute( 'y2', x1.to.y );
            } else {
                el.setAttribute( 'x1', x1 );
                el.setAttribute( 'y1', y1 );
                el.setAttribute( 'x2', x2 );
                el.setAttribute( 'y2', y2 );
            }

            node.append( el );

            return {
                'color' : function( color ) {
                    el.setAttribute( 'stroke', color.hex );
                    el.setAttribute( 'opacity', color.a );
                    return this;
                },
                'stroke' : function( width ) {
                    el.setAttribute( 'stroke-width', width );
                    return this;
                },
                'dash' : function( dash ) {
                    el.setAttribute( 'stroke-dasharray', dash );
                    return this;
                },
                'class' : function( classname ) {
                    el.setAttribute( 'class', classname );
                    return this;
                },
                'get' : function() {
                    return el;
                }
            };
        },
        // --------- CIRCLE --------------------------------------------------------
        'circle' : function( x, y, radius, quadrant = 0 ) {
            var el;
			if( quadrant <= 0 || quadrant > 4 ) {
				el = document.createElementNS( constants.svg.ns, 'circle' );
				el.setAttribute( 'cx', x );
				el.setAttribute( 'cy', y );
				el.setAttribute( 'r', radius );
			} else {
				el = document.createElementNS( constants.svg.ns, 'path' );
				let s;
				switch( quadrant )
				{
					case 1:
						s = 'M ' + x + ' ' + (y - radius) + ' A ' + radius + ' ' + radius + ' 0 0 1 ' + (x + radius) + ' ' + y;
						break;
					case 2:
						s = 'M ' + (x - radius) + ' ' + y + ' A ' + radius + ' ' + radius + ' 0 0 1 ' + x + ' ' + (y - radius);
						break;
					case 3:
						s = 'M ' + (x - radius) + ' ' + y + ' A ' + radius + ' ' + radius + ' 0 0 0 ' + x + ' ' + (y + radius);
						break;
					case 4:
						s = 'M ' + x + ' ' + (y + radius) + ' A ' + radius + ' ' + radius + ' 0 0 0 ' + (x + radius) + ' ' + y;
						break;
				}
				el.setAttribute( 'd', s );
			}
            el.setAttribute( 'vector-effect', 'non-scaling-stroke' );
            el.setAttribute( 'fill', 'none' );
            node.append( el );

            return {
                'color' : function( color ) {
                    el.setAttribute( 'stroke', color.hex );
                    el.setAttribute( 'stroke-opacity', color.a );
                    return this;
                },
                'fill' : function(color) {
                    if( typeof color === 'string' ) {
                        el.setAttribute( 'fill', color );
                    } else {
                        el.setAttribute( 'fill', color.hex );
                        el.setAttribute( 'fill-opacity', color.a );
                    }
                    return this;
                },
                'stroke' : function( width ) {
                    el.setAttribute( 'stroke-width', width );
                    return this;
                },
                'dash' : function( dash ) {
                    el.setAttribute( 'stroke-dasharray', dash );
                    return this;
                },
                'class' : function( classname ) {
                    el.setAttribute( 'class', classname );
                    return this;
                },
                'get' : function() {
                    return el;
                }
            };
        },
        // --------- RECT ----------------------------------------------------------
        'rect' : function( x, y, width, height ) {
            var el = document.createElementNS( constants.svg.ns, 'rect' );
            el.setAttribute( 'vector-effect', 'non-scaling-stroke' );
            el.setAttribute( 'fill', 'none' );

            if( typeof x === 'object' ) {
                el.setAttribute( 'x', x.x );
                el.setAttribute( 'y', x.y );
                el.setAttribute( 'width', x.width );
                el.setAttribute( 'height', x.height );
            } else {
                el.setAttribute( 'x', x );
                el.setAttribute( 'y', y );
                el.setAttribute( 'width', width );
                el.setAttribute( 'height', height );
            }

            node.append( el );

            return {
                'color' : function( color ) {
                    el.setAttribute( 'stroke', color.hex );
                    el.setAttribute( 'stroke-opacity', color.a );
                    return this;
                },
                'fill' : function( color ) {
                    el.setAttribute( 'fill', color.hex );
                    el.setAttribute( 'fill-opacity', color.a );
                    return this;
                },
                'stroke' : function( width ) {
                    el.setAttribute( 'stroke-width', width );
                    return this;
                },
                'rounded' : function( val ) {
                    el.setAttribute( 'rx', val );
                    el.setAttribute( 'ry', val );
                    return this;
                },
                'dash' : function( dash ) {
                    el.setAttribute( 'stroke-dasharray', dash );
                    return this;
                },
                'class' : function( classname ) {
                    el.setAttribute( 'class', classname );
                    return this;
                },
                'get' : function() {
                    return el;
                }
            };
        },
        // --------- PATH ----------------------------------------------------------
        'path' : function( path ) {
            var el = document.createElementNS( constants.svg.ns, 'path' );
            el.setAttribute( 'd', path );
            el.setAttribute( 'vector-effect', 'non-scaling-stroke' );
            el.setAttribute( 'fill', 'none' );
            node.append( el );

            return {
                'color' : function( color ) {
                    el.setAttribute( 'stroke', color.hex );
                    el.setAttribute( 'stroke-opacity', color.a );
                    return this;
                },
                'fill' : function( color ) {
                    el.setAttribute( 'fill', color.hex );
                    el.setAttribute( 'fill-opacity', color.a );
                    return this;
                },
                'stroke' : function( width ) {
                    el.setAttribute( 'stroke-width', width );
                    return this;
                },
                'dash' : function( dash ) {
                    el.setAttribute( 'stroke-dasharray', dash );
                    return this;
                },
                'class' : function( classname ) {
                    el.setAttribute( 'class', classname );
                    return this;
                },
                'get' : function() {
                    return el;
                }
            };
        }
    };
};