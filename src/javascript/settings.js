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

import { Color } from './color.js';
import { constants } from './constants.js';
import { help } from './help.js';

export { settings, Settings }

/* holds current settings */

class Settings
{
    constructor()
    {
        this.custom_units =
        {
            'use' : false,
            'major' : 1,
            'minor' : 0.5
        };
        this.grid = {
            'show' : false,
            'style' : 2,
            'color' : new Color()
        };
        this.compass = {
            'show' : true,
            'style' : 1,
            'color' : new Color(),
            'gradient' : {
                'enabled' : false,
                'from': new Color( 'rgba(0,0,0,0.7)' ),
                'to': new Color( 'rgba(255,255,255,1)' )
            }
        };
        this.labels = {
            'color' : new Color(),
            'xp' : true,
            'xn' : true,
            'yp' : true,
            'yn' : true,
            'angles' : true,
            'textsize' : 11
        };
        this.axis = {
            'show' : false,
            'ticks' : true,
            'style' : 0,
            'color' : new Color()
        };
        this.legend = {
            'show' : true,
            'colors' : {
                'text': new Color(),
                'bg': new Color( 'rgba(255,255,255,1)' ),
                'border' : new Color()
            }
        };
        this.quadrants = 0;
    }

    // check( s )
    //      returns true if s is a valid Settings object
    static check( s )
    {
        try {
            help.checkInt( s.quadrants, 0, 4 );
            help.checkObj( s.legend );
            help.checkBool( s.legend.show );
            help.checkObj( s.legend.colors );
            help.checkObj( s.legend.colors.text );
            help.checkObj( s.legend.colors.bg );
            help.checkObj( s.legend.colors.border );
            help.checkObj( s.axis );
            help.checkBool( s.axis.show );
            help.checkBool( s.axis.ticks );
            help.checkInt( s.axis.style, 0, constants.stroke_styles.length - 1 );
            help.checkObj( s.axis.color );
            help.checkObj( s.labels );
            help.checkObj( s.labels.color );
            help.checkBool( s.labels.xn );
            help.checkBool( s.labels.xp );
            help.checkBool( s.labels.yn );
            help.checkBool( s.labels.yp );
            help.checkBool( s.labels.angles );
            help.checkInt( s.labels.textsize, constants.text_size.min, constants.text_size.max );
            help.checkObj( s.compass );
            help.checkBool( s.compass.show );
            help.checkInt( s.compass.style, 0, constants.stroke_styles.length - 1 );
            help.checkObj( s.compass.color );
            help.checkObj( s.compass.gradient );
            help.checkObj( s.compass.gradient.from );
            help.checkObj( s.compass.gradient.to );
            help.checkBool( s.compass.gradient.enabled );
            help.checkObj( s.grid );
            help.checkBool( s.grid.show );
            help.checkInt( s.grid.style, 0, constants.stroke_styles.length - 1 );
            help.checkObj( s.grid.color );
            help.checkObj( s.custom_units );
            help.checkBool( s.custom_units.use );
            help.checkNumber( s.custom_units.major );
            help.checkNumber( s.custom_units.minor );
            return true;
        } catch( exc ) {
            return false;
        }
    }

    // load( s )
    //      set values to s ( expects valid Settings object ! )
    load( s )
    {
        this.quadrants = s.quadrants;
        this.legend.show = s.legend.show;
        this.legend.colors.bg.set( s.legend.colors.bg );
        this.legend.colors.text.set( s.legend.colors.text );
        this.legend.colors.border.set( s.legend.colors.border );
        this.axis.show = s.axis.show;
        this.axis.ticks = s.axis.ticks;
        this.axis.style = s.axis.style;
        this.axis.color.set( s.axis.color );
        this.labels.xn = s.labels.xn;
        this.labels.xp = s.labels.xp;
        this.labels.yn = s.labels.yn;
        this.labels.yp = s.labels.yp;
        this.labels.angles = s.labels.angles;
        this.labels.color.set( s.labels.color );
        this.labels.textsize = s.labels.textsize;
        this.compass.show = s.compass.show;
        this.compass.style = s.compass.style;
        this.compass.color.set( s.compass.color );
        this.compass.gradient.enabled = s.compass.gradient.enabled;
        this.compass.gradient.from.set( s.compass.gradient.from );
        this.compass.gradient.to.set( s.compass.gradient.to );
        this.grid.show = s.grid.show;
        this.grid.style = s.grid.style;
        this.grid.color.set( s.grid.color );
        this.custom_units.use = s.custom_units.use;
        this.custom_units.major = s.custom_units.major;
        this.custom_units.minor = s.custom_units.minor;
    }

    reset()
    {
        this.quadrants = 0;
        this.legend.show = true;
        this.legend.colors.bg.set( 'rgba(255,255,255,1)' );
        this.legend.colors.text.set( '#000000' );
        this.legend.colors.border.set( '#000000' );
        this.axis.show = false;
        this.axis.ticks = true;
        this.axis.style = 0;
        this.axis.color.set( '#000000' );
        this.labels.xn = true;
        this.labels.xp = true;
        this.labels.yn = true;
        this.labels.yp = true;
        this.labels.angles = true;
        this.labels.color.set( '#000000' );
        this.labels.textsize = 11;
        this.compass.show = true;
        this.compass.style = 1;
        this.compass.color.set( '#000000' );
        this.compass.gradient.enabled = false;
        this.compass.gradient.from.set( 'rgba(0,0,0,0.7)' );
        this.compass.gradient.to.set( 'rgba(255,255,255,1)' );
        this.grid.show = false;
        this.grid.style = 2;
        this.grid.color.set( '#000000' );
        this.custom_units.use = false;
        this.custom_units.major = 1;
        this.custom_units.minor = 1.5;
    }
}

var settings = new Settings;