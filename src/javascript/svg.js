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
import { settings } from './settings.js';
import { phasors } from './phasors.js';
import { svgadd } from './svghelp.js';

export { svg };

/*
    creates and updates SVG based on current phasors

    update()
    getScale()
    getPhasorDrag()
*/

var svg = (function ()
{
    var jqel = $( '#svg' );

    // stores information about the current coordinate system calculated by _updateSystem()
    var system = {
        'scale' : 0,
        'number_of_circles' : 0,
        'circle_unit' : 0,
        'ticks_unit' : 0,
        'circle_unit_scaled' : 0,
        'ticks_unit_scaled' : 0,
        'max' : 0,
        'max_circle' : 0,
        'textsize' : 0,
        'cos30r' : 0,
        'sin30r' : 0,
        'arrows' : [],
        'phasor_circle_radius' : 0,
        'legend_circle_factor' : 0,
        'viewbox' : { 'x' : 0, 'y' : 0, 'width' : 0, 'height' : 0, 'string' : '' }
    };

    var phasordrag = {
        'radius_squard' : 0,
        'points' : []
    };

    var help = {
        // used by _updateSystem()
        'circle_arr' : [ 0.1,  0.5, 1,   5, 10, 25, 50, 100, 250 ],
        'ticks_arr' : [ 0.05,  0.1, 0.5, 1,  5,  5, 10,  25,  50 ],

        // strings and positions for compass angle labels
        'angles' : [
            { 's' : '0°', 'x' : 0, 'y' : 0 },
            { 's' : '30°', 'x' : 0, 'y' : 0 },
            { 's' : '60°', 'x' : 0, 'y' : 0 },
            { 's' : '90°', 'x' : 0, 'y' : 0 },
            { 's' : '120°', 'x' : 0, 'y' : 0 },
            { 's' : '150°', 'x' : 0, 'y' : 0 },
            { 's' : '180°', 'x' : 0, 'y' : 0 },
            { 's' : '210°', 'x' : 0, 'y' : 0 },
            { 's' : '240°', 'x' : 0, 'y' : 0 },
            { 's' : '270°', 'x' : 0, 'y' : 0 },
            { 's' : '300°', 'x' : 0, 'y' : 0 },
            { 's' : '330°', 'x' : 0, 'y' : 0 }
        ],

        // tells which indices from help.angles are to be shown for settings.quadrants
        'angle_indices' : [
            { 'from' : 0, 'to' : 11 },
            { 'from' : 0, 'to' : 3 },
            { 'from' : 3, 'to' : 6 },
            { 'from' : 6, 'to' : 9 },
            { 'from' : 9, 'to' : 11 }
        ]
    };

    _setup();

    // -----------------------------------------------------------------------------------------------------------------------------

    // _setup()
    //      prepares some arrays and precalculated values
    function _setup()
    {
        for( let i = 0; i < constants.arrow_types.length; i++ ) {
            system.arrows.push({
                'length' : 0,
                'sin' : Math.sin( constants.arrow_types[i].angle ),
                'cos' : Math.cos( constants.arrow_types[i].angle ),
                'tan' : Math.tan( constants.arrow_types[i].angle )
            });
        }
    }

    // _updateSystem()
    //      choose coordinate system dimensions based on current phasors
    function _updateSystem()
    {
        let max_length = phasors.getMaxLength();

        if( settings.custom_units.use ) {
            system.circle_unit = settings.custom_units.major;
            system.ticks_unit = settings.custom_units.minor;
        } else {
            // goal: find system.circle_unit & system.ticks_unit that 'feel right' based on the longest phasor
            // atm: two different algorithms for (phasors.max_length > 1 && phasors.max_length < 1000) and the opposite
            // both are far from elegant or ideal, but seem to work more or less...

            let target_num = (settings.quadrants > 0) ? 6 : 4;

            if( max_length > 1 && max_length <= 1000 ) {
                // try to find best unit-system with about 5 circles
                let best_index = 0;
                let best_value = 1000;
                for( let i = 0; i < help.circle_arr.length; i++ ) {
                    let c = Math.abs( Math.ceil( max_length / help.circle_arr[i] ) - target_num );
                    if( c < best_value ) {
                        best_index = i;
                        best_value = c;
                    }
                }
                system.circle_unit = help.circle_arr[best_index];
                system.ticks_unit = help.ticks_arr[best_index];
            } else {
                let temp = max_length / target_num;
                let temp_str = '' + temp;
                let temp_str_i = 0;

                if( temp > 1 ) {
                    for( ; temp_str_i < temp_str.length; temp_str_i++ ) {
                        if( temp_str[temp_str_i] == '.' ) {
                            break;
                        }
                    }
                    if( temp_str_i > 1 ) {
                        temp = Math.round( temp / Math.pow(10, temp_str_i - 1) );
                        if(temp < 2) {
                            temp = 1;
                        } else if(temp < 6) {
                            temp = 5;
                        } else {
                            temp = 10;
                        }
                        system.circle_unit = temp * Math.pow( 10, temp_str_i - 1 );
                    } else {
                        if(temp < 2) {
                            system.circle_unit = 1;
                        } else if(temp < 6) {
                            system.circle_unit = 5;
                        } else {
                            system.circle_unit = 10;
                        }
                    }
                    system.ticks_unit = system.circle_unit * 0.5;
                } else {
                    for( ; temp_str_i < temp_str.length; temp_str_i++ ) {
                        if( temp_str[temp_str_i] != '0' && temp_str[temp_str_i] != '.' ) {
                            break;
                        }
                    }
                    temp = Math.round( Math.pow(10, temp_str_i - 1) * temp );
                    if(temp < 2) {
                        temp = 1;
                    } else if(temp < 6) {
                        temp = 5;
                    } else {
                        temp = 10;
                    }
                    system.circle_unit = temp / Math.pow( 10, temp_str_i - 1 ) ;
                    system.ticks_unit = system.circle_unit * 0.5;
                }
            }
        }

        system.number_of_circles = Math.floor( max_length / system.circle_unit ) + 1;
        system.scale = constants.viewbox_base / (system.number_of_circles * system.circle_unit);

        // calculate a few dimensions based on current system
        system.circle_unit_scaled = system.circle_unit * system.scale;
        system.ticks_unit_scaled = system.ticks_unit * system.scale;
        system.max_circle = system.number_of_circles * system.circle_unit_scaled;
        system.cos30r = 0.86602540378 * system.max_circle;
        system.sin30r = 0.5 * system.max_circle;

        if( settings.quadrants > 0 ) {
            system.textsize = constants.viewbox_base * 0.055 * settings.labels.textsize * constants.text_size.factor * 0.5;
            system.max = constants.viewbox_base + system.textsize * 2.5;
            system.arrow_width = constants.viewbox_base * 0.0025;
            for( let i = 1; i < constants.arrow_types.length; i++ ) {
                system.arrows[i].length = constants.arrow_types[i].length * constants.viewbox_base * 0.7;
            }
            jqel.find( '#svg_glow feMorphology' ).attr( 'radius', constants.viewbox_base * 0.005 );
        } else {
            system.textsize = constants.viewbox_base * 0.055 * settings.labels.textsize * constants.text_size.factor;
            system.max = constants.viewbox_base + system.textsize * 2.5;
            system.arrow_width = constants.viewbox_base * 0.004;
            for( let i = 1; i < constants.arrow_types.length; i++ ) {
                system.arrows[i].length = constants.arrow_types[i].length * constants.viewbox_base;
            }
            jqel.find( '#svg_glow feMorphology' ).attr( 'radius', constants.viewbox_base * 0.01 );
        }

        if( window.matchMedia('(max-width: 500px)').matches ) {
            system.phasor_circle_radius = constants.viewbox_base * 0.1;
            system.legend_circle_factor = 1.5;
        } else if( window.matchMedia('(max-width: 700px)').matches ) {
            system.phasor_circle_radius = constants.viewbox_base * 0.09;
            system.legend_circle_factor = 1;
        } else {
            system.phasor_circle_radius = constants.viewbox_base * 0.04;
            system.legend_circle_factor = 0.5;
        }
        phasordrag.radius_squard = system.phasor_circle_radius * system.phasor_circle_radius;

        // viewbox
        if( settings.quadrants == 1 ) {
            system.viewbox.x = -system.textsize * 1.8;
            system.viewbox.y = -system.max + system.textsize * 0.7;
            system.viewbox.width = system.max + system.textsize;
        } else if( settings.quadrants == 2 ) {
            system.viewbox.x = -1 * system.max;
            system.viewbox.y = -system.max + system.textsize * 0.4;
            system.viewbox.width = system.max + system.textsize * 1.8;
        } else if( settings.quadrants == 3 ) {
            system.viewbox.x = -1 * system.max;
            system.viewbox.y = system.textsize * -2.6;
            system.viewbox.width = system.max + system.textsize * 2.5;
        } else if( settings.quadrants == 4 ) {
            system.viewbox.x = system.textsize * -2.5;
            system.viewbox.y = system.textsize * -2.3;
            system.viewbox.width = system.max + system.textsize * 2;
        } else {
            system.viewbox.x = -1 * system.max;
            system.viewbox.y = system.viewbox.x;
            system.viewbox.width = system.max * 2;
        }
        system.viewbox.height = system.viewbox.width;
        system.viewbox.string = '' + system.viewbox.x + ',' + system.viewbox.y + ',' + system.viewbox.width + ',' + system.viewbox.height;
    }

    // _createPhasors( main_group )
    //        creates group of phasor elements. Each phasor is a group containing its path + a line and an invisible selection circle for drag & drop
    function _createPhasors( main_group )
    {
        let group = document.createElementNS(constants.svg.ns, 'g');
        phasordrag.points = [];
        for ( let i = 0; i < phasors.count(); i++ ) {
            let phasor = phasors.getByIndex( i );
            if( phasor.valid && phasor.visible && !(phasor.sx == phasor.fx && phasor.sy == phasor.fy) ) {
                // this calculation of the phasor polygon is quite ugly, but well...
                let s_sx = phasor.sx * system.scale;
                let s_sy = phasor.sy * system.scale;
                let s_fx = phasor.fx * system.scale;
                let s_fy = phasor.fy * system.scale;
                let s_x = phasor.value.re * system.scale;
                let s_y = phasor.value.im * system.scale;

                let p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y, p5x, p5y, p6x, p6y;
                let pathstring;
                let arrow_width = system.arrow_width * phasor.width;
                let arrow_width_half = arrow_width * 0.5;
                let phasor_len = Math.sqrt(s_x * s_x + s_y * s_y);
                let arrow_len = system.arrows[phasor.arrow].length * ( phasor.arrow_size * constants.arrow_size.factor );
                let nx = s_x / phasor_len;
                let ny = s_y / phasor_len;

                p1x = s_sx + ny * arrow_width_half;
                p1y = s_sy - nx * arrow_width_half;
                p2x = s_sx - ny * arrow_width_half;
                p2y = s_sy + nx * arrow_width_half;

                if(system.arrows[phasor.arrow].length == 0) {
                    p3x = s_fx + ny * arrow_width_half;
                    p3y = s_fy - nx * arrow_width_half;
                    p4x = s_fx - ny * arrow_width_half;
                    p4y = s_fy + nx * arrow_width_half;

                    pathstring = 'M ' + p1x + ',' + -p1y + ' L ' + p3x + ',' + -p3y + ' L ' + p4x + ',' + -p4y + ' L ' + p2x + ',' + -p2y + ' z';
                } else {
                    let rn1x = -nx * system.arrows[phasor.arrow].cos + ny * system.arrows[phasor.arrow].sin;
                    let rn1y = -ny * system.arrows[phasor.arrow].cos - nx * system.arrows[phasor.arrow].sin;
                    let rn2x = -nx * system.arrows[phasor.arrow].cos - ny * system.arrows[phasor.arrow].sin;
                    let rn2y = -ny * system.arrows[phasor.arrow].cos + nx * system.arrows[phasor.arrow].sin;
                    let h1 = phasor_len - system.arrows[phasor.arrow].cos * arrow_len;
                    let h1x = nx * h1;
                    let h1y = ny * h1;

                    p3x = p1x + h1x;
                    p3y = p1y + h1y;
                    p4x = p2x + h1x;
                    p4y = p2y + h1y;
                    p5x = s_fx + arrow_len * rn1x;
                    p5y = s_fy + arrow_len * rn1y;
                    p6x = s_fx + arrow_len * rn2x;
                    p6y = s_fy + arrow_len * rn2y;

                    if( constants.arrow_types[phasor.arrow].filled ) {
                        pathstring = 'M ' + p1x + ',' + -p1y + ' L ' + p3x + ',' + -p3y + ' L ' + p5x + ',' + -p5y + ' L ' + s_fx + ',' + -s_fy  + ' L ' + p6x + ',' + -p6y + ' L ' + p4x + ',' + -p4y + ' L ' + p2x + ',' + -p2y + ' z';
                    } else {
                        let p7x, p7y, p8x, p8y, p9x, p9y, p10x, p10y;
                        let h2 = (arrow_width / system.arrows[phasor.arrow].cos + arrow_width_half) / system.arrows[phasor.arrow].tan;
                        let h3 = (phasor_len - h1 - h2) / system.arrows[phasor.arrow].cos + system.arrows[phasor.arrow].tan * arrow_width;
                        h1 = phasor_len - h2;
                        h1x = nx * h1;
                        h1y = ny * h1;
                        p7x = p1x + h1x;
                        p7y = p1y + h1y;
                        p8x = p2x + h1x;
                        p8y = p2y + h1y;
                        p9x = p7x + h3 * rn1x;
                        p9y = p7y + h3 * rn1y;
                        p10x = p8x + h3 * rn2x;
                        p10y = p8y + h3 * rn2y;
                        pathstring = 'M ' + p1x + ',' + -p1y + ' L ' + p7x + ',' + -p7y + ' L ' + p9x + ',' + -p9y + ' L ' + p5x + ',' + -p5y + ' L ' + s_fx + ',' + -s_fy + ' L ' + p6x + ',' + -p6y + ' L ' + p10x + ',' + -p10y + ' L ' + p8x + ',' + -p8y + ' L ' + p2x + ',' + -p2y + ' z';
                    }
                }

                let phasor_group = document.createElementNS(constants.svg.ns, 'g');

                svgadd( phasor_group ).path( pathstring ).color( phasor.outline_color ).fill( phasor.color ).stroke( phasor.outline_width );
                if( phasor.system !== constants.system.none ) {
                    phasordrag.points.push( { 'x': s_fx, 'y': -1 * s_fy, 'id': phasor.id } );
                    svgadd( phasor_group ).line( s_sx, -1 * s_sy, s_fx, -1 * s_fy ).color( phasor.color ).stroke( 2 ).class( 'hidden' );
                    svgadd( phasor_group ).circle( s_fx, -1 * s_fy, system.phasor_circle_radius ).stroke( 1 ).color( constants.colors.invisible ).fill( constants.colors.invisible ) ;
                }
                phasor_group.setAttribute('id', 'svg_phasor_' + phasor.id );
                if( phasors.isSelected( phasor.id ) ) {
                    phasor_group.firstElementChild.setAttribute( 'filter', 'url(#svg_glow)' );
                    if( phasor.system !== constants.system.none ) {
                        phasor_group.lastElementChild.setAttribute( 'fill-opacity', 0.6 );
                    }
                }

                group.append( phasor_group );
            }
        }
        group.setAttribute( 'id', 'svg_phasors' );
        main_group.append( group );
    }

    // _createAxis( parent )
    //      creates a group with axis and axis-ticks lines
    function _createAxis( parent )
    {
        if( settings.axis.show ) {
            let group = document.createElementNS( constants.svg.ns, 'g' );
            let dash = constants.stroke_styles[settings.axis.style].value;

            switch( settings.quadrants )
            {
                case 0:
                    svgadd( group ).line( -1 * system.max_circle, 0, system.max_circle, 0 ).color( settings.axis.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( 0, system.max_circle, 0, -1 * system.max_circle ).color( settings.axis.color ).stroke( 1 ).dash( dash );
                    break;
                case 1:
                    svgadd( group ).line( 0, 0, system.max_circle, 0 ).color( settings.axis.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( 0, 0, 0, -1 * system.max_circle ).color( settings.axis.color ).stroke( 1 ).dash( dash );
                    break;
                case 2:
                    svgadd( group ).line( -1 * system.max_circle, 0, 0, 0 ).color( settings.axis.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( 0, 0, 0, -1 * system.max_circle ).color( settings.axis.color ).stroke( 1 ).dash( dash );
                    break;
                case 3:
                    svgadd( group ).line( -1 * system.max_circle, 0, 0, 0 ).color( settings.axis.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( 0, system.max_circle, 0, 0 ).color( settings.axis.color ).stroke( 1 ).dash( dash );
                    break;
                case 4:
                    svgadd( group ).line( 0, 0, system.max_circle, 0 ).color( settings.axis.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( 0, system.max_circle, 0, 0 ).color( settings.axis.color ).stroke( 1 ).dash( dash );
                    break;
            }

            if( settings.axis.ticks ) {
                let tick_length = system.max_circle * constants.tick_length;
                let ticks_per_circle = Math.round( system.circle_unit / system.ticks_unit );
                let ticks_i = 1;
                let cur_value = system.ticks_unit_scaled;
                let cur_tick_length;
                let cur_tick_stroke;

                while( cur_value <= system.max_circle ) {
                    if( ticks_i % ticks_per_circle === 0 ) {
                        cur_tick_length = tick_length * 1.6;
                        cur_tick_stroke = 2;
                    } else {
                        cur_tick_length = tick_length;
                        cur_tick_stroke = 1;
                    }

                    switch( settings.quadrants )
                    {
                        case 0:
                        {
                            svgadd( group ).line( cur_value, cur_tick_length * -1, cur_value, cur_tick_length ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            svgadd( group ).line( -1 * cur_value, cur_tick_length * -1, -1 * cur_value, cur_tick_length ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            svgadd( group ).line( cur_tick_length * -1, cur_value, cur_tick_length, cur_value ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            svgadd( group ).line( cur_tick_length * -1, -1 * cur_value, cur_tick_length, -1 * cur_value ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            break;
                        }
                        case 1:
                        {
                            svgadd( group ).line( cur_value, cur_tick_length * -1, cur_value, cur_tick_length ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            svgadd( group ).line( cur_tick_length * -1, -1 * cur_value, cur_tick_length, -1 * cur_value ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            break;
                        }
                        case 2:
                        {
                            svgadd( group ).line( -1 * cur_value, cur_tick_length * -1, -1 * cur_value, cur_tick_length ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            svgadd( group ).line( cur_tick_length * -1, -1 * cur_value, cur_tick_length, -1 * cur_value ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            break;
                        }
                        case 3:
                        {
                            svgadd( group ).line( -1 * cur_value, cur_tick_length * -1, -1 * cur_value, cur_tick_length ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            svgadd( group ).line( cur_tick_length * -1, cur_value, cur_tick_length, cur_value ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            break;
                        }
                        case 4:
                        {
                            svgadd( group ).line( cur_value, cur_tick_length * -1, cur_value, cur_tick_length ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            svgadd( group ).line( cur_tick_length * -1, cur_value, cur_tick_length, cur_value ).color( settings.axis.color ).stroke( cur_tick_stroke );
                            break;
                        }
                    }

                    cur_value += system.ticks_unit_scaled;
                    ticks_i++;
                }
            }

            group.setAttribute( 'id', 'svg_axis' );
            parent.append( group );
        }
    }

    // _createCarteseanGrid( parent )
    //      creates a group with a solid cartesean grid
    function _createCarteseanGrid( parent )
    {
        if( settings.grid.show ) {
            let group = document.createElementNS( constants.svg.ns, 'g' );
            let dash = constants.stroke_styles[settings.grid.style].value;

            if( !settings.axis.show ) {
                switch( settings.quadrants )
                {
                    case 0:
                        svgadd( group ).line( 0, system.max_circle, 0, -1 * system.max_circle ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( system.max_circle, 0, -1 * system.max_circle, 0 ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        break;
                    case 1:
                        svgadd( group ).line( 0, 0, 0, -1 * system.max_circle ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( system.max_circle, 0, 0, 0 ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        break;
                    case 2:
                        svgadd( group ).line( 0, 0, 0, -1 * system.max_circle ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( 0, 0, -1 * system.max_circle, 0 ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        break;
                    case 3:
                        svgadd( group ).line( 0, system.max_circle, 0, 0 ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( 0, 0, -1 * system.max_circle, 0 ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        break;
                    case 4:
                        svgadd( group ).line( 0, system.max_circle, 0, 0 ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( system.max_circle, 0, 0, 0 ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        break;
                }
            }

            switch( settings.quadrants )
            {
                case 0:
                {
                    for( let i = 0, cur = system.max_circle; i < system.number_of_circles; i++, cur -= system.circle_unit_scaled ) {
                        svgadd( group ).line( cur, system.max_circle, cur, -1 * system.max_circle ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( system.max_circle, cur, -1 * system.max_circle, cur ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( -1 * cur, system.max_circle, -1 * cur, -1 * system.max_circle ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( system.max_circle, -1 * cur, -1 * system.max_circle, -1 * cur ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                    }
                    break;
                }
                case 1:
                {
                    for( let i = 0, cur = system.max_circle; i < system.number_of_circles; i++, cur -= system.circle_unit_scaled ) {
                        svgadd( group ).line( cur, 0, cur, -1 * system.max_circle ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( system.max_circle, -1 * cur, 0, -1 * cur ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                    }
                    break;
                }
                case 2:
                {
                    for( let i = 0, cur = system.max_circle; i < system.number_of_circles; i++, cur -= system.circle_unit_scaled ) {
                        svgadd( group ).line( -1 * cur, 0, -1 * cur, -1 * system.max_circle ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( 0, -1 * cur, -1 * system.max_circle, -1 * cur ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                    }
                    break;
                }
                case 3:
                {
                    for( let i = 0, cur = system.max_circle; i < system.number_of_circles; i++, cur -= system.circle_unit_scaled ) {
                        svgadd( group ).line( 0, cur, -1 * system.max_circle, cur ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( -1 * cur, system.max_circle, -1 * cur, 0 ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                    }
                    break;
                }
                case 4:
                {
                    for( let i = 0, cur = system.max_circle; i < system.number_of_circles; i++, cur -= system.circle_unit_scaled ) {
                        svgadd( group ).line( cur, system.max_circle, cur, 0 ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( system.max_circle, cur, 0, cur ).color( settings.grid.color ).stroke( 1 ).dash( dash );
                    }
                    break;
                }
            }

            group.setAttribute( 'id', 'svg_cartgrid' );
            parent.append( group );
        }
    }

    //_createCompass( parent )
    //      creates a group containing compass lines, circles and texts (angles)
    function _createCompass( parent )
    {
        if( settings.compass.show ) {

            let dash = constants.stroke_styles[settings.compass.style].value;
            let group = document.createElementNS( constants.svg.ns, 'g' );

            // circles
            let cur_value = system.max_circle;
            for( let i = 0; i < system.number_of_circles; i++ ) {
                if( settings.compass.gradient.enabled && i == 0 && settings.quadrants == 0 ) {
                    svgadd( group ).circle( 0, 0, cur_value, settings.quadrants ).stroke( 1 ).color( settings.compass.color ).dash( dash ).fill( 'url(#svg_compassgrad)' );
                } else {
                    svgadd( group ).circle( 0, 0, cur_value, settings.quadrants ).stroke( 1 ).color( settings.compass.color ).dash( dash );
                }
                cur_value -= system.circle_unit_scaled;
            }
            // lines
            switch( settings.quadrants )
            {
                case 0:
                {
                    if( !settings.axis.show ) {
                        svgadd( group ).line( -1 * system.max_circle, 0, system.max_circle, 0 ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( 0, system.max_circle, 0, -1 * system.max_circle ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    }
                    svgadd( group ).line( -1 * system.sin30r, system.cos30r, system.sin30r, -1 * system.cos30r ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( -1 * system.sin30r, -1 * system.cos30r, system.sin30r, system.cos30r ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( -1 * system.cos30r, system.sin30r, system.cos30r, -1 * system.sin30r ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( -1 * system.cos30r, -1 * system.sin30r, system.cos30r, system.sin30r ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    break;
                }
                case 1:
                {
                    if( !settings.axis.show ) {
                        svgadd( group ).line( 0, 0, system.max_circle, 0 ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( 0, 0, 0, -1 * system.max_circle ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    }
                    svgadd( group ).line( 0, 0, system.sin30r, -1 * system.cos30r ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( 0, 0, system.cos30r, -1 * system.sin30r  ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    break;
                }
                case 2:
                {
                    if( !settings.axis.show ) {
                        svgadd( group ).line( -1 * system.max_circle, 0, 0, 0 ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( 0, 0, 0, -1 * system.max_circle ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    }
                    svgadd( group ).line( -1 * system.sin30r, -1 * system.cos30r, 0, 0 ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( -1 * system.cos30r, -1 * system.sin30r, 0, 0 ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    break;
                }
                case 3:
                {
                    if( !settings.axis.show ) {
                        svgadd( group ).line( -1 * system.max_circle, 0, 0, 0 ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( 0, system.max_circle, 0, 0 ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    }
                    svgadd( group ).line( -1 * system.sin30r, system.cos30r, 0, 0 ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( -1 * system.cos30r, system.sin30r, 0, 0 ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    break;
                }
                case 4:
                {
                    if( !settings.axis.show ) {
                        svgadd( group ).line( 0, 0, system.max_circle, 0 ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                        svgadd( group ).line( 0, system.max_circle, 0, 0 ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    }
                    svgadd( group ).line( 0, 0, system.sin30r, system.cos30r ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    svgadd( group ).line( 0, 0, system.cos30r, system.sin30r ).color( settings.compass.color ).stroke( 1 ).dash( dash );
                    break;
                }
            }

            group.setAttribute( 'id', 'svg_compass' );
            parent.append( group );

            let stops = jqel.find( '#svg_compassgrad stop' );
            stops.eq(0).attr( 'stop-color', settings.compass.gradient.from.hex );
            stops.eq(1).attr( 'stop-color', settings.compass.gradient.to.hex );
            stops.eq(0).attr( 'stop-opacity', settings.compass.gradient.from.a );
            stops.eq(1).attr( 'stop-opacity', settings.compass.gradient.to.a );
        }
    }

    // _createUnitLabels( parent )
    //      creates a group containing all visible unit label texts
    function _createUnitLabels( parent )
    {
        if( settings.labels.xp || settings.labels.yp || settings.labels.xn || settings.labels.yn || settings.labels.angles ) {

            let group = document.createElementNS( constants.svg.ns, 'g' );

            if( settings.labels.angles ) {
                // calc coordinates from 0° to 330° step 30°
                help.angles[0].x = system.max_circle + system.textsize * 0.2;
                help.angles[0].y = system.textsize * 0.35;
                help.angles[1].x = system.sin30r + system.textsize * 0.15;
                help.angles[1].y = system.cos30r * -1;
                help.angles[2].x = system.cos30r;
                help.angles[2].y = -1 * system.sin30r - system.textsize * 0.15;
                help.angles[3].x = system.textsize * -0.5;
                help.angles[3].y = -1 * system.max_circle - system.textsize * 0.2;
                help.angles[4].x = -1 * system.cos30r - system.textsize * 1.4;
                help.angles[4].y = -1 * system.sin30r - system.textsize * 0.25;
                help.angles[5].x = -1 * system.sin30r - system.textsize * 2.1;
                help.angles[5].y = -1 * system.cos30r - system.textsize * 0.05;
                help.angles[6].x = -1 * system.max_circle - system.textsize * 2.4;
                help.angles[6].y = system.textsize * 0.3;
                help.angles[7].x = -1 * system.sin30r - system.textsize * 2.2;
                help.angles[7].y = system.cos30r + system.textsize * 0.9;
                help.angles[8].x = -1 * system.cos30r - system.textsize * 1.8;
                help.angles[8].y = system.sin30r + system.textsize * 1.05;
                help.angles[9].x = system.textsize * -1;
                help.angles[9].y = system.max_circle + system.textsize;
                help.angles[10].x = system.cos30r - system.textsize * 0.3;
                help.angles[10].y = system.sin30r + system.textsize;
                help.angles[11].x = system.sin30r + system.textsize * 0.15;
                help.angles[11].y = system.cos30r + system.textsize * 0.6;

                for( let i = help.angle_indices[settings.quadrants].from; i <= help.angle_indices[settings.quadrants].to; i++ ) {
                    svgadd( group ).text( help.angles[i].s ).pos( help.angles[i].x, help.angles[i].y ).size( system.textsize ).color( settings.labels.color ).class( 'angle noselect' );
                }
                if( settings.quadrants == 4 ) {
                    svgadd( group ).text( help.angles[0].s ).pos( help.angles[0].x, help.angles[0].y ).size( system.textsize ).color( settings.labels.color ).class( 'angle noselect' );
                }
            }

            let rounding_value;
            let use_rounding = false;
            let label_textsize = system.textsize * (1 - (0.015 * system.number_of_circles));
            let label_textwidth = 0;
            let unit_value = system.circle_unit;
            let cur_value = system.circle_unit_scaled
            let useExponential = ( system.circle_unit <= 0.001 ) || ( system.circle_unit >= 10000 );
            let x, y;

            if( system.circle_unit < 1 ) {
                let unit_decimals = system.circle_unit.toString().length - 2;
                rounding_value = Math.pow( 10, unit_decimals );
                use_rounding = true;
            }

            for( let i = 0; i < system.number_of_circles; i++, cur_value += system.circle_unit_scaled, unit_value += system.circle_unit ) {
                if( use_rounding ) {
                    unit_value = Math.round(unit_value * rounding_value) / rounding_value;
                }

                let s = useExponential ? unit_value.toExponential() : unit_value.toString();
                label_textwidth = s.length * 0.5 * label_textsize;

                // positive x-axis
                if( settings.labels.xp && settings.quadrants != 2 && settings.quadrants != 3 ) {
                    if( settings.quadrants === 4 ) {
                        x = cur_value - label_textwidth * 1.2;
                        y = label_textsize * -0.6;
                    } else {
                        x = cur_value - label_textwidth * 1.2;
                        y = label_textsize * 1.05;
                    }
                    svgadd( group ).text( s ).pos( x, y ).size( label_textsize ).color( settings.labels.color ).class( 'unit noselect' );
                }
                // positive y-axis
                if( settings.labels.yp && settings.quadrants != 3 && settings.quadrants != 4 ) {
                    if( settings.quadrants === 1 ) {
                        x = -1 * label_textwidth - system.textsize * 0.2;
                        y = -1 * cur_value + label_textsize * 1.2;
                    } else {
                        x = label_textwidth * 0.1;
                        y = -1 * cur_value + label_textsize * 1.2;
                    }
                    svgadd( group ).text( s ).pos( x, y ).size( label_textsize ).color( settings.labels.color ).class( 'unit noselect' );
                }

                s = '-' + s;
                label_textwidth = s.length * 0.5 * label_textsize;

                // negative x-axis
                if( settings.labels.xn && settings.quadrants != 1 && settings.quadrants != 4 ) {
                    if( settings.quadrants === 3 ) {
                        x = -1 * cur_value + label_textwidth * 0.1;
                        y = label_textsize * -0.7;
                    } else {
                        x = -1 * cur_value + label_textwidth * 0.1;
                        y = label_textsize * 1.05;
                    }
                    svgadd( group ).text( s ).pos( x, y ).size( label_textsize ).color( settings.labels.color ).class( 'unit noselect' );
                }
                // negative y-axis
                if( settings.labels.yn && settings.quadrants != 1 && settings.quadrants != 2 ) {
                    if( settings.quadrants === 4 ) {
                        x = -1 * label_textwidth - system.textsize * 0.2;
                        y = cur_value - label_textsize * 0.3;
                    } else {
                        x = label_textwidth * 0.1;
                        y = cur_value - label_textsize * 0.3;
                    }
                    svgadd( group ).text( s ).pos( x, y ).size( label_textsize ).color( settings.labels.color ).class( 'unit noselect' );
                }
            }

            group.setAttribute( 'id', 'svg_unitlabels' );
            parent.append( group );
        }
    }

    // _createLegend()
    //      creates a group containing all elements of the legend
    function _createLegend()
    {
        if( settings.legend.show ) {

            // find valid phasors & max label length
            let label_width = 0;
            let valid_phasors = [];
            for ( let i = 0; i < phasors.count(); i++ ) {
                let phasor = phasors.getByIndex( i );
                if( phasor.valid && phasor.visible && !(phasor.sx == phasor.fx && phasor.sy == phasor.fy) ) {
                    if( phasor.label.length > label_width ) {
                        label_width = phasor.label.length;
                    }
                    valid_phasors.push( phasor );
                }
            }

            if( valid_phasors.length > 0 ) {
                let label_unit;
                if( settings.quadrants > 0 ) {
                    label_unit = system.max * constants.label_size * 0.03;
                } else {
                    label_unit = system.max * constants.label_size * 0.042;
                }
                let label_padding = label_unit * 0.45;
                if( label_width == 0 ) {
                    label_width = label_unit + label_padding * 3;
                } else {
                    label_width = label_padding * 6 + label_width * label_unit * 0.5;
                }
                let label_height = label_unit * valid_phasors.length + label_padding * (valid_phasors.length + 1);

                let group = document.createElementNS( constants.svg.ns, 'g' );

                // main box
                svgadd( group ).rect( 0, 0, label_width, label_height )
                               .stroke( 1 )
                               .color( settings.legend.colors.border )
                               .fill( settings.legend.colors.bg )
                               .rounded( (settings.quadrants > 0) ? 20 : 30 );

                // entries
                for ( let i = 0; i < valid_phasors.length; i++ ) {
                        svgadd( group ).rect( label_padding * 1.5, label_padding * (i + 1) + label_unit * i, label_unit, label_unit )
                                       .stroke( 1 )
                                       .color( valid_phasors[i].color )
                                       .fill( valid_phasors[i].color );
                        svgadd( group ).text( valid_phasors[i].label )
                                       .pos( label_padding * 2.5 + label_unit, label_padding * (i + 1) + label_unit * (i + 1) - 0.1 * label_unit )
                                       .size( label_unit )
                                       .color( settings.legend.colors.text )
                                       .class( 'legend noselect' );
                }

                // "scale-circle"
                svgadd( group ).circle( label_width, label_height, label_unit * system.legend_circle_factor )
                               .stroke( 2 )
                               .color( constants.colors.legend_scale_circle )
                               .fill( constants.colors.legend_scale_circle )
                               .class( 'invisible' ).get();

                // translate
                let tx, ty;
                switch( settings.quadrants )
                {
                    case 0: case 1:
                        tx = system.max_circle - label_width;
                        ty = system.max_circle;
                        break;
                    case 2:
                        tx = -1 * label_width;
                        ty = system.max_circle;
                        break;
                    case 3:
                        tx = -1 * label_width;
                        ty = 0;
                        break;
                    case 4:
                        tx = system.max_circle - label_width;
                        ty = 0;
                        break;
                }
                group.setAttribute( 'transform', 'matrix(1 0 0 1 ' + tx + ' -' + ty + ')' );
                group.setAttribute( 'class', 'svg_legend' );
                group.setAttribute( 'id', 'svg_legend' );
                jqel.append( group );
            }
        }
    }

    // update()
    //      updates svg element
    function update()
    {
        _updateSystem();

        // set viewbox
        jqel.attr( 'viewBox', system.viewbox.string );
        // remove every child after defs
        jqel.find( 'defs' ).nextAll().remove();

        // create main group
        let g = document.createElementNS( constants.svg.ns, 'g' );
        _createCarteseanGrid( g );
        _createAxis( g );
        _createCompass( g );
        _createUnitLabels( g );
        _createPhasors( g );
        g.setAttribute( 'id', 'svg_main' );
        g.setAttribute( 'transform', 'matrix(1 0 0 1 0 0)' );
        jqel.append( g );

        _createLegend();
    }

    function getScale()
    {
        return system.scale;
    }

    return {
        'update' : update,
        'getScale' : getScale,
        'phasordrag' : phasordrag
    };
}());