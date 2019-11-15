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
import { settings, Settings } from './settings.js';
import { phasors } from './phasors.js';

export { files };

/*
    handler to save/load files

    savePNG( filename, width, height, color )
    saveSVG( filename )
    saveJSON( filename )
    load( file, callback )
    loadString( str, callback )
*/

var files = (function ()
{
    var canvas = document.createElement( 'canvas' );

    // _getCleanSVGString( width, height )
    //      returns cleaned up string of the current svg
    function _getCleanSVGString( width, height )
    {
        let clone = document.getElementById( 'svg' ).cloneNode( true );
        let clone_jq = $( clone );
        if( typeof width !== 'undefined' && typeof height !== 'undefined' ) {
            clone_jq.attr( 'width', width );
            clone_jq.attr( 'height', height );
        }
        clone_jq.find( '#svg_phasors g' ).removeAttr( 'filter' );
        clone_jq.find( '#svg_legend circle, defs filter, #svg_phasors line, #svg_phasors circle').remove();
        let svgDocType = document.implementation.createDocumentType( 'svg', constants.svg.publicid, constants.svg.systemId );
        let svgDoc = document.implementation.createDocument( constants.svg.ns, 'svg', svgDocType );
        svgDoc.replaceChild( clone, svgDoc.documentElement );
        return (new XMLSerializer()).serializeToString( svgDoc );
    }

    // getSaveString()
    //      returns string to save current state
    function getSaveString()
    {
        let emain = document.getElementById( 'svg_main' );
        let elegend = document.getElementById( 'svg_legend' );

        return '{ "settings" : ' + JSON.stringify(settings) + ', "phasors" : ' + phasors.stringify() + ', "transform" : { "main" : { ' +
                   '"a" : ' + emain.transform.baseVal[0].matrix.a + ', "d" : ' + emain.transform.baseVal[0].matrix.d +
                   ', "e" : ' + emain.transform.baseVal[0].matrix.e + ', "f" : ' + emain.transform.baseVal[0].matrix.f + ' }, "legend" : { ' +
                   '"a" : ' + elegend.transform.baseVal[0].matrix.a + ', "d" : ' + elegend.transform.baseVal[0].matrix.d +
                   ', "e" : ' + elegend.transform.baseVal[0].matrix.e + ', "f" : ' + elegend.transform.baseVal[0].matrix.f + ' } } }';
    }

    // savePNG( filename, width, height, color )
    //      renders current svg in canvas and prepares .png download of result
    function savePNG( filename, width, height, color )
    {
        canvas.width  = width;
        canvas.height = height;

        var ctx = canvas.getContext( '2d' );
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);

        var domURL = self.URL || self.webkitURL || self;
        var svgimage = new Blob( [_getCleanSVGString( width, height )], { type: 'image/svg+xml;charset=utf-8' } );
        var url = domURL.createObjectURL( svgimage );
        let img = new Image;

        img.onload = function () {
            ctx.drawImage( this, 0, 0 );
            domURL.revokeObjectURL( url );
            if( constants.appmode ) {
                APP.saveFile( filename, canvas.toDataURL('image/png') );
            } else {
                saveAs( canvas.toDataURL( 'image/png' ), filename );
            }
        };
        img.src = url;
    }

    // saveSVG( filename )
    //      prepares download of .svg file
    function saveSVG( filename, width, height )
    {
        if( constants.appmode ) {
            APP.saveFile( filename, _getCleanSVGString( width, height ) );
        } else {
            let blob = new Blob( [_getCleanSVGString( width, height )], { type: 'image/svg+xml' } );
            saveAs( blob, filename );
        }
    }

    // saveJSON( filename )
    //      prepares download of phasorviz .json file
    function saveJSON( filename )
    {
        let data = getSaveString();
        if( constants.appmode ) {
            APP.saveFile( filename, data );
        } else {
            let blob = new Blob( [data], { type: 'application/json' } );
            saveAs( blob, filename );
        }
    }

    // loadJSON( file, func )
    //      trys to load .json file, calls func with { 'success' : true/false , 'msg' : errormsg }
    function load( file, func )
    {
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                let data = JSON.parse( e.target.result );

                if( Settings.check( data.settings ) && phasors.load( data.phasors )) {
                    settings.load( data.settings );
                    func( { 'success' : true, 'transform' : data.transform } );
                } else {
                    func( { 'success' : false, 'msg' : 'failed to parse phasorviz data.' } );
                }
            } catch(exc) {
                func( { 'success' : false, 'msg' : 'failed to parse JSON.' } );
            }
        };
        reader.onerror = function(e) {
            func( { 'success' : false, 'msg' : 'Failed to read file. (Errorcode: ' + e.target.error.code + ')' } );
        };
        reader.readAsText( file );
    }

    // loadJSONString( str, func )
    //      trys to load .json string, returns null or transform object
    function loadString( str )
    {
        try {
            let data = JSON.parse( str );

            if( Settings.check( data.settings ) && phasors.load( data.phasors )) {
                settings.load( data.settings );
                return data.transform;
            } else {
                if( constants.appmode ) {
                    APP.showToast( 'Invalid file' );
                }
            }
        } catch(exc) {
            if( constants.appmode ) {
                APP.showToast( 'Failed to parse JSON' );
            }
        }
        return null;
    }

    return {
        'savePNG' : savePNG,
        'saveSVG' : saveSVG,
        'saveJSON' : saveJSON,
        'load' : load,
        'loadString' : loadString,
        'getSaveString' : getSaveString
    };
}());