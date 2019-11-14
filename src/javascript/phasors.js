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

import { Color } from './color.js';
import { constants } from './constants.js';
import { help } from './help.js';

export { phasors };

/*
    Phasor
        if possible phasorlist.set() should be used to modify attributes.

        id              int             id/key
        parent          Phasor          parent
        valid_parent    boolean         false if one of the ancestors is invalid
        value           math.complex    phasor coordinates
        sx, sy          number          vector origin
        fx, fy          number          origin + vector ( sx, sy, fx, fy are calculated by PhasorArray._updateCoordinates() )
        valid           boolean
        coord_string    string array    strings of phasor coordinates in cartesean, rad, deg format
        width           int             width ( 1 - constants.max_phasor_width )
        arrow           int             index of constants.arrow_types
        arrow_size      int             size of arrowhead ( 1-20, default: 10 )
        visible         boolean
        system          enum/int        see constants.system
        label           string
        color           Color           fill color, see color.js
        color_index     int             index of current color in constants.phasor_colors
        outline_color   Color
        outline_width   int             0 to constants.max_outline_width
        symbol          string
        dependencies    Phasor array    array of Phasors this Phasor depends on
        expcode                         compiled input string (math.js)
        skin            int             constants.phasor_skins
*/

class Phasor {
    constructor(id, x, y, color_index, label)
    {
        this.id = id;
        this.parent = null;
        this.value = math.complex(x, y);
        this.valid = true;
        this.valid_exp = true;
        this.valid_parent = true;
        this.sx = 0;
        this.sy = 0;
        this.fx = 0;
        this.fy = 0;
        this.length = 0;
        this.coord_strings = [];
        this.width = constants.default_phasor.width;
        this.arrow = constants.default_phasor.arrow;
        this.arrow_size = constants.default_phasor.arrow_size;
        this.visible = true;
        this.outline_width = constants.default_phasor.outline_width;
        this.dependencies = [];
        this.system = constants.system.cartesean;
        this.label = label;
        this.symbol = '';
        this.color_index = color_index;
        this.color = new Color(constants.phasor_colors[color_index]);
        this.outline_color = new Color(constants.phasor_colors[color_index]);
        this.expcode = null;
        this.skin = 0;
    }
}

/*
    phasorlist
        get( id )                       : returns Phasor object with key id or null
        set( phasor, what, p1, [p2] )   : sets what-Property (PLEnum) of phasor (id or object), returns true on success
        add( x, y )                     : add Phasor
        delete( p )                     : deletes Phasor or Array of Phasors
        parse( phasor, str )            : parse str to setup phasor (id or object)
        stringify()                     : returns JSON array of current list
        load( array )                   : loads list based on array
        reset()                         : resets list
        getByIndex( ind )               : returns Phasor by index ( instead of key like get() )
        count()                         : returns number of phasors
        getMaxLength()                  : returns maximum length of phasors,
        setSelectionInfo()              : set list info toolbar based on current selection
        setSelected( id, toggle )       : adds (toggle == false) or removes (toggle == true) phasor with key id from selection
        clearSelection()                : clears phasor selection
        setExcSelected()                : sets only phasor with key == id as selected. returns Phasor or null
        getSelection()                  : returns Array of selected Phasors
        isSelected()                    : returns true if Phasor with key == id is selected
        getSelected()                   : returns Phasor if only one is selected, otherwise null
        isSelectionEmpty()              : returns true if selection is empty
*/

var phasors = (function ()
{
    const PLEnum = {
        'position' : 0,
        'label' : 1,
        'color' : 2,
        'symbol' : 3,
        'parent' : 4,
        'visible' : 5,
        'nextsystem' : 6,
        'skin' : 7
    };
    Object.freeze( PLEnum );

    var phasors = new Map();                                        // main container

    var cur = {
        'arr' : [],                                                 // array of current phasors for easier iteration
        'selection' : [],                                           // current selection
        'scope' : {},                                               // obj with symbol keys
        'phasor' : null,                                            // has to be set before calling node.traverse( _saveDependencies ) in parse()
        'max_phasor_len' : 0,                                       // maxium vector length of all phasors
        'next_id' : 0,                                              // next phasor key
        'free_ids' : [],                                            // free phasor keys
        'color_usage' : new Array(constants.phasor_colors.length),  // array saving which of constants.phasor_colors are currently in use
        'label_index' : 0                                           // label-number of next phasor
    };

    var protected_symbols = [ 'i', 'e', 'exp', 'sin', 'cos', 'tan', 'pi' ];

    cur.color_usage.fill(0);

    // get( id )
    //      returns Phasor with key id or null
    function get( id )
    {
        if(typeof id === 'string') {
            id = Number(id);
        }
        let res = phasors.get( id );
        if(typeof res === 'undefined') {
            return null;
        } else {
            return res;
        }
    }

    // set( phasor, what, x, y )
    //      sets phasor property, return true on success
    //      phasor : phasor object or key
    //      what : PLEnum
    function set( phasor, what, x, y )
    {
        let p = _setPhasor( phasor );
        if( !p ) {
            return false;
        }

        switch(what)
        {
            case PLEnum.position:
            {
                if( typeof x === 'string' && x != '' ) {
                    x = Number(x);
                }
                if( typeof x !== 'number' || !isFinite(x) ) {
                    x = Number.NaN;
                }
                if( typeof y === 'string' && y != '' ) {
                    y = Number(y);
                }
                if( typeof y !== 'number' || !isFinite(y) ) {
                    y = Number.NaN;
                }
                p.value.re = x;
                p.value.im = y;

                _setValidExp( p, !(isNaN(x) || isNaN(y)) );
                _updateCoordinatesStrings( p );
                _evaluateDepending( p );
                _updateCoordinates();
                html.updatePhasor( p, html.en.u.expression );
                break;
            }
            case PLEnum.label:
            {
                if( typeof x !== 'string' || x.length <= 0 || x.length > constants.max_label_length || !x.match(constants.label_regex) ) {
                    return false;
                }
                p.label = x;
                html.updatePhasor( p, html.en.u.label );
                break;
            }
            case PLEnum.color:
            {
                if( !p.color.set( x ) ) {
                    return false;
                }
                // check if new color is one of constants.phasor_colors and update Phasor.color_usage
                let new_color_index = -1;
                for( let i = 0; i < constants.phasor_colors.length; i++ ) {
                    if( p.color.equals( constants.phasor_colors[i] ) ) {
                        new_color_index = i;
                        break;
                    }
                }
                if( new_color_index != p.color_index ) {
                    if( p.color_index != -1 ) {
                        cur.color_usage[p.color_index]--;
                    }
                    if( new_color_index != -1 ) {
                        cur.color_usage[new_color_index]++;
                    }
                    p.color_index = new_color_index;
                }
                break;
            }
            case PLEnum.symbol:
            {
                if( typeof x !== 'string' ) {
                    return false;
                }
                let valid = true;
                if( x.length > 0 ) {
                    if( x.match(constants.symbol_regex) && !protected_symbols.includes( x ) ) {
                        for( let i = 0; i < cur.arr.length; i++ ) {
                            if( cur.arr[i] !== p && x === cur.arr[i].symbol ) {
                                valid = false; // symbol already in use
                                break;
                            }
                        }
                    } else {
                        valid = false;
                    }
                }
                if( !valid ) {
                    return false;
                }
                if( p.symbol !== x) {
                    if( p.symbol.length > 0) {
                        delete cur.scope[p.symbol];
                    }
                    if( x.length > 0 ) {
                        cur.scope[x] = p.value;
                    }
                    let got_old_symbol = (p.symbol.length > 0);
                    let got_new_symbol = (x.length > 0);
                    p.symbol = x;
                    if( got_old_symbol ) {
                        for( let i = 0; i < cur.arr.length; i++ ) {
                            if( cur.arr[i] === p ) {
                                continue;
                            }
                            if( cur.arr[i].dependencies.includes( p ) ) {
                                _setValidExp( cur.arr[i], false );
                            }
                            if( cur.arr[i].parent === p ) {
                                if( got_new_symbol ) {
                                    _setValidParent( cur.arr[i], p.valid );
                                } else {
                                    cur.arr[i].parent = null;
                                }
                                html.updatePhasor( cur.arr[i], html.en.u.parent );
                            }
                        }
                    }
                    html.updatePhasor( p, html.en.u.symbol );
                    if( p.valid_exp ) {
                        _reparseInvalids();
                        _updateCoordinates();
                        html.setInfo( cur.selection );
                    }
                }
                break;
            }
            case PLEnum.parent:
            {
                if( typeof x !== 'string' ) {
                    return false;
                }
                if( x === '' ) {
                    if( p.parent !== null ) {
                        p.parent = null;
                        html.updatePhasor( p, html.en.u.parent );
                        _updateCoordinates();
                    }
                } else {
                    let target = null;
                    for ( let i = 0; i < cur.arr.length; i++ ) {
                        if(p !== cur.arr[i] && cur.arr[i].symbol === x) {
                            // found phasor with matching symbol: check for looping dependencies
                            target = cur.arr[i];
                            let pa = target.parent;
                            while( pa ) {
                                if( pa === p ) {
                                    target = null;
                                    break;
                                }
                                pa = pa.parent;
                            }
                            break;
                        }
                    }
                    if( !target ) {
                        return false;
                    }
                    p.parent = target;
                    html.updatePhasor( p, html.en.u.parent );
                    _setValidParent( p, target.valid );
                    _updateCoordinates();
                }
                break;
            }
            case PLEnum.visible:
            {
                if( typeof x !== 'boolean' ) {
                    return false;
                }
                p.visible = x;
                _updateCoordinates();
                break;
            }
            case PLEnum.nextsystem:
            {
                if( p.system === constants.system.none ) {
                    return false;
                }
                p.system++;
                if( p.system > constants.system.count ) {
                    p.system = 1;
                }
                let el = $( document.getElementById('phasor_' + p.id) );
                html.updatePhasor( p, html.en.u.expression, el );
                html.updatePhasor( p, html.en.u.system, el );
                break;
            }
            case PLEnum.skin:
            {
                if( x >= 0 && x < constants.phasor_skins.length ) {
                    p.skin = x;
                    html.updatePhasor( p, html.en.u.skin );
                }
                break;
            }
            default:
            {
                return false;
            }
        }
        return true;
    }

    // add( x, y )
    //      adds Phasor with values x, y
    function add( x, y )
    {
        if( typeof x === 'string' && x != '' ) {
            x = Number(x);
        }
        if( typeof x !== 'number' || !isFinite(x) ) {
            x = Number.NaN;
        }
        if( typeof y === 'string' && y != '') {
            y = Number(y);
        }
        if( typeof y !== 'number' || !isFinite(y) ) {
            y = Number.NaN;
        }

        let id;
        if( cur.free_ids.length ) {
            id = cur.free_ids.pop();
        } else {
            id = cur.next_id;
            cur.next_id++;
        }

        // search for least used of constants.phasor_colors
        let color_index = 0;
        let depth = 0;
        while( cur.color_usage[color_index] != depth ) {
            color_index++;
            if( color_index >= constants.phasor_colors.length ) {
                color_index = 0;
                depth++;
            }
        }
        cur.color_usage[color_index]++;
        cur.label_index++;

        let p = new Phasor( id, x, y, color_index, 'Phasor ' + cur.label_index );

        p.valid_exp = !(isNaN(x) || isNaN(y));
        p.valid = p.valid_exp
        _updateCoordinatesStrings( p );
        phasors.set( id, p );
        cur.arr.push( p );

        if( p.valid ) {
            _updateCoordinates();
        }
        html.add( p );
        html.updatePhasor( p, html.en.u.expclass );
        html.updateLineHeight( cur.arr.length );

        _setButtonsEnabled( cur.selection.length > 0 );

        return id;
    }

    function remove( sel )
    {
        if( !Array.isArray(sel) ) {
            sel = [ sel ];
        }

        let success = false;
        let p = null;

        for( let i = 0; i < sel.length; i++ ) {
            if( sel[i] instanceof Phasor ) {
                p = sel[i];
            } else {
                p = phasors.get( sel[i] );
                if( typeof p === 'undefined') {
                    continue;
                }
            }

            if( p.color_index >= 0 ) {
                cur.color_usage[p.color_index]--;
            }
            if( p.symbol !== '') {
                delete cur.scope[p.symbol];
            }

            _setValidExp( p, false );
            phasors.delete( p.id );
            for( let ii = 0; ii < cur.arr.length; ii++){
                if ( cur.arr[ii] === p) {
                    cur.arr.splice(ii, 1);
                    break;
                }
            }
            for( let ii = 0; ii < cur.selection.length; ii++){
                if ( cur.selection[ii] === p) {
                    cur.selection.splice(ii, 1);
                    break;
                }
            }

            if( p.id == cur.next_id - 1 ) {
                cur.next_id--;
            } else {
                cur.free_ids.push( p.id );
            }
            html.delete( p );

            success = true;
        }
        if( success ) {
            _updateCoordinates();
            _setButtonsEnabled( cur.selection.length > 0 );
            html.setInfo( cur.selection );
            html.updateLineHeight( cur.arr.length );
            return true;
        }
        return false;
    }

    // parse( phasor, str )
    //      parse str to set phasor coordinates
    function parse( phasor, str )
    {
        let p = _setPhasor(phasor);
        if( !p ) {
            return false;
        }

        try {
            let node = math.parse( str );
            p.system = _getExpressionSystem( node );

            // store dependencies
            p.dependencies = [];
            cur.phasor = p;
            node.traverse( _saveDependencies );

            // compile & evaluate
            p.expcode = node.compile();
            _checkDependencies( p );
            _evaluate( p );

            _setValidExp( p, true );
            _updateCoordinatesStrings( p );
        } catch (e) {
            _setValidExp( p, false );
            p.system = constants.system.none;
        }
        _evaluateDepending( p );
        _updateCoordinates();
        html.updatePhasor( p, html.en.u.system );
        html.setInfo( cur.selection );
    }

    // stringify()
    //      returns JSON array that can be passed to load()
    function stringify()
    {
        var ret = '[';
        // save phasors in current order
        $( '#phasor_list' ).children().each(function(i) {
            let el = $( this );
            let p = phasors.get( el.data( 'id' ) );
            if( typeof p !== 'undefined' ) {
                let expression = JSON.stringify( el.find( 'input.phasor_exp' ).val() );
                if(i > 0) {
                    ret += ',';
                }
                ret += '{ "id" : ' + p.id + ', "parent" : ' + (p.parent ? p.parent.id : -1) + ',  "value" : ' + expression + ', "width" : ' + p.width + ', "skin" : ' + p.skin + ', "arrow" : ' + p.arrow + ', "arrow_size" : ' + p.arrow_size + ', "visible" : ' + p.visible + ', "label" : ' + JSON.stringify(p.label) + ', "color_index" : ' + p.color_index + ', "color": "' + p.color.rgba + '", "outline_width" : ' + p.outline_width + ', "outline_color" : "' + p.outline_color.rgba + '", "symbol" : ' + JSON.stringify(p.symbol) + '}';
                i++;
            }
        });
        ret += ']';
        return ret;
    }

    // load( array )
    //      loads array created by stringify()
    function load( array )
    {
        // build array of Phasors
        let list = [];
        let highest_id = -1;
        try {
            for( let i = 0; i < array.length; i++ ) {
                help.checkInt( array[i].id, 0, 9999 );
                help.checkInt( array[i].color_index, -1, constants.phasor_colors.length - 1 );
                help.checkString( array[i].label, constants.max_label_length );
                help.checkString( array[i].value, 256 );
                help.checkInt( array[i].width, 1, constants.max_phasor_width );
                help.checkInt( array[i].arrow, 0, constants.arrow_types.length - 1 );
                help.checkInt( array[i].arrow_size, constants.arrow_size.min, constants.arrow_size.max );
                help.checkInt( array[i].skin, 0, constants.phasor_skins.length );
                help.checkBool( array[i].visible );
                help.checkInt( array[i].outline_width, 0, constants.max_outline_width );
                help.checkString( array[i].symbol, 64 );
                if( array[i].symbol.length > 0 && (!array[i].symbol.match(constants.symbol_regex) || protected_symbols.includes( array[i].symbol )) ) {
                    throw new Error( 'invalid symbol' );
                }
                help.checkInt( array[i].parent, -1, 9999 );
                if( array[i].parent === array[i].id ) {
                    throw new Error('invalid parent');
                }
                list.push( new Phasor( array[i].id, 1, 1, array[i].color_index, array[i].label ) );
                if( array[i].color_index == -1 ) {
                    if( !list[i].color.set( array[i].color ) ) {
                        throw new Error( 'invalid color' );
                    }
                }
                list[i].width = array[i].width;
                list[i].arrow = array[i].arrow;
                list[i].arrow_size = array[i].arrow_size;
                list[i].skin = array[i].skin;
                list[i].visible = array[i].visible;
                list[i].outline_width = array[i].outline_width;
                list[i].symbol = array[i].symbol;
                if( !list[i].outline_color.set( array[i].outline_color ) ) {
                    throw new Error( 'invalid outline color' );
                }
                if( array[i].id > highest_id ) {
                    highest_id = array[i].id;
                }
                array[i].parsed = false;
            }

            for( let i = 0; i < array.length; i++ ) {
                // check parent
                if( array[i].parent >= 0 ) {
                    let p_ind;
                    for( p_ind = 0; p_ind < list.length; p_ind++ ) {
                        if( list[p_ind].id === array[i].parent ) {
                            break;
                        }
                    }
                    if( p_ind == list.length ) {
                        throw new Error('parent not found');
                    }
                    list[i].parent = list[array[i].parent];
                }
                // check symbols
                if( list[i].symbol.length > 0 ) {
                    for( let ii = 0; ii < array.length; ii++ ) {
                        if( ii !== i && list[i].symbol === list[ii].symbol ) {
                            throw new Error('two identical symbols');
                        }
                    }
                }
            }
            for( let i = 0; i < list.length; i++ ) {
                // check for parent loops
                let cur_p = list[i].parent;
                while( cur_p ) {
                    if( cur_p === list[i] ) {
                        throw new Error( 'invalid parent loop' );
                    }
                    cur_p = cur_p.parent;
                }
                // check for dependencies loops
                _checkDependencies( list[i] );
            }
        } catch(exc) {
            return false;
        }

        // validation successful: list holds array of new phasors
        // replace current phasors
        phasors.clear();
        html.clear();
        cur.arr = [];
        cur.selection = [];
        cur.scope = {};
        cur.color_usage.fill(0);

        for( let i = 0; i < list.length; i++ ) {
            phasors.set( list[i].id, list[i] );
            cur.arr.push( list[i] );
            if( list[i].symbol.length > 0 ) {
                cur.scope[list[i].symbol] = list[i].value;
            }
            if( list[i].color_index >= 0 ) {
                cur.color_usage[list[i].color_index]++;
            }
            let el = html.add( list[i] );
            el.find( 'input.phasor_exp' ).val( array[i].value );
            html.updatePhasor( list[i], html.en.u.label, el );
            html.updatePhasor( list[i], html.en.u.visible, el );
            html.updatePhasor( list[i], html.en.u.parent, el );
            html.updatePhasor( list[i], html.en.u.symbol, el );
            html.updatePhasor( list[i], html.en.u.skin, el );
        }
        cur.next_id = highest_id + 1;
        cur.label_index = cur.next_id;
        for( let i = 0; i < cur.next_id; i++ ) {
            if( typeof phasors.get( i ) === 'undefined' ) {
                cur.free_ids.push( i );
            }
        }

        html.updateLineHeight( cur.arr.length );
        _setButtonsEnabled( false );

        // parse phasors: just try until its of no use anymore :)
        let aLeft = list.length;
        let aLeftBefore = 0;
        while( aLeftBefore != aLeft ) {
            aLeftBefore = aLeft;
            for( let i = 0; i < list.length; i++ ) {
                if( !array[i].parsed && ( list[i].parent == null || list[i].parent.valid ) ) {
                    parse( list[i], array[i].value );
                    if( list[i].valid ) {
                        array[i].parsed = true;
                        aLeft--;
                    }
                }
            }
        }

        _updateCoordinates();
        return true;
    }

    // resetList()
    //      resets phasor list
    function resetList()
    {
        phasors.clear();
        cur.arr = [];
        html.clear();
        cur.max_phasor_len = 0;
        for( let i = 0; i < cur.color_usage.length; i++ ) {
            cur.color_usage[i] = 0;
        }
        cur.free_ids = [];
        cur.next_id = 0;
        cur.label_index = 0;
        cur.selection = [];
        cur.scope = {};
        add(1, 1);
        html.setInfo( [] );
    }

    // changeArrayIndex( id, index )
    //      changes position of phasor with id to index in cur.arr i.e. on sort
    function changeArrayIndex( id, index )
    {
        for( let i = 0; i < cur.arr.length; i++ ) {
            if( cur.arr[i].id == id ) {
                if( i !== index ) {
                    let tp = cur.arr[i];
                    if( index < i ) {
                        for( let ii = i; ii > index ; ii-- ) {
                            cur.arr[ii] = cur.arr[ii - 1];
                        }
                    } else {
                        for( let ii = i; ii < index; ii++ ) {
                            cur.arr[ii] = cur.arr[ii + 1];
                        }
                    }
                    cur.arr[index] = tp;
                }
                break;
            }
        }
    }

    // getByIndex( ind )
    //      returns Phasor by index ( instead of key like get() )
    function getByIndex( ind )
    {
        return cur.arr[ind];
    }

    // count()
    //      returns number of Phasors
    function count()
    {
        return cur.arr.length;
    }

    // getMaxLength()
    //      returns maximum length of phasors
    function getMaxLength()
    {
        return cur.max_phasor_len;
    }

    // setSelectionInfo()
    //      sets PhasorList Info Toolbar based on current selection
    function setSelectionInfo()
    {
        html.setInfo( cur.selection );
    }

    // setSelected(id, toggle)
    //      adds (toggle == false) or removes (toggle == true) phasor with key id from selection
    //      return Phasor if valid or null
    function setSelected( id, toggle = false )
    {
        if( typeof id === 'string' ) {
            id = Number(id);
        }
        let p = null;
        for( let i = 0; i < cur.selection.length; i++ ) {
            if( cur.selection[i].id === id ) {
                p = cur.selection[i];
                break;
            }
        }
        if( !p ) {
            p = phasors.get( id );
            if( typeof p === 'undefined' ) {
                p = null;
            } else {
                html.setSelected( p, true );
                cur.selection.push( p );
            }
        } else if( toggle ) {
            html.setSelected( p, false );
            for( let i = 0; i < cur.selection.length; i++ ) {
                if( cur.selection[i] === p ) {
                    cur.arr.splice( i, 1 );
                    break;
                }
            }
        }
        _setButtonsEnabled( cur.selection.length > 0 );
        return p;
    }

    // clearSelection()
    //      clears phasor selection
    function clearSelection()
    {
        for ( let i = 0; i < cur.selection.length; i++ ) {
            html.setSelected( cur.selection[i], false );
        }
        cur.selection = [];
        _setButtonsEnabled( false );
    }

    // setExcSelected( id )
    //      sets only phasor with key == id as selected. returns Phasor or null
    function setExcSelected( id )
    {
        if( typeof id === 'string' ) {
            id = parseInt( id, 10 );
        }
        let p = phasors.get( id );
        if( typeof p !== 'undefined' ) {
            let already_selected = false;
            for ( let i = 0; i < cur.selection.length; i++ ) {
                if( cur.selection[i] !== p ) {
                    html.setSelected( cur.selection[i], false );
                } else {
                    already_selected = true;
                }
            }
            cur.selection = [ p ];
            if( !already_selected ) {
                html.setSelected( p, true );
            }

            _setButtonsEnabled( true );
            return p;
        } else {
            return null;
        }
    }

    // getSelection()
    //      returns Array of selected Phasors
    function getSelection()
    {
        return cur.selection.slice(0);
    }

    // isSelected( id )
    //      returns true if Phasor with key == id is selected
    function isSelected( id )
    {
        for ( let i = 0; i < cur.selection.length; i++ ) {
            if( cur.selection[i].id === id ) {
                return true;
            }
        }
        return false;
    }

    // getSelected()
    //      returns Phasor if only one is selected, otherwise null
    function getSelected()
    {
        if( cur.selection.length === 1 ) {
            return cur.selection[0];
        } else {
            return null;
        }
    }

    // isSelectionEmpty()
    //      returns true if selection is empty
    function isSelectionEmpty()
    {
        return (cur.selection.length > 0) ? false : true;
    }

    function _setButtonsEnabled( b )
    {
        if( constants.appmode ) {
            APP.enableButtons( b );
        } else {
            html.enableButton( html.en.btn.del, b );
            html.enableButton( html.en.btn.edit, b );
        }
    }

    // _setPhasor( p )
    //      returns Phasor object based on p or null
    function _setPhasor( p )
    {
        if( !(p instanceof Phasor) ) {
            if( typeof p === 'string' ) {
                p = Number( p );
            }
            p = phasors.get( p );
            if( typeof p === 'undefined' ) {
                return null;
            }
        }
        return p;
    }

    // _setValidExp( phasor, value )
    //      sets phasor.valid_exp to value and updates dom
    function _setValidExp( phasor, b )
    {
        if( phasor.valid_exp != b ) {
            phasor.valid_exp = b;
            phasor.valid = (phasor.valid_exp && phasor.valid_parent);
            if( phasor.symbol.length > 0 ) {
                if( phasor.valid_exp ) {
                    cur.scope[phasor.symbol] = phasor.value;
                } else {
                    delete cur.scope[phasor.symbol];
                }
            }
            html.updatePhasor( phasor, html.en.u.expclass );
            for( let i = 0; i < cur.arr.length; i++ ) {
                if( cur.arr[i] === phasor) {
                    continue;
                }
                if( cur.arr[i].parent === phasor ) {
                    _setValidParent( cur.arr[i], phasor.valid );
                }
                if( phasor.symbol.length > 0 ) {
                    for( let ii = 0; ii < cur.arr[i].dependencies.length; ii++ ) {
                        if( cur.arr[i].dependencies[ii] === phasor ) {
                            _setValidExp( cur.arr[i], phasor.valid_exp );
                        }
                    }
                }
            }
        }
    }

    // _setValidParent( phasor, value )
    //      sets phasor.valid_parent to value and updates dom
    function _setValidParent( phasor, b )
    {
        if( phasor.valid_parent !== b ) {
            phasor.valid_parent = b;
            phasor.valid = (phasor.valid_exp && phasor.valid_parent);
            html.updatePhasor( phasor, html.en.u.parentclass );
            for( let i = 0; i < cur.arr.length; i++ ) {
                if( cur.arr[i].parent === phasor ) {
                    _setValidParent( cur.arr[i], phasor.valid );
                }
            }
        }
    }

    // _saveDependencies( node, path, parent )
    //      used by parse() to save dependencies when compiling an expression, cur.phasor has to be set!
    //      for clarity sake it would maybe be better to use a nested function instead of cur.phasor
    function _saveDependencies( node )
    {
        if( node.type === 'SymbolNode' && node.name.length >= 1 && !protected_symbols.includes(node.name) ) {
            for ( let i = 0; i < cur.arr.length; i++ ) {
                if( node.name === cur.arr[i].symbol ) {
                    if( !cur.phasor.dependencies.includes( cur.arr[i] ) ) {
                        cur.phasor.dependencies.push( cur.arr[i] );
                    }
                    break;
                }
            }
        }
    }

    // _checkDependencies( phasor )
    //      checks if there are loops in a phasors dependencies, throws Error()
    function _checkDependencies( p, _p )
    {
        if(typeof _p === 'undefined' ) {
            _p = p;
        }
        for( let i = 0; i < p.dependencies.length; i++ ) {
            if( p.dependencies[i] === _p ) {
                throw Error("looping dependency");
            }
            _checkDependencies( p.dependencies[i], _p );
        }
    }

    function _reparseInvalids()
    {
        var still_invalid = 0;
        for( let i = 0; i < cur.arr.length; i++ ) {
            if( !cur.arr[i].valid_exp ) {
                try {
                    let str = $( '#phasor_' + cur.arr[i].id + ' input.phasor_exp' ).val();
                    let node = math.parse( str );
                    cur.arr[i].system = _getExpressionSystem( node );
                    cur.arr[i].dependencies = [];
                    cur.phasor = cur.arr[i];
                    node.traverse( _saveDependencies );
                    cur.arr[i].expcode = node.compile();
                    _checkDependencies( cur.arr[i] );
                    _evaluate( cur.arr[i] );
                    _setValidExp( cur.arr[i], true );
                    _updateCoordinatesStrings( cur.arr[i] );
                } catch (e) {
                    still_invalid++;
                } finally {
                    _evaluateDepending( cur.arr[i] );
                    html.updatePhasor( cur.arr[i], html.en.u.system );
                }
            }
        }
        return still_invalid;
    }

    // _evaluate( phasor )
    //      trys to evaluate phasor, may throw exception
    function _evaluate( p )
    {
        let val = p.expcode.evaluate( cur.scope );
        if( typeof val === 'number' && isFinite(val) ) {
            p.value.re = val;
            p.value.im = 0;
        } else if( typeof val === 'object' && typeof val.im === 'number' && isFinite(val.im) && isFinite(val.re) ) {
            p.value.re = val.re;
            p.value.im = val.im;
        } else {
            throw Error('evaluation failed');
        }
    }

    // _evaluateDepending( phasor )
    //      reevaluates all Phasors depending on phasor
    function _evaluateDepending( phasor )
    {
        let ignore = new Set();
        ignore.add( phasor );
        __evaluateDepending( ignore, phasor );
    }

    // maybe not neccessary to avoid nested function...
    function __evaluateDepending( ignore, phasor )
    {
        for ( let i = 0; i < cur.arr.length; i++ ) {
            if( ignore.has( cur.arr[i] ) ) {
                continue;
            }
            if( cur.arr[i].dependencies.includes( phasor ) ) {
                if( phasor.valid ) {
                    try {
                        _evaluate( cur.arr[i] );
                        _setValidExp( cur.arr[i], true );
                    } catch(e) {
                        _setValidExp( cur.arr[i], false );
                    }
                } else {
                    _setValidExp( cur.arr[i], false );
                }
                _updateCoordinatesStrings( cur.arr[i] );
                ignore.add( cur.arr[i] );
                __evaluateDepending( ignore, cur.arr[i] );
            }
        }
    }

    // _calcOrigin( phasor )
    //      calculates sx, sy, fx, fy of phasor
    function _calcOrigin( p, parent )
    {
        if( typeof parent === 'undefined' ) {
            parent = p.parent;
            p.sx = 0;
            p.sy = 0;
        }
        if( !parent ) {
            p.fx = p.sx + p.value.re;
            p.fy = p.sy + p.value.im;
        } else {
            p.sx += parent.value.re;
            p.sy += parent.value.im;
            _calcOrigin( p, parent.parent );
        }
    }

    // _updateCoordinates()
    //      calls _calcOrigin() for every valid and visible Phasor and sets cur.max_phasor_len
    function _updateCoordinates()
    {
        cur.max_phasor_len = 0;
        let s_length, f_length;

        for ( let i = 0; i < cur.arr.length; i++ ) {
            if( !(cur.arr[i].valid && cur.arr[i].visible) ) {
                continue;
            }
            _calcOrigin( cur.arr[i] );

            s_length = Math.sqrt( cur.arr[i].sx * cur.arr[i].sx + cur.arr[i].sy * cur.arr[i].sy );
            f_length = Math.sqrt( cur.arr[i].fx * cur.arr[i].fx + cur.arr[i].fy * cur.arr[i].fy );
            if( s_length > cur.max_phasor_len ) {
                cur.max_phasor_len = s_length;
            }
            if( f_length > cur.max_phasor_len ) {
                cur.max_phasor_len = f_length;
            }
        }
    }

    // _getExpressionSystem( n )
    //      used by parse() to try to find coordinate representation of phasor expression
    function _getExpressionSystem( n )
    {
        if(n.isOperatorNode) {
            if(n.op === '+' || n.op === '-') {
                if(n.args.length == 2) {
                    if(n.args[0].isConstantNode || (n.args[0].isOperatorNode && n.args[0].op === '-' && n.args[0].args[0].isConstantNode)) {
                        if(n.args[1].isOperatorNode && n.args[1].op === '*' && n.args[1].args.length == 2) {
                            if(n.args[1].args[1].isSymbolNode && n.args[1].args[1].name === 'i') {
                                if(n.args[1].args[0].isConstantNode || (n.args[1].args[0].isOperatorNode && n.args[1].args[0].op === '-' && n.args[1].args[0].args[0].isConstantNode)) {
                                    return constants.system.cartesean;
                                }
                            } else if(n.args[1].args[0].isSymbolNode && n.args[1].args[0].name === 'i') {
                                if(n.args[1].args[1].isConstantNode || (n.args[1].args[1].isOperatorNode && n.args[1].args[1].op === '-' && n.args[1].args[1].args[0].isConstantNode)) {
                                    return constants.system.cartesean;
                                }
                            }
                        } else if(n.args[1].isSymbolNode && n.args[1].name === 'i') {
                            return constants.system.cartesean;
                        }
                    }
                } else if(n.args.length == 1 && (n.args[0].isConstantNode || (n.args[0].isSymbolNode && n.args[0].name === 'i'))) {
                    return constants.system.cartesean;
                }
            } else if(n.op === '*') {
                if (n.args[0].isSymbolNode && n.args[0].name === 'i' && (n.args[1].isConstantNode || (n.args[1].op === '-' && n.args[1].args.length === 1 && n.args[1].args[0].isConstantNode))) {
                    return constants.system.cartesean;
                } else if (n.args[0].isConstantNode || (n.args[0].op === '-' && n.args[0].args.length === 1 && n.args[0].args[0].isConstantNode)) {
                    var e;
                    if(n.args[1].isSymbolNode && n.args[1].name === 'i') {
                        return constants.system.cartesean;
                    } else if(n.args[1].isOperatorNode && n.args[1].op == '^' && n.args[1].args.length == 2 && n.args[1].args[0].isSymbolNode && n.args[1].args[0].name === 'e') {
                        e = n.args[1].args[1].content;
                    } else if(n.args[1].isFunctionNode && n.args[1].name == 'exp' && n.args[1].args.length == 1) {
                        e = n.args[1].args[0];
                    } else {
                        return constants.system.none;
                    }
                    if(e.isOperatorNode && e.op == '*' && e.args.length == 2 && e.args[0].isSymbolNode && e.args[0].name === 'i' && (e.args[1].isConstantNode || (e.args[1].isOperatorNode && e.args[1].op === '-' && e.args[1].args[0].isConstantNode))) {
                        return constants.system.polar_rad;
                    } else if(e.isOperatorNode && e.op == '/' && e.args[1].isSymbolNode && e.args[1].name == 'pi' && e.args[0].isOperatorNode && e.args[0].op == '*' &&
                              e.args[0].args[0].isSymbolNode && e.args[0].args[0].name === 'i' && (e.args[0].args[1].isConstantNode || (e.args[0].args[1].isOperatorNode && e.args[0].args[1].op === '-' && e.args[0].args[1].args[0].isConstantNode))) {
                        return constants.system.polar_rad;
                    } else if(e.isOperatorNode && e.op == '/' && e.args[1].isConstantNode && e.args[1].value == 180 && e.args[0].isOperatorNode && e.args[0].op == '*' &&
                              e.args[0].args[0].isOperatorNode && e.args[0].args[0].op == '*' && e.args[0].args[0].args[0].isSymbolNode && e.args[0].args[0].args[0].name == 'i' &&
                              e.args[0].args[1].isSymbolNode && e.args[0].args[1].name == 'pi' && (e.args[0].args[0].args[1].isConstantNode || (e.args[0].args[0].args[1].isOperatorNode && e.args[0].args[0].args[1].op === '-' && e.args[0].args[0].args[1].args[0].isConstantNode))) {
                        return constants.system.polar_deg;
                    }
                }
            }
        } else if( n.isConstantNode || (n.isSymbolNode && n.name === 'i') ) {
            return constants.system.cartesean;
        }
        return constants.system.none;
    }

    // _updateCoordinatesStrings( phasor )
    //      setup phasor.coord_strings[]
    function _updateCoordinatesStrings( p )
    {
        if( p.valid ) {
            let x = help.round( p.value.re );
            let y = help.round( p.value.im );
            p.length = Math.sqrt( p.value.re * p.value.re + p.value.im * p.value.im );

            let radians = Math.atan2( p.value.im, p.value.re );
            if( radians < 0 ) {
                radians = ( 2 * Math.PI ) + radians;
            }
            let len = help.round( p.length );
            radians = help.round( radians );
            let deg = Math.atan2( p.value.im, p.value.re ) * 180 / Math.PI;
            if( deg < 0 ) {
                deg = 360 + deg;
            }
            deg = help.round( deg );
            p.coord_strings[0] = '( ' + x + ' , ' + y + ' ) , length: ' + len + ' , &phi;: ' + radians + ' rad / ' + deg + '&deg;';
            p.coord_strings[constants.system.cartesean] = '' + x + " + i * " + y;
            p.coord_strings[constants.system.polar_rad] = '' + len + ' * e^(i * ' + radians + ')';
            p.coord_strings[constants.system.polar_deg] = '' + len + ' * e^(i * ' + deg + ' * pi/180)';
        } else {
            p.coord_strings[0] = '';
        }
    }

    return {
        'get' : get,
        'set' : set,
        'add' : add,
        'delete' : remove,
        'parse' : parse,
        'stringify' : stringify,
        'load' : load,
        'reset' : resetList,
        'changeArrayIndex' : changeArrayIndex,
        'getByIndex' : getByIndex,
        'count' : count,
        'getMaxLength' : getMaxLength,
        'setSelectionInfo' : setSelectionInfo,
        'setSelected' : setSelected,
        'clearSelection' : clearSelection,
        'setExcSelected' : setExcSelected,
        'getSelection' : getSelection,
        'isSelected' : isSelected,
        'getSelected' : getSelected,
        'isSelectionEmpty' : isSelectionEmpty,
        'en' : PLEnum
    }
}( html ));

/*
        html object is used by PhasorList to update DOM

        add( phasor )                       : adds Phasor to DOM list, return DOM element
        delete( phasor )                    : removes phasor from DOM list
        clear()                             : removes all phasors from DOM list
        setSelected( phasor, value )        : sets phasor in DOM list ( jquery-element ) selected ( value == true ) or not selected
        enableButton( button, enabled )     : sets button ( PLEnum.btn.xxx ) enabled or not
        update( phasor, what, phasor_el )   : updates DOM element of phasor
        updateLineHeight( phasor_count )    : sets correct css class for DOM list based on phasor count
        setInfo                             : set info field text (#phasor_info) based on Phasor of array of Phasors
*/

var html = (function ()
{
    const PLEnum = {
        'btn' : {
            'del' : 0,
            'edit' : 1
        },
        'u' : {
            'label' : 0,
            'symbol' : 1,
            'parent' : 2,
            'parentclass' : 3,
            'expression' : 4,
            'expclass' : 5,
            'visible' : 6,
            'system' : 7,
            'skin' : 8
        }
    }
    Object.freeze( PLEnum );

    var jqel = $( '#phasor_list' );
    var jqel_info = $( '#phasor_info' );
    var template = document.getElementById( 'phasor_list_template' );
    var cur = {
        'lineheight' : -1
    };

    // add( phasor )
    //      adds new Phasor to jqel based on template with id #phasor_list_template
    function add( p )
    {
        let clone = document.importNode( template.content, true );
        jqel[0].appendChild( clone );
        let el = $( jqel[0].lastElementChild );

        el.find( '.input-group' ).addClass( 'phasor_h' + cur.lineheight );

        update( p, html.en.u.label, el );
        update( p, html.en.u.expression, el );

        el.attr( 'data-id', p.id );
        el.attr( 'id', 'phasor_' + p.id );
        el.data( 'id', p.id );

        return el;
    }

    // remove( phasor )
    //      removes phasor from DOM list
    function remove( p )
    {
        jqel.find( '#phasor_' + p.id ).remove();
    }

    // removeAll()
    //      clears all phasors from dom
    function removeAll()
    {
        jqel.empty();
        cur.lineheight = -1;
    }

    // setSelected( phasor, value )
    //      sets phasor in DOM list (jqel) selected ( value == true ) or not selected
    function setSelected( p, v )
    {
        let el_svg = document.getElementById( 'svg_phasor_' + p.id );
        let el_list = $(document.getElementById( 'phasor_' + p.id ).firstElementChild.firstElementChild);

        if( v ) {
            if( el_svg ) {
                el_svg.firstElementChild.setAttribute( 'filter', 'url(#svg_glow)' );
                if( p.system !== constants.system.none ) {
                    el_svg.lastElementChild.setAttribute( 'fill-opacity', 0.6 );
                }
                $(el_svg).appendTo( $('#svg_phasors') );
            }
            el_list.addClass( 'phasor_selected' );
        } else {
            if( el_svg ) {
                el_svg.firstElementChild.setAttribute( 'filter', '' );
                if( p.system !== constants.system.none ) {
                    el_svg.lastElementChild.setAttribute( 'fill-opacity', 0 );
                }
            }
            el_list.removeClass( 'phasor_selected' );
        }
    }

    // enableButton( button, enabled )
    //      sets button ( PLEnum.btn.xxx ) enabled or not
    function enableButton( b, v )
    {
        switch( b )
        {
            case PLEnum.btn.del:
                $( '#btn_del' ).prop( 'disabled', !v );
                break;
            case PLEnum.btn.edit:
                $( '#btn_edit' ).prop( 'disabled', !v );
                break;
        }
    }

    // update( phasor, what, phasor_el )
    //      updates DOM element of Phasor
    //      what : PLEnum.u.xxx
    function update( p, what, el )
    {
        if( !el ) {
            el = $(document.getElementById( 'phasor_' + p.id ));
            if( !el ) {
                return false;
            }
        }
        switch( what )
        {
            case PLEnum.u.label:
            {
                let fontsize = Math.max( Math.min( 1, 14 / p.label.length ), 0.6 );
                el.find( 'span.phasor_label > span' ).html( p.label ).css( 'font-size', fontsize + 'em' );
                break;
            }
            case PLEnum.u.symbol:
            {
                let fontsize = Math.max( Math.min( 1, 7 / p.symbol.length ), 0.55 );
                el.find( 'span.phasor_symbol > span' ).html( p.symbol ).css( 'font-size', fontsize + 'em' );
                break;
            }
            case PLEnum.u.parent:
            {
                let el_p = el.find( 'span.phasor_parent > span' );
                if( p.parent ) {
                    let fontsize = Math.max( Math.min(1, 7 / p.parent.symbol.length ), 0.55 );
                    el_p.html( p.parent.symbol ).css( 'font-size', fontsize + 'em' );
                } else {
                    el_p.html( '' );
                }
                break;
            }
            case PLEnum.u.parentclass:
            {
                let el_p = el.find( 'span.phasor_parent' );
                if( p.valid_parent ) {
                    el_p.removeClass( 'phasor_parent_invalid' );
                } else {
                    el_p.addClass( 'phasor_parent_invalid' );
                }
                break;
            }
            case PLEnum.u.expression:
            {
                if( p.valid_exp && p.system !== constants.system.none ) {
                    el.find( 'input.phasor_exp' ).val( p.coord_strings[p.system] );
                }
                break;
            }
            case PLEnum.u.expclass:
            {
                let el_p = el.find( 'input.phasor_exp' );
                if( p.valid_exp ) {
                    el_p.removeClass( 'phasor_exp_invalid' );
                } else {
                    el_p.addClass( 'phasor_exp_invalid' );
                }
                break;
            }
            case PLEnum.u.visible:
            {
                el.find( 'div.phasor_visible >input' ).prop( 'checked', p.visible );
                break;
            }
            case PLEnum.u.system:
            {
                el.find( 'span.phasor_system >span' ).html( constants.system_labels[p.system] );
                break;
            }
            case PLEnum.u.skin:
            {
                el.find( '.input-group-text' ).removeClass( constants.phasor_skins[p.skin].classname ).addClass( constants.phasor_skins[p.skin].classname );
                break;
            }
        }
        return true;
    }

    // function updateLineHeight( phasor_count )
    //      sets correct css class for DOM list based on phasor count
    function updateLineHeight( phasor_count )
    {
        let lh = 4;
        for( let i = 2; i >= 0; i-- ) {
            if( phasor_count > constants.lineheight_steps[i] ) {
                lh = 3 - i;
                break;
            }
        }
        if( lh !== cur.lineheight ) {
            let ig = jqel.find( '.input-group' );
            ig.removeClass( 'phasor_h' + cur.lineheight )
            ig.addClass( 'phasor_h' + lh );
            cur.lineheight = lh;
        }
    }

    // setInfo( p )
    //      set info field text (#phasor_info) based on Phasor of array of Phasors
    function setInfo( p )
    {
        if( p instanceof Phasor ) {
            if( p.valid ) {
                jqel_info.html( p.label + ': ' + p.coord_strings );
            } else {
                jqel_info.html( p.label + ' is invalid' );
            }
        } else if( p.length === 1 ) {
            if( p[0].valid ) {
                jqel_info.html( p[0].label + ': ' + p[0].coord_strings[0] );
            } else {
                jqel_info.html( p[0].label + ' is invalid' );
            }
        } else if ( p.length === 2 && p[0].valid && p[1].valid ) {
            let tx = p[0].value.re + p[1].value.re;
            let ty = p[0].value.im + p[1].value.im;
            let angle_rad = Math.acos( (p[0].value.re * p[1].value.re + p[0].value.im * p[1].value.im) / (p[0].length * p[1].length) );
            let angle_deg = angle_rad * 180 / Math.PI;
            if( angle_rad < 0 ) {
                angle_rad = (2 * Math.PI) + angle_rad;
            }
            if( angle_deg < 0 ) {
                angle_deg = 360 + angle_deg;
            }
            angle_rad = help.round( angle_rad );
            angle_deg = help.round( angle_deg );
            tx = help.round( tx );
            ty = help.round( ty );
            let s = p[0].label + ' + ' + p[1].label + ' = ( ' + tx + ' , ' + ty + ' ) , angle: ' + angle_rad + ' rad / ' + angle_deg + '&deg;';
            jqel_info.html( s );
        } else {
            jqel_info.html( '' );
        }
    }

    return {
        'add' : add,
        'delete' : remove,
        'clear' : removeAll,
        'setSelected' : setSelected,
        'enableButton' : enableButton,
        'updatePhasor' : update,
        'updateLineHeight' : updateLineHeight,
        'setInfo' : setInfo,
        'en' : PLEnum
    }
}());