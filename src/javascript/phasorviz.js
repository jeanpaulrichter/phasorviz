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
import { phasors } from './phasors.js';
import { svg } from './svg.js';
import { dialogs } from './dialogs.js';
import { files } from './files.js';
import { Settings, settings } from './settings.js';
import { help } from './help.js';

function PhasorViz()
{
    // "enums"
    const UI = {
        'phasor' : {
            'label' : 0,
            'symbol' : 1,
            'parent' : 2,
            'system' : 3,
            'visibility' : 4,
            'expression' : 5
        },
        'svg_action' : {
            'none' : 0,
            'pan' : 1,
            'zoom' : 2,
            'phasor_drag' : 3,
            'legend_drag' : 4,
            'legend_scale' : 5
        }
    }
    Object.freeze(UI);

    // information about current UI status
    var ui = {
        // interaction with the SVG
        'svg': {
            'jqel' : $( '#svg' ),    // jquery container of svg element #svg
            'action' : UI.svg_action.none,  // current svg UI action
            'main' : {
                'group' : null,             // #svg_main element
                'width' : 0,
                'clicktime' : 0,            // used to detect doubleclick/tap
                'offset' : {
                    'x' : 0,                // initial translation of svg_main when panning/scaling
                    'y' : 0,
                    'scale' : 0,            // inital scale of svg_main when pinch zooming
                    'distance' : 0          // distance of first touches when pinch zooming
                },
                'pos' : {                   // current position of cursor/touch in svg coordiantes
                    'x' : 0,
                    'y' : 0
                }
            },
            'legend' : {
                'group' : null,             // #svg_legend element
                'selected' : false,
                'init' : {                  // initial translation values for reset
                    'e' : 0,
                    'f' : 0
                },
                'offset' : {
                    'x' : 0,                // initial translation when dragging/scaling
                    'y' : 0
                },
                'scale_offset' : {          // scale_offset = cur_scale - start_pos / legend_width
                    'x' : 0,                // new_scale = scale_offset + current_pos / legend_width
                    'y' : 0
                }
            },
            'phasor': {
                'line' : 0                  // <line> element of currently dragged phasor
            }
        },
        // interaction with phasor list
        'list': {
            'exp_el' : null,                // last focused expression input field
            'info_el' : $( '#phasor_info'), // element of info field
            'direct_edit' : {               // change of label, symbol or parent by user
                'active' : false,
                'target' : 0,               // UI.phasor.label, UI.phasor.symbol or UI.phasor.parent
                'box': 0,                   // <span> element containing both <input> and <span>
                'input' : 0,                // <input> element
                'label' : 0                 // child <span> element
            },
            'touch' : {
                'timer' : null,             // created on touchstart to process longtaps
                'done': false,              // indicates if current touch was processed and can be ignored by touchend
                'id' : 0,                   // phasor id
                'last' : 0,		 			// last touchend in millisec
                'target' : -1				// UI.phasor.xxx
            }
        },
        'locked' : true,
        // #if APP
        'buttons': {
            'dropdown_el' : $( '#btn_dropdown' )
        }
        // #endif
    };

    // -----------------------------------------------------------------------------------------------------------------------------

    setup();

    // -----------------------------------------------------------------------------------------------------------------------------

    // updateSVG():
    //      update SVG but keep current transformations (legend, pan, zoom)
    function updateSVG( reset_main, reset_legend )
    {
        let gotm = false, gotl = false;
        let ma, md, me, mf;
        let la, ld, le, lf;
        if( ui.svg.main.group !== null ) {
            ma = ui.svg.main.group.transform.baseVal[0].matrix.a;
            md = ui.svg.main.group.transform.baseVal[0].matrix.d;
            me = ui.svg.main.group.transform.baseVal[0].matrix.e;
            mf = ui.svg.main.group.transform.baseVal[0].matrix.f;
            gotm = true;
        }
        if( ui.svg.legend.group !== null ) {
            la = ui.svg.legend.group.transform.baseVal[0].matrix.a;
            ld = ui.svg.legend.group.transform.baseVal[0].matrix.d;
            le = ui.svg.legend.group.transform.baseVal[0].matrix.e;
            lf = ui.svg.legend.group.transform.baseVal[0].matrix.f;
            gotl = true;
        }
        svg.update();
        ui.svg.main.group = document.getElementById( 'svg_main' );
        ui.svg.legend.group = document.getElementById( 'svg_legend' );
        if( gotm && ui.svg.main.group !== null && !reset_main ) {
            ui.svg.main.group.transform.baseVal[0].matrix.a = ma;
            ui.svg.main.group.transform.baseVal[0].matrix.d = md;
            ui.svg.main.group.transform.baseVal[0].matrix.e = me;
            ui.svg.main.group.transform.baseVal[0].matrix.f = mf;
        }
        if( ui.svg.legend.group !== null ) {
            ui.svg.legend.init.e = ui.svg.legend.group.transform.baseVal[0].matrix.e;
            ui.svg.legend.init.f = ui.svg.legend.group.transform.baseVal[0].matrix.f;
            if( gotl && !reset_legend ) {
                ui.svg.legend.group.transform.baseVal[0].matrix.a = la;
                ui.svg.legend.group.transform.baseVal[0].matrix.d = ld;
                ui.svg.legend.group.transform.baseVal[0].matrix.e = le;
                ui.svg.legend.group.transform.baseVal[0].matrix.f = lf;
            }
        }
    }

    // directPhasorEditStart( id, target )
    //      start change of phasor label, symbol or parent: show <input>
    //      id : id of phasor
    //      target : UI.phasor.label, UI.phasor.symbol or UI.phasor.parent
    function directPhasorEditStart( id, target )
    {
        if( !ui.list.direct_edit.active ) {
            let p = phasors.getSelected();
            if( p ) {
                ui.list.direct_edit.active = true;
                ui.list.direct_edit.target = target;
                let el = $(document.getElementById('phasor_' + id));

                switch( target )
                {
                    case UI.phasor.symbol:
                        ui.list.direct_edit.box = el.find( 'span.phasor_symbol' );
                        break;
                    case UI.phasor.label:
                        ui.list.direct_edit.box = el.find( 'span.phasor_label' );
                        break;
                    case UI.phasor.parent:
                        ui.list.direct_edit.box = el.find( 'span.phasor_parent' );
                        break;
                }

                ui.list.direct_edit.label = ui.list.direct_edit.box.find( 'span' );
                ui.list.direct_edit.input = ui.list.direct_edit.box.find( 'input' );
                ui.list.direct_edit.label.addClass( 'hidden' );
                ui.list.direct_edit.input.removeClass( 'hidden' );
                ui.list.direct_edit.input.focus();

                switch( target )
                {
                    case UI.phasor.symbol:
                        ui.list.direct_edit.input.val( p.symbol );
                        ui.list.direct_edit.input[0].setSelectionRange( p.symbol.length, p.symbol.length );
                        break;
                    case UI.phasor.label:
                        ui.list.direct_edit.input.val( p.label );
                        ui.list.direct_edit.input[0].setSelectionRange( p.label.length, p.label.length );
                        break;
                    case UI.phasor.parent:
                        if( p.parent ) {
                            ui.list.direct_edit.input.val( p.parent.symbol );
                            ui.list.direct_edit.input[0].setSelectionRange( p.parent.symbol.length, p.parent.symbol.length );
                        } else {
                            ui.list.direct_edit.input.val( '' );
                        }
                        break;
                }
            }
        }
    }

    // directPhasorEditEnd( strict )
    //      ends direct edit of phasor label, symbol or parent.
    //      strict : if true end direct edit only when new value was successfully set
    function directPhasorEditEnd( strict )
    {
        if( ui.list.direct_edit.active ) {
            let success = false;
            let p = phasors.getSelected();
            let str = ui.list.direct_edit.input.val();

            if( !p ) {
                return;
            }
            switch( ui.list.direct_edit.target )
            {
                case UI.phasor.symbol:
                    success = phasors.set( p, phasors.en.symbol, str );
                    break;
                case UI.phasor.label:
                    success = phasors.set( p, phasors.en.label, str );
                    break;
                case UI.phasor.parent:
                    success = phasors.set( p, phasors.en.parent, str );
                    break;
            }
            if( success || !strict ) {
                ui.list.direct_edit.input.addClass( 'hidden' );
                ui.list.direct_edit.label.removeClass( 'hidden' );
                ui.list.direct_edit.active = false;
                if( success ) {
                    updateSVG( false, (ui.list.direct_edit.target == UI.phasor.label) );
                }
            }
        }
    }

    // -----------------------------------------------------------------------------------------------------------------------------

    // onSVGClick( event )
    //      'click' event handler of SVG element
    function onSVGClick( e )
    {
        // suppress bubbling to exclude svg events from onBodyClick()
        e.stopPropagation();
        e.preventDefault();

        // #if APP
        ui.buttons.dropdown_el.dropdown( 'hide' );
        // #endif
    }

    // onSVGActionStart( event )
    //      'mousedown' / 'touchstart' event handler of SVG element
    function onSVGActionStart( e )
    {
        if( (ui.svg.action != UI.svg_action.none && ui.svg.action != UI.svg_action.pan) ) {
            return;
        }
        if( ui.list.direct_edit.active ) {
            directPhasorEditEnd( false );
        }

        e.stopPropagation();
        e.preventDefault();

        if( ui.list.exp_el ) {
            ui.list.exp_el.blur();
        }

        let ctm = ui.svg.jqel[0].getScreenCTM();

        if( e.touches ) {
            if( e.touches.length >= 2 ) {
                // svg pinch zoom
                if( e.touches.length == 2 && !ui.locked ) {
                    ui.svg.main.offset.distance = Math.hypot( e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY );
                    ui.svg.main.offset.scale = ui.svg.main.group.transform.baseVal[0].matrix.a;
                    ui.svg.main.offset.x = (0.5 * (e.touches[0].pageX + e.touches[1].pageX) - ctm.e) / ctm.a;
                    ui.svg.main.offset.y = (0.5 * (e.touches[0].pageY + e.touches[1].pageY) - ctm.f) / ctm.d;
                    ui.svg.action = UI.svg_action.zoom;
                    ui.svg.main.width = ui.svg.jqel.width();
                }
                return;
            }
            e = e.touches[0];
        }

        if( Date.now() - ui.svg.main.clicktime < 200 ) {
            // reset SVG transformation
            if( !ui.locked && ui.svg.main.group ) {
                ui.svg.main.group.transform.baseVal[0].matrix.a = 1;
                ui.svg.main.group.transform.baseVal[0].matrix.d = 1;
                ui.svg.main.group.transform.baseVal[0].matrix.e = 0;
                ui.svg.main.group.transform.baseVal[0].matrix.f = 0;
            }
            if( ui.svg.legend.group ) {
                ui.svg.legend.group.transform.baseVal[0].matrix.a = 1;
                ui.svg.legend.group.transform.baseVal[0].matrix.d = 1;
                ui.svg.legend.group.transform.baseVal[0].matrix.e = ui.svg.legend.init.e;
                ui.svg.legend.group.transform.baseVal[0].matrix.f = ui.svg.legend.init.f;
            }
            return;
        }

        ui.svg.main.pos.x = (e.clientX - ctm.e) / ctm.a;
        ui.svg.main.pos.y = (e.clientY - ctm.f) / ctm.d;

        // phasor drag
        let tx, ty, txx, tyy;
        for( let i = 0; i < svg.phasordrag.points.length; i++ ) {
            txx = (ui.svg.main.pos.x - ui.svg.main.group.transform.baseVal[0].matrix.e) / ui.svg.main.group.transform.baseVal[0].matrix.a;
            tyy = (ui.svg.main.pos.y - ui.svg.main.group.transform.baseVal[0].matrix.f) / ui.svg.main.group.transform.baseVal[0].matrix.d;
            tx = txx - svg.phasordrag.points[i].x;
            ty = tyy - svg.phasordrag.points[i].y;
            if( tx * tx + ty * ty <= svg.phasordrag.radius_squard ) {
                phasors.setExcSelected( svg.phasordrag.points[i].id );
                ui.svg.action = UI.svg_action.phasor_drag;
                ui.svg.phasor.line = document.getElementById( 'svg_phasor_' + svg.phasordrag.points[i].id ).children[1];
                ui.svg.phasor.line.nextSibling.setAttribute( 'class', 'invisible' );
                ui.svg.phasor.line.previousSibling.setAttribute( 'class', 'invisible' );
                ui.svg.phasor.line.setAttribute( 'class', '' );
                //ui.svg.phasor.line.setAttribute( 'x2', tx );
                //ui.svg.phasor.line.setAttribute( 'y2', ty );
                ui.svg.phasor.line.setAttribute( 'x2', (ui.svg.main.pos.x - ui.svg.main.group.transform.baseVal[0].matrix.e) / ui.svg.main.group.transform.baseVal[0].matrix.a );
                ui.svg.phasor.line.setAttribute( 'y2', (ui.svg.main.pos.y - ui.svg.main.group.transform.baseVal[0].matrix.f) / ui.svg.main.group.transform.baseVal[0].matrix.d );
                phasors.setSelectionInfo();
                return;
            }
        }

        if ( e.target.parentNode.id.substr(0,11) === 'svg_phasor_' ) {
            if( e.ctrlKey ) {
                phasors.setSelected( e.target.parentNode.id.substr(11), true );
            } else {
                phasors.setExcSelected( e.target.parentNode.id.substr(11) );
            }
            phasors.setSelectionInfo();
        // no phasor
        } else {
            phasors.clearSelection();
            phasors.setSelectionInfo();
            // legend
            if( e.target.parentNode.id == 'svg_legend' ) {
                if( e.target.tagName == 'circle' ) {
                    ui.svg.action = UI.svg_action.legend_scale;
                    ui.svg.legend.scale_offset.x = ui.svg.legend.group.transform.baseVal[0].matrix.a - ui.svg.main.pos.x / ui.svg.legend.group.firstElementChild.width.baseVal.value;
                    ui.svg.legend.scale_offset.y = ui.svg.legend.group.transform.baseVal[0].matrix.d - ui.svg.main.pos.x / ui.svg.legend.group.firstElementChild.width.baseVal.value;
                } else {
                    ui.svg.action = UI.svg_action.legend_drag;
                    ui.svg.legend.offset.x = ui.svg.main.pos.x - ui.svg.legend.group.transform.baseVal[0].matrix.e;
                    ui.svg.legend.offset.y = ui.svg.main.pos.y - ui.svg.legend.group.transform.baseVal[0].matrix.f;
                }
                ui.svg.legend.group.getElementsByTagName('circle')[0].setAttribute( 'class', 'svg_legend_scale' );
                ui.svg.legend.selected = true;
            } else {
                if( ui.svg.legend.selected ) {
                    ui.svg.legend.group.getElementsByTagName('circle')[0].setAttribute( 'class', 'invisible' );
                    ui.svg.legend.selected = false;
                }
                // main panning
                if( !ui.locked ) {
                    ui.svg.action = UI.svg_action.pan;
                    ui.svg.main.offset.x = ui.svg.main.pos.x - ui.svg.main.group.transform.baseVal[0].matrix.e;
                    ui.svg.main.offset.y = ui.svg.main.pos.y - ui.svg.main.group.transform.baseVal[0].matrix.f;
                }
                ui.svg.main.clicktime = Date.now();
            }
        }
    }

    // onSVGActionMove( event )
    //      'mousemove' / 'touchmove' event handler of SVG element
    function onSVGActionMove( e )
    {
        e.stopPropagation();
        e.preventDefault();

        if ( e.touches ) {
            if( e.touches.length >= 2 ) {
                if( ui.svg.action == UI.svg_action.zoom && e.touches.length === 2 ) {
                    // pinch zoom
                    let dist = Math.hypot( e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY );
                    let scale = ui.svg.main.offset.scale + ((dist - ui.svg.main.offset.distance) / ui.svg.main.width );
                    ui.svg.main.group.transform.baseVal[0].matrix.e += (ui.svg.main.group.transform.baseVal[0].matrix.a - scale) * (ui.svg.main.offset.x - ui.svg.main.group.transform.baseVal[0].matrix.e) / ui.svg.main.group.transform.baseVal[0].matrix.a;
                    ui.svg.main.group.transform.baseVal[0].matrix.f += (ui.svg.main.group.transform.baseVal[0].matrix.d - scale) * (ui.svg.main.offset.y - ui.svg.main.group.transform.baseVal[0].matrix.f) / ui.svg.main.group.transform.baseVal[0].matrix.d;
                    ui.svg.main.group.transform.baseVal[0].matrix.a = scale;
                    ui.svg.main.group.transform.baseVal[0].matrix.d = scale;
                }
                return;
            } else {
                e = e.touches[0];
            }
        }

        let ctm = ui.svg.jqel[0].getScreenCTM();
        ui.svg.main.pos.x = (e.clientX - ctm.e) / ctm.a;
        ui.svg.main.pos.y = (e.clientY - ctm.f) / ctm.d;

        switch(ui.svg.action)
        {
            case UI.svg_action.phasor_drag:
            {
                ui.svg.phasor.line.setAttribute( 'x2', (ui.svg.main.pos.x - ui.svg.main.group.transform.baseVal[0].matrix.e) / ui.svg.main.group.transform.baseVal[0].matrix.a );
                ui.svg.phasor.line.setAttribute( 'y2', (ui.svg.main.pos.y - ui.svg.main.group.transform.baseVal[0].matrix.f) / ui.svg.main.group.transform.baseVal[0].matrix.d );
                break;
            }
            case UI.svg_action.legend_drag:
            {
                ui.svg.legend.group.transform.baseVal[0].matrix.e = ui.svg.main.pos.x - ui.svg.legend.offset.x;
                ui.svg.legend.group.transform.baseVal[0].matrix.f = ui.svg.main.pos.y - ui.svg.legend.offset.y;
                break;
            }
            case UI.svg_action.legend_scale:
            {
                let scalex = ui.svg.legend.scale_offset.x + ui.svg.main.pos.x / ui.svg.legend.group.firstElementChild.width.baseVal.value;
                let scaley = ui.svg.legend.scale_offset.y + ui.svg.main.pos.y / ui.svg.legend.group.firstElementChild.width.baseVal.value;
                if(scalex <= 0.5) {
                    scalex = 0.5;
                }
                // preserve aspect ratio
                if(scalex >= scaley) {
                    ui.svg.legend.group.transform.baseVal[0].matrix.a = scalex;
                    ui.svg.legend.group.transform.baseVal[0].matrix.d = scalex;
                } else {
                    ui.svg.legend.group.transform.baseVal[0].matrix.a = scaley;
                    ui.svg.legend.group.transform.baseVal[0].matrix.d = scaley;
                }
                break;
            }
            case UI.svg_action.pan:
            {
                ui.svg.main.group.transform.baseVal[0].matrix.e = ui.svg.main.pos.x - ui.svg.main.offset.x;
                ui.svg.main.group.transform.baseVal[0].matrix.f = ui.svg.main.pos.y - ui.svg.main.offset.y;
                break;
            }
        }
    }

    // onSVGActionEnd( event )
    //      'mouseup', 'touchend', 'mouseleave' and 'touchcancel' event handler of SVG element
    function onSVGActionEnd()
    {
        if( ui.svg.action == UI.svg_action.phasor_drag ) {
            let p = phasors.getSelected();
            if( p ) {
                let scale = svg.getScale();
                let newx = ( ui.svg.phasor.line.getAttribute('x2') / scale ) - p.sx;
                let newy = ( -1 * ui.svg.phasor.line.getAttribute('y2') / scale ) - p.sy;

                phasors.set( p, phasors.en.position, newx, newy );
                phasors.setSelectionInfo();
                updateSVG( false, false );
            }
        }
        ui.svg.action = UI.svg_action.none;
    }

    // onSVGMouseWheel( event )
    //      'mousewheel' event handler of SVG element (jquery.mousewheel.js needed!)
    // #if APP
    function onSVGMouseWheel( e )
    {
        if( ui.svg.action === UI.svg_action.none && !ui.locked) {
            let scale;
            if(e.deltaY === -1) {
                if( ui.svg.main.group.transform.baseVal[0].matrix.a <= 0.5 ) {
                    return;
                }
                scale = 0.975;
            } else {
                if( ui.svg.main.group.transform.baseVal[0].matrix.a >= 2.5 ) {
                    return;
                }
                scale = 1.025;
            }
            ui.svg.main.group.transform.baseVal[0].matrix.a *= scale;
            ui.svg.main.group.transform.baseVal[0].matrix.d *= scale;
            ui.svg.main.group.transform.baseVal[0].matrix.e += (1 - scale) * (ui.svg.main.pos.x - ui.svg.main.group.transform.baseVal[0].matrix.e) / ui.svg.main.group.transform.baseVal[0].matrix.a;
            ui.svg.main.group.transform.baseVal[0].matrix.f += (1 - scale) * (ui.svg.main.pos.y - ui.svg.main.group.transform.baseVal[0].matrix.f) / ui.svg.main.group.transform.baseVal[0].matrix.d;
        }
    }
    // #endif

    // -----------------------------------------------------------------------------------------------------------------------------

    // onPLMouseEnter( event )
    //      'mouseenter' event handler of #phasor_list
    //      shows tooltips in #phasor_info if no phasor is selected
    // #if APP
    function onPLMouseEnter( e )
    {
        if( ui.list.direct_edit.active || !phasors.isSelectionEmpty() ) {
            return;
        }

        e.stopPropagation();
        let el = $( e.target ).closest( 'div.form-row' );
        let p = phasors.get( el.data( 'id' ) );
        let ident = e.target.getAttribute( 'data-ident' );

        switch( ident )
        {
            case 'system':
            {
                let s = p.label + ' coordinate representation: ';
                if( p.system === constants.system.none ) {
                    s += 'custom.';
                } else if( p.system === constants.system.cartesean ) {
                    s += 'cartesean.';
                } else if( p.system === constants.system.polar_rad ) {
                    s += 'polar (rad).';
                } else {
                    s += 'polar (deg).';
                }
                ui.list.info_el.html( s );
                break;
            }
            case 'visible':
            {
                if( p.visible ) {
                    ui.list.info_el.html( p.label + ' is visible' );
                } else {
                    ui.list.info_el.html( p.label + ' is not visible' );
                }
                break;
            }
            case 'parent':
            {
                if( p.parent ) {
                    ui.list.info_el.html( 'Parent phasor: ' + p.parent.symbol + ' (change via doubleclick)' );
                } else {
                    ui.list.info_el.html( p.label + ' has no parent. (change via doubleclick)' );
                }
                break;
            }
            case 'label':
            {
                ui.list.info_el.html( 'Label: ' + p.label + ' (change via doubleclick)' );
                break;
            }
            case 'symbol':
            {
                if( p.symbol.length > 0 ) {
                    ui.list.info_el.html( 'Phasor symbol: ' + p.symbol + ' (change via doubleclick)' );
                } else {
                    ui.list.info_el.html( 'No phasor symbol assigned (change via doubleclick)' );
                }
                break;
            }
        }
    }
    // #endif

    // onPLMouseLeave( event )
    //      'mouseleave' event handler of #phasor_list
    // #if APP
    function onPLMouseLeave()
    {
        if( !ui.list.direct_edit.active && phasors.isSelectionEmpty() ) {
            ui.list.info_el.html( '' );
        }
    }
    // #endif

    //  onPLClick( event )
    //      'click' event handler of #phasor_list
    function onPLClick( e )
    {
        e.stopPropagation();

        if( ui.list.touch.done ) {
            return;
        }
        if( ui.list.direct_edit.active ) {
            if( e.target !== ui.list.direct_edit.input[0] ) {
                directPhasorEditEnd( false );
            }
            return;
        }

        let el = $( e.target ).closest( 'div.form-row' );
        let id = el.data( 'id' );

        if( e.ctrlKey ) {
            phasors.setSelected( id, true );
        } else {
            let p = phasors.setExcSelected( id );
            let ident = e.target.getAttribute( 'data-ident' );

            if( p && ident ) {
                switch(ident)
                {
                    case 'system':
                        phasors.set( p, phasors.en.nextsystem );
                        break;
                    case 'visible':
                        phasors.set( p, phasors.en.visible, e.target.checked );
                        updateSVG( false, false );
                        break;
                    case 'exp':
                        ui.list.exp_el = $( e.target );
                        ui.list.exp_el.focus();
                        break;
                }
            }
        }
        phasors.setSelectionInfo();
    }

    // onPLDoubleClick( event )
    //      'dblclick' event handler of #phasor_list
    //      starts direct edit of label, symbol and parent
    function onPLDoubleClick( e )
    {
        if( ui.list.direct_edit.active || ui.list.touch.done ) {
            return;
        }
        e.stopPropagation();

        let el = $( e.target ).closest( 'div.form-row' );
        let id = el.data( 'id' );
        let ident = e.target.getAttribute( 'data-ident' );

        switch(ident)
        {
            case 'label':
                directPhasorEditStart( id, UI.phasor.label );
                break;
            case 'parent':
                directPhasorEditStart( id, UI.phasor.parent );
                break;
            case 'symbol':
                directPhasorEditStart( id, UI.phasor.symbol );
                break;
        }
    }

    // onPLInput( e )
    //      'input' event handler of #phasor_list
    function onPLInput( e )
    {
        e.stopPropagation();
        let el = $( e.target ).closest( 'div.form-row' );
        let id = el.data( 'id' );
        let ident = e.target.getAttribute( 'data-ident' );

        switch(ident)
        {
            case 'exp':
                phasors.parse( id, e.target.value );
                updateSVG( false, false );
                break;
        }

    }

    // onPLTouchStart( event )
    //      'touchstart' event handler of #phasor_list
    function onPLTouchStart( e )
    {
        e.stopPropagation();
        if( ui.list.direct_edit.active ) {
            e.preventDefault();
            return;
        }
        ui.list.touch.id = $( e.target ).closest( 'div.form-row' ).data( 'id' );
        ui.list.touch.done = false;
        ui.list.touch.timer = setTimeout( onPLTouchLong, constants.longtap_time );
        ui.list.touch.target = -1;
        let ident = e.target.getAttribute( 'data-ident' );
        if( ident ) {
            switch(ident)
            {
                case 'label':
                    ui.list.touch.target = UI.phasor.label;
                    break;
                case 'parent':
                    ui.list.touch.target = UI.phasor.parent;
                    break;
                case 'symbol':
                    ui.list.touch.target = UI.phasor.symbol;
                    break;
            }
        }
    }

    // onPLTouchMove( event )
    //      'touchmove' event handler of #phasor_list
    function onPLTouchMove()
    {
        if( ui.list.touch.timer ) {
            clearTimeout( ui.list.touch.timer );
        }
    }

    // onPLTouchCancel( event )
    //      'touchcancel' event handler of #phasor_list
    function onPLTouchCancel()
    {
        if( ui.list.touch.timer ) {
            clearTimeout( ui.list.touch.timer );
        }
    }

    // onPLTouchEnd( event )
    //      'touchend' event handler of #phasor_list
    function onPLTouchEnd()
    {
        //e.preventDefault();
        if( ui.list.touch.timer ) {
            clearTimeout( ui.list.touch.timer );
        }
        var now = Date.now();
        if(!ui.list.touch.done) {
            if(now - ui.list.touch.last <= constants.doubletap_time) {
                if( ui.list.touch.target >= 0 && ui.list.touch.target <= 2) {
                    directPhasorEditStart( ui.list.touch.id, ui.list.touch.target );
                }
                ui.list.touch.done = true;
            }
        }
        ui.list.touch.last = now;
    }

    // onPLTouchLong()
    //      timer function used by touchstart to detect long taps
    function onPLTouchLong()
    {
        ui.list.touch.done = true;
        phasors.setSelected( ui.list.touch.id, true );
        phasors.setSelectionInfo();
    }

    // onPLSortUpdate( e, ui )
    //      event handler of sortable update of #phasor_list
    function onPLSortUpdate( e, ui )
    {
        phasors.changeArrayIndex( ui.item.data( 'id' ), ui.item.index() );
        updateSVG();
    }

    // -----------------------------------------------------------------------------------------------------------------------------

    // onBodyClick( event )
    //      'click' event handler for <body>
    function onBodyClick( e )
    {
        // deselect SVG legend
        if( ui.svg.legend.selected ) {
            ui.svg.legend.selected = false;
            if( ui.svg.legend.group ) {
                ui.svg.legend.group.getElementsByTagName('circle')[0].setAttribute( 'class', 'invisible' );
            }
        }
        if( ui.list.direct_edit.active ) {
            // end direct edit if click outside of <input>
            if( e.target !== ui.list.direct_edit.input[0] ) {
                directPhasorEditEnd( false );
            }
        } else {
            // clear current phasor selection
            if( !dialogs.isVisible() && e.target.tagName !== 'BUTTON' && e.target.id !== 'phasor_info' ) {
                phasors.clearSelection();
                ui.list.info_el.html( '' );
            }
        }
    }

    // onKeyUp( event )
    //      'keyup' event handler for document
    function onKeyUp( e )
    {
        switch( e.which )
        {
            // DEL
            case 46:
                if(!dialogs.isVisible() && e.target.nodeName !== 'INPUT' && !phasors.isSelectionEmpty()) {
                    e.preventDefault();
                    e.stopPropagation();
                    dialogs.show( dialogs.en.delete );
                }
                break;
            // RETURN
            case 13:
                if( ui.list.direct_edit.active ) {
                    e.preventDefault();
                    e.stopPropagation();
                    directPhasorEditEnd( true );
                }
                break;
        }
    }

    // -----------------------------------------------------------------------------------------------------------------------------
    // #if APP
    // onButtonClick(event)
    //      'click' event handler for all buttons
    function onButtonClick( e )
    {
        if( e.target.id == 'btn_dropdown') {
            return;
        }
        e.stopPropagation();

        if( ui.list.direct_edit.active ) {
            directPhasorEditEnd( false );
            return;
        }

        ui.buttons.dropdown_el.dropdown( 'hide' );

        switch( e.target.id )
        {
            case 'btn_add':
            {
                let id = phasors.add();
                let el = $( document.getElementById( 'phasor_' + id ) ).find( 'input.phasor_exp' );
                el.focus();
                ui.list.exp_el = el;
                break;
            }
            case 'btn_del':
                dialogs.show( dialogs.en.delete );
                break;
            case 'btn_edit':
                dialogs.show( dialogs.en.edit );
                break;
            case 'btn_settings':
                dialogs.show( dialogs.en.settings );
                break;
            case 'btn_info':
                dialogs.show( dialogs.en.info );
                break;
            case 'btn_savepng':
                dialogs.show( dialogs.en.save, 'png' );
                break;
            case 'btn_savesvg':
                dialogs.show( dialogs.en.save, 'svg' );
                break;
            case 'btn_savejson':
                dialogs.show( dialogs.en.save, 'json' );
                break;
            case 'btn_load':
                dialogs.show( dialogs.en.load );
                break;
            case 'btn_upload':
                dialogs.show( dialogs.en.upload );
                break;
            case 'btn_lock':
            {
                ui.locked = !ui.locked;
                $( '#phasor_list' ).sortable( 'option', 'disabled', ui.locked );
                if( ui.locked ) {
                    $(e.target).removeClass( 'icon-lock-open' );
                    $(e.target).addClass( 'icon-lock' );
                    ui.list.info_el.html( 'Zoom/pan & reordering of phasors is disabled' );
                } else {
                    $(e.target).removeClass( 'icon-lock' );
                    $(e.target).addClass( 'icon-lock-open' );
                    ui.list.info_el.html( 'Zoom/pan & reordering of phasors is enabled' );
                }
                break;
            }
        }
    }
    // #endif

    // #if APP
    function onButtonMouseOver( e )
    {
        switch( e.target.id )
        {
            case 'btn_add':
                ui.list.info_el.html( 'Add a new phasor' );
                break;
            case 'btn_del':
                if( phasors.isSelectionEmpty() ) {
                    ui.list.info_el.html( 'No phasor selected' );
                } else {
                    ui.list.info_el.html( 'Delete currently selected phasor(s)' );
                }
                break;
            case 'btn_edit':
                if( phasors.isSelectionEmpty() ) {
                    ui.list.info_el.html( 'No phasor selected' );
                } else {
                    ui.list.info_el.html( 'Change properties of currently selected phasor(s)' );
                }
                break;
            case 'btn_settings':
                ui.list.info_el.html( 'Open settings dialog' );
                break;
            case 'btn_info':
                ui.list.info_el.html( 'Open help/about dialog' );
                break;
            case 'btn_lock':
                if( ui.locked ) {
                    ui.list.info_el.html( 'Zoom/pan & reordering of phasors is disabled' );
                } else {
                    ui.list.info_el.html( 'Zoom/pan & reordering of phasors is enabled' );
                }
                break;
            default:
                ui.list.info_el.html( '' );
        }
    }
    // #endif

    // #if APP
    function onButtonMouseLeave()
    {
        if( !ui.list.direct_edit.active && phasors.isSelectionEmpty() ) {
            ui.list.info_el.html( '' );
        }
    }
    // #endif

    // -----------------------------------------------------------------------------------------------------------------------------

    // #if WEB
    function exportSetLocked( b )
    {
        ui.locked = b ? true : false;
        $( '#phasor_list' ).sortable( 'option', 'disabled', ui.locked );
    }

    function exportLoad( s )
    {
        files.loadString( s );
        updateSVG( true, true );
    }

    function exportDlgEdit()
    {
        dialogs.show( dialogs.en.edit );
    }

    function exportDlgSettings()
    {
        dialogs.show( dialogs.en.settings );
    }

    function exportDlgDel()
    {
        dialogs.show( dialogs.en.delete );
    }

    function exportDlgUpload()
    {
        dialogs.show( dialogs.en.upload );
    }

    function exportDownload( code )
    {
        if( code.match( constants.code_regex ) ) {
            $.ajax({
                url: constants.ajax_url,
                method: "POST",
                data: { 'action' : 'get', 'code' : code },
                dataType: "html",
                timeout: 2000
            }).done(function( msg ) {
                try {
                    let o = JSON.parse(msg);
                    if( o.success ) {
                        if( Settings.check( o.data.settings ) && phasors.load( o.data.phasors )) {
                            settings.load( o.data.settings );
                            updateSVG( true, true );
                        } else {
                            APP.showToast( 'Invalid data' );
                            exportInit();
                        }
                    } else {
                        APP.showToast( 'Invalid Code' );
                        exportInit();
                    }
                } catch(exc) {
                    APP.showToast( 'Invalid data' );
                    exportInit();
                }
            }).fail(function() {
                APP.showToast( 'Download failed' );
                exportInit();
            });
        } else {
            APP.showToast( 'Invalid Code' );
            exportInit();
        }
    }

    function exportDlgInfo()
    {
        dialogs.show( dialogs.en.info );
    }

    function exportDlgSave( ft )
    {
        dialogs.show( dialogs.en.save, ft );
    }

    function exportAdd()
    {
        let id = phasors.add();
        let el = $( document.getElementById( 'phasor_' + id ) ).find( 'input.phasor_exp' );
        el.focus();
        ui.list.exp_el = el;
    }

    function exportReset()
    {
        ui.svg.main.group.transform.baseVal[0].matrix.a = 1;
        ui.svg.main.group.transform.baseVal[0].matrix.d = 1;
        ui.svg.main.group.transform.baseVal[0].matrix.e = 0;
        ui.svg.main.group.transform.baseVal[0].matrix.f = 0;
        phasors.reset();
        settings.reset();
        updateSVG( true, true );
    }

    function exportInit()
    {
        if( !phasors.count() ) {
            phasors.add(1, 1);
            updateSVG( false, false );
        }
    }
    // #endif

    // -----------------------------------------------------------------------------------------------------------------------------

    // setup()
    //      setup event handlers etc.
    function setup()
    {
        $( document ).keyup( onKeyUp );
        $( 'body' ).on( 'click', onBodyClick );

        ui.svg.jqel.on( 'click', onSVGClick );
        ui.svg.jqel.on( 'mousedown', onSVGActionStart );
        ui.svg.jqel.on( 'touchstart', onSVGActionStart );
        ui.svg.jqel.on( 'mousemove', onSVGActionMove );
        ui.svg.jqel.on( 'touchmove', onSVGActionMove );
        ui.svg.jqel.on( 'mouseup', onSVGActionEnd );
        ui.svg.jqel.on( 'touchend', onSVGActionEnd );
        ui.svg.jqel.on( 'mouseleave', onSVGActionEnd );
        ui.svg.jqel.on( 'touchcancel', onSVGActionEnd );
        // #if APP
        ui.svg.jqel.on( 'mousewheel', onSVGMouseWheel );
        // #endif

        let pl = $( '#phasor_list' );
        // #if APP
        pl.on( 'mouseover', onPLMouseEnter );
        pl.on( 'mouseout' , onPLMouseLeave );
        // #endif
        pl.on( 'click', onPLClick );
        pl.on( 'dblclick', onPLDoubleClick );
        pl.on( 'touchstart', onPLTouchStart );
        pl.on( 'touchmove', onPLTouchMove );
        pl.on( 'touchcancel', onPLTouchCancel );
        pl.on( 'touchend', onPLTouchEnd );
        pl.on( 'input', onPLInput );
        pl.sortable({
            revert : true,
            disabled : true,
            update: onPLSortUpdate
        });

        // #if APP
        if( document.getElementById('btn_del') ) {
            $( '#buttons button').on( 'click', onButtonClick );
            $( '#buttons' ).on( 'mouseover', onButtonMouseOver ).on( 'mouseleave', onButtonMouseLeave );
        }
        // #endif

        // #if WEB
        window.phasorviz = {
            'dlgEdit' : exportDlgEdit,
            'dlgSettings' : exportDlgSettings,
            'dlgInfo' : exportDlgInfo,
            'dlgDel' : exportDlgDel,
            'dlgSave' : exportDlgSave,
            'dlgUpload' : exportDlgUpload,
            'load' : exportLoad,
            'add' : exportAdd,
            'reset' : exportReset,
            'setlocked' : exportSetLocked,
            'download' : exportDownload,
            'init' : exportInit
        };
        // #endif

        dialogs.setup( updateSVG );

        // #if APP
        let code = null;
        if( location.pathname.substr(0,3) == '/c/' ) {
            code = location.pathname.substr(3, 6);
        } else {
            code = help.getParameter('code');
        }
        if( !code || !code.match( constants.code_regex ) ) {
            phasors.add(1, 1);
            updateSVG();
        } else {
            $.ajax({
                url: constants.ajax_url,
                method: "POST",
                data: { 'action' : 'get', 'code' : code },
                dataType: "html",
                timeout: 2000
            }).done( msg => {
                try {
                    let o = JSON.parse(msg);
                    if( o.success ) {
                        if( Settings.check( o.data.settings ) && phasors.load( o.data.phasors )) {
                            settings.load( o.data.settings );
                            updateSVG();
                        } else {
                            phasors.add(1, 1);
                            updateSVG();
                        }
                    } else {
                        phasors.add(1, 1);
                        updateSVG();
                    }
                } catch(exc) {
                    phasors.add(1, 1);
                    updateSVG();
                }
            }).fail(() => {
                phasors.add(1, 1);
                updateSVG();
            });
        }
        // #endif
    }
}

$(document).ready(function() { PhasorViz(); });