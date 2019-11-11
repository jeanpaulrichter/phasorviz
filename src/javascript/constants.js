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

export { constants };

const constants = {
    'version' : 1,

    // indicates if phasorviz is running as app
    'appmode' : false,

    'svg' : {
        'ns' : 'http://www.w3.org/2000/svg',
        'publicid' : '-//W3C//DTD SVG 1.1//EN',
        'systemid' : 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'
    },

    // Enum coordinate system
    'system' : { 'none' : 0, 'cartesean' : 1, 'polar_rad' : 2, 'polar_deg' : 3, 'count' : 3 },
    'system_labels' : [ '', 'c', '&Phi;', '&Phi;&deg;' ],

    // stroke-style: value of svg attribute 'stroke-dasharray'
    'stroke_styles' : [
        { 'label' : 'solid', 'value' : 0},
        { 'label' : 'dotted', 'value' : 2},
        { 'label' : 'dashed', 'value' : 6 }
    ],

    // arrow types: length == percent of svg-width, (half)angle in rad
    'arrow_types' : [
        { 'label' : 'none', 'length' : 0, 'angle' : 0 },
        { 'label' : 'flat', 'length' : 0.11, 'angle' : 0.89759790102 , 'filled': false },
        { 'label' : 'flat - filled', 'length' : 0.11, 'angle' : 0.89759790102 , 'filled': true },
        { 'label' : 'normal', 'length' : 0.1, 'angle' : 0.62831853071 , 'filled': false },
        { 'label' : 'normal - filled', 'length' : 0.1, 'angle' : 0.62831853071, 'filled': true },
        { 'label' : 'pointed', 'length' : 0.12, 'angle' : 0.41887902047 , 'filled': false },
        { 'label' : 'pointed - filled', 'length' : 0.12, 'angle' : 0.41887902047 , 'filled': true }
    ],

    // min/max values of 'Arrow Size' in Phasor edit dialog
    'arrow_size' : {
        'min' : 5,
        'max' : 30,
        'factor' : 0.1
    },

    // label/css class for phasor list skins
    'phasor_skins' : [
        { 'label' : 'Standard', 'classname' : 'phasor_style_1' },
        { 'label' : 'Vida Loca', 'classname' : 'phasor_style_2' },
        { 'label' : 'Whiskeyapprox', 'classname' : 'phasor_style_3' },
        { 'label' : 'Valhalla', 'classname' : 'phasor_style_4' }
    ],

    // default values for new phasors
    'default_phasor' : {
        'width' : 4,
        'arrow' : 5, // index of arrow_types array
        'arrow_size' : 10,
        'outline_width' : 0
    },

    // List of rotating initial phasor colors
    'phasor_colors' : [
        new Color('rgba(255, 0, 0, 1)'),
        new Color('rgba(255, 228, 0, 1)'),
        new Color('rgba(0, 0, 255, 1)'),
        new Color('rgba(0, 51, 0, 1)'),
        new Color('rgba(153, 0, 153, 1)')
    ],

    // other colors
    'colors': {
        'legend_scale_circle' : new Color('rgba(250,10,10,0.5)'),
        'invisible': new Color('rgba(0, 0, 0, 0)')
    },

    // svg viewbox width = 2 * (constants.viewbox_base + some padding depending on text_size for angle-labels)
    'viewbox_base' : 1000,

    // maximum possible 'Outline Width' value in Phasor edit dialog. ('stroke' value of SVG phasor paths)
    'max_outline_width' : 5,

    // Maximum possible 'Width' value in Phasor edit dialog.
    'max_phasor_width' : 8,

    // Tick length
    'tick_length' : 0.015,

    // min/max values of 'Text Size' in settings dialog.
    'text_size' : {
        'min' : 7,
        'max' : 20,
        'factor' : 0.1
    },

    // label size base value
    'label_size' : 1,

    // Rounding precision ( zeros = relevant decimal places )
    'rounding_precision': 100000,

    // symbols, labels and codes must conform to these regex
    'symbol_regex' : /^[a-zA-Z_]+[a-zA-Z0-9_]*$/ ,

    'label_regex' : /^[^<>"']*$/ ,

    'code_regex' : /^[A-Z0-9]{6}$/,

    // url for upload/download
    'ajax_url' : 'https://phasorviz.cerberus-design.de/ajax.php',

    // marks the number of phasors when the next smaller lineheight is used
    'lineheight_steps' : [ 4 , 8, 12 ],

    // maximum filesize of phasorviz .json files
    'max_filesize' : 1024000,

    // max millisecs between taps of a 'doubletap' on touch devices
    'doubletap_time' : 500,

    // min duration of a 'longtap' on touch devices
    'longtap_time' : 500,

    // max length of phasor labels
    'max_label_length' : 64,

    // file export defaults
    'files' : {
        'default_name' : 'phasorviz',
        'max_name_length' : 64,
        'png' : {
            'width' : {
                'default' : 1000,
                'min' : 10,
                'max' : 10000
            },
            'height' : {
                'default' : 1000,
                'min' : 10,
                'max' : 10000
            },
            'background_color' : 'rgb(255,255,255,1)'
        },
        'svg' : {
            'width' : {
                'default' : 600,
                'min' : 10,
                'max' : 10000
            },
            'height' : {
                'default' : 600,
                'min' : 10,
                'max' : 10000
            }
        }
    }
};
Object.freeze(constants);
