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
import { help } from './help.js';
import { phasors } from './phasors.js';
import { files } from './files.js';

export { dialogs };

/*
    manages bootstrap dialogs ( #dlgdel, #dlgload, #dlgsave, #dlgedit, #dlgsettings )

    show( what : DlgEnum, opt : String )
    isVisible()
    setup( update )
*/

var dialogs = (function ()
{
    const DlgEnum = {
        'none' : 0,
        'edit' : 1,
        'settings' : 2,
        'delete' : 3,
        'load' : 4,
        'save' : 5,
        'info' : 6,
        'upload' : 7
    };
    Object.freeze( DlgEnum );

    var current = DlgEnum.none;
    var updateSVG = null;
    var resetsvg = {
        'main' : false,
        'legend' : false
    }

    // -----------------------------------------------------------------------------------------------------------------------------

    // _onDlgReady( event )
    //      'shown.bs.modal' event handler for dialogs
    function _onDlgReady( e )
    {
        switch( current )
        {
            case DlgEnum.edit:
                $( e.target ).find( 'button.btn-primary' ).focus();
                break;
            case DlgEnum.settings:
                $( e.target ).find( 'button.btn-primary' ).focus();
                break;
            case DlgEnum.delete:
                $( e.target ).find( 'button.btn-danger' ).focus();
                break;
            case DlgEnum.load:
                $( e.target ).find( 'button.btn-primary' ).focus();
                break;
            case DlgEnum.save:
                $( '#dlgsave_name' ).focus();
                break;
            case DlgEnum.info:
                $( e.target ).find( 'button.btn-primary' ).focus();
                break;
            case DlgEnum.upload:
                _dlgUploadAction();
                break;
        }
    }

    // _onDlgHide( event )
    //      'click' on cancel button
    function _onDlgHide()
    {
        switch( current )
        {
            case DlgEnum.edit:
                $( '#dlgedit' ).modal( 'hide' );
                break;
            case DlgEnum.settings:
                $( '#dlgs_cu_ticks' ).removeClass( 'invalid_input' );
                $( '#dlgs_cu_main' ).removeClass( 'invalid_input' );
                $( '#dlgsettings' ).modal( 'hide' );
                break;
            case DlgEnum.delete:
                $( '#dlgdel' ).modal( 'hide' );
                break;
            case DlgEnum.load:
                $( '#dlgload' ).modal( 'hide' );
                break;
            case DlgEnum.save:
                $( '#dlgsave' ).modal( 'hide' );
                break;
            case DlgEnum.info:
                $( '#dlginfo' ).modal( 'hide' );
                break;
            case DlgEnum.upload:
                $( '#dlgupload' ).modal( 'hide' );
                break;
        }
        current = DlgEnum.none;
    }

    // _onDlgAction( event )
    //      'click' on ok button
    function _onDlgAction()
    {
        switch( current )
        {
            case DlgEnum.edit:
            {
                _dlgEditSave();
                updateSVG( resetsvg.main, resetsvg.legend );
                current = DlgEnum.none;
                $( '#dlgedit' ).modal( 'hide' );
                break;
            }
            case DlgEnum.settings:
            {
                if( _dlgSettingsSave() ) {
                    updateSVG(  resetsvg.main, resetsvg.legend  );
                    current = DlgEnum.none;
                    $( '#dlgsettings' ).modal( 'hide' );
                }
                break;
            }
            case DlgEnum.delete:
            {
                phasors.delete( phasors.getSelection() );
                updateSVG( false, false );
                current = DlgEnum.none;
                $( '#dlgdel' ).modal( 'hide' );
                break;
            }
            case DlgEnum.save:
            {
                if( _dlgSaveAction() ) {
                    current = DlgEnum.none;
                    $( '#dlgsave' ).modal( 'hide' );
                }
                break;
            }
            case DlgEnum.info:
            {
                $( '#dlginfo' ).modal( 'hide' );
                break;
            }
            case DlgEnum.upload:
            {
                $( '#dlgupload' ).modal( 'hide' );
                break;
            }
        }
    }

    // _dlgEditInit()
    //      initialize edit dialog for currently selected phasors
    function _dlgEditInit()
    {
        if( phasors.isSelectionEmpty() ) {
            throw new Error( 'empty selection' )
        }
        let sel = phasors.getSelection();
        let i;
        let ow_color, ow_olcolor, ow_olwidth, ow_width, ow_arrow, ow_arrow_size, ow_skin;
        ow_color = ow_olcolor = ow_olwidth = ow_width = ow_arrow = ow_arrow_size = ow_skin = false;

        for( i = 1; i < sel.length; i++ ) {
            if( !ow_color && !sel[i].color.equals(sel[i - 1].color) ) {
                ow_color = true;
            }
            if( !ow_olcolor && !sel[i].outline_color.equals(sel[i - 1].outline_color) ) {
                ow_olcolor = true;
            }
            if( !ow_width && sel[i].width != sel[i - 1].width ) {
                ow_width = true;
            }
            if( !ow_olwidth && sel[i].outline_width != sel[i - 1].outline_width ) {
                ow_olwidth = true;
            }
            if(!ow_arrow && sel[i].arrow != sel[i - 1].arrow) {
                ow_arrow = true;
            }
            if(!ow_arrow_size && sel[i].arrow_size != sel[i - 1].arrow_size) {
                ow_arrow_size = true;
            }
            if(!ow_skin && sel[i].skin != sel[i - 1].skin) {
                ow_skin = true;
            }
        }

        // set overlay for attributes with differing values
        _dlgEditSetOverlay( 'dlgedit_color', ow_color );
        _dlgEditSetOverlay( 'dlgedit_color_ol', ow_olcolor );
        _dlgEditSetOverlay( 'dlgedit_width', ow_width );
        _dlgEditSetOverlay( 'dlgedit_ol_width', ow_olwidth );
        _dlgEditSetOverlay( 'dlgedit_arrow', ow_arrow );
        _dlgEditSetOverlay( 'dlgedit_arrowsize', ow_arrow_size );
        _dlgEditSetOverlay( 'dlgedit_skin', ow_skin );

        // set html controls to values of first selected phasor
        let color_input = $( '#dlgedit_color > input' );
        color_input.val( sel[0].color.rgba );
        color_input.trigger( 'change' );
        color_input = $( '#dlgedit_color_ol > input' );
        color_input.val( sel[0].outline_color.rgba );
        color_input.trigger('change' );
        $( '#dlgedit_ol_width option' ).eq( sel[0].outline_width ).prop( 'selected', true );
        $( '#dlgedit_width option' ).eq( sel[0].width - 1 ).prop( 'selected', true );
        $( '#dlgedit_arrow option' ).eq( sel[0].arrow ).prop( 'selected', true );
        $( '#dlgedit_arrowsize' ).val( sel[0].arrow_size );
        $( '#dlgedit_skin option' ).eq( sel[0].skin ).prop( 'selected', true );
    }

    // _dlgEditSetOverlay( id, overwrite )
    //      helper function used by showEdit() to prepare overlays when editing multiple phasors
    function _dlgEditSetOverlay( id, overwrite )
    {
        let row = document.getElementById( id ).parentElement.parentElement;
        let row_divs = row.children;
        $(row).data( 'overlay', overwrite ).data( 'overwrite', overwrite );
        if( overwrite ) {
            row_divs[0].style = 'display: block;';
            row_divs[1].firstElementChild.style = '';
        } else {
            row_divs[0].style = '';
            row_divs[1].firstElementChild.style = 'display: none;';
        }
    }

    // _dlgEditOnToggleOverlay( event )
    //      'click' event handler for every control of edit dialog, toggles overlay if data('overwrite') of row is true
    function _dlgEditOnToggleOverlay( e )
    {
        let row = $( e.target ).closest( '.dlg_row' );
        if( row.data('overwrite') ) {
            let overlay = row.find( '.dlgedit_overlay' );
            if( row.data( 'overlay' ) ) {
                row.data( 'overlay', false );
                overlay.css( 'display', 'none' );
            } else {
                row.data( 'overlay', true );
                overlay.css( 'display', 'block' );
            }
        }
    }

    // _dlgEditSave()
    //      'click' event handler for 'Save' button
    function _dlgEditSave()
    {
        let sel = phasors.getSelection();

        // check which attributes to save based on overlay
        let row = $( '#dlgedit_color' ).closest( '.dlg_row' );
        let saveColor = ( !row.data('overwrite') || !row.data( 'overlay' ) );
        row = $( '#dlgedit_color_ol' ).closest( '.dlg_row' );
        let saveOutlineColor = ( !row.data( 'overwrite' ) || !row.data( 'overlay' ) );
        row = $( '#dlgedit_width' ).closest( '.dlg_row' );
        let saveWidth = ( !row.data( 'overwrite' ) || !row.data( 'overlay' ) );
        row = $( '#dlgedit_ol_width' ).closest( '.dlg_row' );
        let saveOutlineWidth = ( !row.data( 'overwrite' ) || !row.data( 'overlay' ) );
        row = $( '#dlgedit_arrow' ).closest( '.dlg_row' );
        let saveArrow = ( !row.data( 'overwrite' ) || !row.data( 'overlay' ) );
        row = $( '#dlgedit_arrowsize' ).closest( '.dlg_row' );
        let saveArrowSize = ( !row.data( 'overwrite' ) || !row.data( 'overlay' ) );
        row = $( '#dlgedit_skin' ).closest( '.dlg_row' );
        let saveSkin = ( !row.data( 'overwrite' ) || !row.data( 'overlay' ) );

        let color = $( '#dlgedit_color >' ).val();
        let ol_color = $( '#dlgedit_color_ol > input' ).val();
        let width = $( '#dlgedit_width' ).prop( 'selectedIndex' ) + 1;
        let ol_width = $( '#dlgedit_ol_width' ).prop( 'selectedIndex' );
        let arrow = $( '#dlgedit_arrow' ).prop( 'selectedIndex' );
        let arrow_size = Number( $( '#dlgedit_arrowsize' ).val() );
        let skin = $( '#dlgedit_skin' ).prop( 'selectedIndex' );

        for( let i = 0; i < sel.length; i++ ) {
            if( saveColor ) {
                phasors.set( sel[i], phasors.en.color, color );
            }
            if( saveOutlineColor ) {
                sel[i].outline_color.set( ol_color );
            }
            if( saveWidth ) {
                sel[i].width = width;
            }
            if( saveOutlineWidth ) {
                sel[i].outline_width = ol_width;
            }
            if( saveArrow ) {
                sel[i].arrow = arrow;
            }
            if( saveArrowSize ) {
                sel[i].arrow_size = arrow_size;
            }
            if( saveSkin ) {
                if( sel[i].skin !== skin ) {
                    phasors.set( sel[i], phasors.en.skin, skin );
                }
            }
        }
        resetsvg.main = false;
        resetsvg.legend = false;
    }

    // -----------------------------------------------------------------------------------------------------------------------------

    // _dlgSettingsInit()
    //      initialize modal dialog for current settings
    function _dlgSettingsInit()
    {
        $( '#dlgs_quadrants option' ).eq( settings.quadrants ).prop( 'selected', true );
        $( '#dlgs_compass' ).prop( 'checked', settings.compass.show );
        $( '#dlgs_compass_style option' ).eq( settings.compass.style ).prop( 'selected', true );
        $( '#dlgs_compass_color > input' ).val( settings.compass.color.rgba ).trigger( 'change' );
        let el_compass_grad = $( '#dlgs_compass_grad' );
        el_compass_grad.prop( 'checked', settings.compass.gradient.enabled );
        $( '#dlgs_compass_grad_from > input' ).val( settings.compass.gradient.from.rgba ).trigger( 'change' );
        $( '#dlgs_compass_grad_to > input' ).val( settings.compass.gradient.to.rgba ).trigger( 'change' );
        $( '#dlgs_grid' ).prop( 'checked', settings.grid.show );
        $( '#dlgs_grid_style option' ).eq( settings.grid.style ).prop( 'selected', true );
        $( '#dlgs_grid_color > input' ).val( settings.grid.color.rgba ).trigger( 'change' );
        $( '#dlgs_axis' ).prop( 'checked', settings.axis.show );
        $( '#dlgs_axis_style option' ).eq( settings.axis.style ).prop( 'selected', true );
        $( '#dlgs_axis_color > input' ).val( settings.axis.color.rgba ).trigger( 'change' );
        $( '#dlgs_axis_ticks' ).prop( 'checked', settings.axis.ticks );
        $( '#dlgs_labels_xp' ).prop( 'checked', settings.labels.xp );
        $( '#dlgs_labels_xn' ).prop( 'checked', settings.labels.xn );
        $( '#dlgs_labels_yp' ).prop( 'checked', settings.labels.yp );
        $( '#dlgs_labels_yn' ).prop( 'checked', settings.labels.yn );
        $( '#dlgs_labels_angles' ).prop( 'checked', settings.labels.angles );
        $( '#dlgs_labels_color > input' ).val( settings.labels.color.rgba ).trigger( 'change' );
        $( '#dlgs_labels_textsize' ).val( settings.labels.textsize );
        let el_legend = $( '#dlgs_legend' );
        el_legend.prop( 'checked', settings.legend.show );
        $( '#dlgs_legend_c_text > input' ).val( settings.legend.colors.text.rgba ).trigger( 'change' );
        $( '#dlgs_legend_c_border > input' ).val( settings.legend.colors.text.rgba ).trigger( 'change' );
        $( '#dlgs_legend_c_bg > input' ).val( settings.legend.colors.bg.rgba ).trigger( 'change' );
        let el_cu = $( '#dlgs_custom_units' );
        el_cu.prop( 'checked', settings.custom_units.use );
        $( '#dlgs_cu_major' ).val( settings.custom_units.major );
        $( '#dlgs_cu_minor' ).val( settings.custom_units.minor );
        $("#dlgs_compass_color").colorpicker( settings.compass.show ? 'enable' : 'disable' );
        $("#dlgs_compass_style").prop( 'disabled', !settings.compass.show );
        $("#dlgs_axis_color").colorpicker( settings.axis.show ? 'enable' : 'disable' );
        $("#dlgs_axis_style").prop( 'disabled', !settings.axis.show );
        $("#dlgs_axis_ticks").prop( 'disabled', !settings.axis.show );
        $("#dlgs_grid_color").colorpicker( settings.grid.show ? 'enable' : 'disable' );
        $("#dlgs_grid_style").prop( 'disabled', !settings.grid.show );
        $("#dlgs_legend_c_text").colorpicker( settings.legend.show ? 'enable' : 'disable' );
        $("#dlgs_legend_c_border").colorpicker( settings.legend.show ? 'enable' : 'disable' );
        $("#dlgs_legend_c_bg").colorpicker( settings.legend.show ? 'enable' : 'disable' );
        let nrow = el_legend[0].parentElement.parentElement.parentElement.nextElementSibling;
        let nnrow = nrow.nextElementSibling;
        $(nrow).toggleClass( 'disabled', !settings.legend.show );
        $(nnrow).toggleClass( 'disabled', !settings.legend.show );
        $("#dlgs_compass_grad_from").colorpicker( settings.compass.gradient.enabled ? 'enable' : 'disable' );
        $("#dlgs_compass_grad_to").colorpicker( settings.compass.gradient.enabled ? 'enable' : 'disable' );
        $(el_compass_grad[0].parentElement.parentElement.parentElement.nextElementSibling).toggleClass( 'disabled', !settings.compass.gradient.enabled );
        $("#dlgs_cu_major").prop( 'disabled', !settings.custom_units.use );
        $("#dlgs_cu_minor").prop( 'disabled', !settings.custom_units.use );
        $(el_cu[0].parentElement.parentElement.parentElement.nextElementSibling).toggleClass( 'disabled', !settings.custom_units.use );
    }

    function _dlgSettingsCBClick( e )
    {
        let v = !$(e.target).prop( 'checked' );
        let v_s = v ? 'disable' : 'enable';
        switch( e.target.id )
        {
            case 'dlgs_compass':
            {
                $("#dlgs_compass_color").colorpicker( v_s );
                $("#dlgs_compass_style").prop( 'disabled', v );
                break;
            }
            case 'dlgs_axis':
            {
                $("#dlgs_axis_color").colorpicker( v_s );
                $("#dlgs_axis_style").prop( 'disabled', v );
                $("#dlgs_axis_ticks").prop( 'disabled', v );
                break;
            }
            case 'dlgs_grid':
            {
                $("#dlgs_grid_color").colorpicker( v_s );
                $("#dlgs_grid_style").prop( 'disabled', v );
                break;
            }
            case 'dlgs_legend':
            {
                $("#dlgs_legend_c_text").colorpicker( v_s );
                $("#dlgs_legend_c_border").colorpicker( v_s );
                $("#dlgs_legend_c_bg").colorpicker( v_s );
                let nrow = e.target.parentElement.parentElement.parentElement.nextElementSibling;
                let nnrow = nrow.nextElementSibling;
                $(nrow).toggleClass( 'disabled', v );
                $(nnrow).toggleClass( 'disabled', v );
                break;
            }
            case 'dlgs_compass_grad':
            {
                $("#dlgs_compass_grad_from").colorpicker( v_s );
                $("#dlgs_compass_grad_to").colorpicker( v_s );
                $(e.target.parentElement.parentElement.parentElement.nextElementSibling).toggleClass( 'disabled', v );
                break;
            }
            case 'dlgs_custom_units':
            {
                $("#dlgs_cu_major").prop( 'disabled', v );
                $("#dlgs_cu_minor").prop( 'disabled', v );
                $(e.target.parentElement.parentElement.parentElement.nextElementSibling).toggleClass( 'disabled', v );
                break;
            }
        }
    }

    // _dlgSettingsValidate( save )
    //      validates custom major and minor units, saves values if save == true
    function _dlgSettingsValidate( save = false )
    {
        let major_el = $( '#dlgs_cu_major' );
        let major = major_el.val();
        let major_valid = true;
        let minor_el = $( '#dlgs_cu_minor' );
        let minor = minor_el.val();
        let minor_valid = true;
        let max_length = phasors.getMaxLength();

        try {
            if( major === '' ) {
                throw new Error();
            }
            major = Number( major );
            if( isNaN(major) || major >= max_length * 2 || major <= 0 || max_length / major > 15 ) {
                throw new Error();
            }
        } catch (e) {
            major_valid = false;
            major_el.addClass( 'invalid_input' );
        }
        try {
            if( !major_valid || minor === '' ) {
                throw new Error();
            }
            minor = Number( minor );
            if( isNaN(minor) || minor <= 0 || minor >= major || major / minor > 15 ) {
                throw new Error();
            }
        } catch (e) {
            minor_valid = false;
            minor_el.addClass( 'invalid_input' );
        }
        if( major_valid && minor_valid ) {
            minor_el.removeClass( 'invalid_input' );
            major_el.removeClass( 'invalid_input' );
            if( save ) {
                settings.custom_units.major = major;
                settings.custom_units.minor = minor;
            }
            return true;
        } else {
            return false;
        }
    }

    // _dlgSettingsSave()
    //      validate and save settings
    function _dlgSettingsSave()
    {
        let use_custom_units = $( '#dlgs_custom_units' ).prop('checked');
        if( use_custom_units && !_dlgSettingsValidate( true ) ) {
            return false;
        }
        settings.custom_units.use = use_custom_units;
        let new_quadrants = $( '#dlgs_quadrants' ).prop( 'selectedIndex' );
        resetsvg.main = (settings.quadrants != new_quadrants);
        settings.quadrants = new_quadrants;
        settings.compass.show = $( '#dlgs_compass' ).prop( 'checked' );
        settings.compass.style = $( '#dlgs_compass_style' ).prop( 'selectedIndex' );
        settings.compass.color.set( $( '#dlgs_compass_color > input' ).val() );
        settings.compass.gradient.enabled = $( '#dlgs_compass_grad' ).prop( 'checked' );
        settings.compass.gradient.from.set( $( '#dlgs_compass_grad_from > input' ).val() );
        settings.compass.gradient.to.set( $( '#dlgs_compass_grad_to > input' ).val() );
        settings.grid.show = $( '#dlgs_grid' ).prop( 'checked' );
        settings.grid.style = $( '#dlgs_grid_style' ).prop( 'selectedIndex' );
        settings.grid.color.set( $( '#dlgs_grid_color > input' ).val() );
        settings.axis.show = $( '#dlgs_axis' ).prop( 'checked' );
        settings.axis.style = $( '#dlgs_axis_style' ).prop( 'selectedIndex' );
        settings.axis.color.set( $( '#dlgs_axis_color > input' ).val() );
        settings.axis.ticks = $( '#dlgs_axis_ticks' ).prop( 'checked' );
        settings.labels.xp = $( '#dlgs_labels_xp' ).prop( 'checked' );
        settings.labels.xn = $( '#dlgs_labels_xn' ).prop( 'checked' );
        settings.labels.yp = $( '#dlgs_labels_yp' ).prop( 'checked' );
        settings.labels.yn = $( '#dlgs_labels_yn' ).prop( 'checked' );
        settings.labels.angles = $( '#dlgs_labels_angles' ).prop( 'checked' );
        settings.labels.color.set( $( '#dlgs_labels_color > input' ).val() );
        settings.labels.textsize = Number( $( '#dlgs_labels_textsize' ).val() );
        settings.legend.show = $( '#dlgs_legend' ).prop( 'checked' );
        settings.legend.colors.border.set( $( '#dlgs_legend_c_border > input' ).val() );
        settings.legend.colors.bg.set( $( '#dlgs_legend_c_bg > input' ).val() );
        settings.legend.colors.text.set( $( '#dlgs_legend_c_text > input' ).val() );
        resetsvg.legend = true;
        return true;
    }

    // -----------------------------------------------------------------------------------------------------------------------------

    // _dlgDelInit()
    //      initialize delete dialog
    function _dlgDelInit()
    {
        if( phasors.isSelectionEmpty() ) {
            throw new Error( 'selection empty' );
        }
        let sel = phasors.getSelection();

        let txt = 'Do you really want to delete ';
        for( let i = 0; i < sel.length; i++ ) {
            if( i == 0 ) {
                txt += '"';
            } else if( i == sel.length - 1 && sel.length > 1 ) {
                txt += ' and "';
            } else {
                txt += ', "';
            }
            txt += sel[i].label + '"';
        }
        txt += '?</p>';
        $( '#dlgdel div.modal-body ').html( txt );
    }

    // -----------------------------------------------------------------------------------------------------------------------------

    // _dlgLoadInit()
    //      initialize load dialog
    function _dlgLoadInit()
    {
        $( '#dlgload_error' ).html( '' );
        document.getElementById( 'dlgload_file' ).value = '';
    }

    // _dlgLoadCallback( ret )
    //      callback function called by files.load() after failure/success
    function _dlgLoadCallback( ret )
    {
        if( ret.success ) {
            updateSVG( true, true );
            current = DlgEnum.none;
            $( '#dlgload' ).modal( 'hide' );
        } else {
            $( '#dlgload_error' ).html( ret.msg );
        }
    }

    // _dlgLoadValidate( event )
    //      handler of input[type=file] 'change' event
    function _dlgLoadValidate( e )
    {
        let filearray = e.target.files;
        let el_err = $( '#dlgload_error' );

        if( filearray.length !== 1 ) {
            el_err.html( 'Please select only one file' );
        } else if( filearray[0].size > constants.max_filesize ) {
            el_err.html( 'The selected file is too big' );
        } else if( filearray[0].name.length < 6 || filearray[0].name.substr( filearray[0].name.length - 5, 5 ) !== '.json'
                    || filearray[0].type !== 'application/json' ) {
            el_err.html( 'Please select a JSON file.' );
        } else {
            files.load( filearray[0], _dlgLoadCallback );
        }
    }

    // -----------------------------------------------------------------------------------------------------------------------------

    function _dlgUploadCopyLink()
    {
        let el_input = $( '#dlgupload_input' );
        el_input.focus();
        el_input.select();
        document.execCommand("copy");
    }

    function _dlgUploadInit()
    {
        let el = $( '#dlgupload' );
        let el_btn = el.find( '#dlgupload_btn' );
        let el_input = el.find( '#dlgupload_input' );

        el.find( '.modal-title' ).html( 'Upload' );
        el_btn.toggleClass( 'hidden', true );
        el_input.toggleClass( 'dlgupload_error', false ).val( 'please wait...' );
    }

    function _dlgUploadAction()
    {
        let el = $( '#dlgupload' );
        let el_input = el.find( '#dlgupload_input' );
        let el_btn = el.find( '#dlgupload_btn' );
        let el_title = el.find( '.modal-title' );

        var data = '{ "settings" : ' + JSON.stringify(settings) + ', "phasors" : ' + phasors.stringify() + '}';
        var device, version, language;
        if( constants.appmode ) {
            device = APP.getDeviceString();
            version = APP.getVersion();
            language = APP.getLanguage();
            console.log(device, version, language);
        } else {
            device = help.getBrowserString();
            version = constants.version;
            language = window.navigator.language || '?';
        }
        $.ajax({
            url: constants.ajax_url,
            method: "POST",
            data: { 'action' : 'post', 'device' : device, 'language' : language, 'version' : version, 'data' : data },
            dataType: "html",
            timeout: 2000
        }).done( msg => {
            try {
                let o = JSON.parse(msg);
                if( o.success ) {
                    let url = constants.baseurl + '/c/' + o.code;
                    el_title.html( 'Upload successful!' );
                    el_btn.toggleClass( 'hidden', false );
                    el_input.val( url );
                    el_input[0].setSelectionRange( 0, url.length );
                    el_input.focus();
                } else {
                    el_input.toggleClass( 'dlgupload_error', true ).val( o.msg );
                }
            } catch(exc) {
                el_input.toggleClass( 'dlgupload_error', true ).val( 'an error occured' );
            }
        }).fail(() => {
            el_input.toggleClass( 'dlgupload_error', true ).val( 'upload failed' );
        });
    }

    // -----------------------------------------------------------------------------------------------------------------------------

    function _dlgSaveInit( opt )
    {
        $( '#dlgsave_name' ).val( constants.files.default_name );
        switch( opt )
        {
            case 'png':
                $( '#dlgsave' ).data( 'filetype', 'png' );
                $( '#dlgsave_title' ).html( 'Save As PNG' );
                $( '#dlgsave_row_size' ).css( 'display', '' );
                $( '#dlgsave_row_color' ).css( 'display', '' );
                $( '#dlgsave_width' ).val( constants.files.png.width.default ).data( 'min', constants.files.png.width.min ).data( 'max', constants.files.png.width.max );
                $( '#dlgsave_height' ).val( constants.files.png.height.default ).data( 'min', constants.files.png.height.min ).data( 'max', constants.files.png.height.max );
                $( '#dlgsave_color > input' ).val( constants.files.png.background_color ).trigger( 'change' );
                break;
            case 'svg':
                $( '#dlgsave' ).data( 'filetype', 'svg' );
                $( '#dlgsave_title' ).html( 'Save As SVG' );
                $( '#dlgsave_row_size' ).css( 'display', '' );
                $( '#dlgsave_row_color' ).css( 'display', 'none' );
                $( '#dlgsave_width' ).val( constants.files.svg.width.default ).data( 'min', constants.files.svg.width.min ).data( 'max', constants.files.svg.width.max );
                $( '#dlgsave_height' ).val( constants.files.svg.height.default ).data( 'min', constants.files.svg.height.min ).data( 'max', constants.files.svg.height.max );
                break;
            case 'json':
                $( '#dlgsave' ).data( 'filetype', 'json' );
                $( '#dlgsave_title').html( 'Save As JSON' );
                $( '#dlgsave_row_size' ).css( 'display', 'none' );
                $( '#dlgsave_row_color' ).css( 'display', 'none' );
                break;
            default:
                throw new Error( 'invalid filetype' );
        }
    }

    // _dlgSaveAction()
    //      save file
    function _dlgSaveAction()
    {
        let b = _dlgSaveValidate();
        if( !b.valid ) {
            return false;
        }
        if( b.filetype === 'png' ) {
            if( b.filename.length < 4 || b.filename.substr( b.filename.length - 4 ) !== '.png' ) {
                b.filename += '.png';
            }
            files.savePNG( b.filename, b.width, b.height, b.color )
        } else if( b.filetype === 'svg' ) {
            if( b.filename.length < 4 || b.filename.substr( b.filename.length - 4 ) !== '.svg' ) {
                b.filename += '.svg';
            }
            files.saveSVG( b.filename, b.width, b.height );
        } else {
            if( b.filename.length < 5 || b.filename.substr( b.filename.length - 5 ) !== '.json' ) {
                b.filename += '.json';
            }
            files.saveJSON( b.filename );
        }
        return true;
    }

    // _dlgSaveValidate()
    //      if not called as eventhandler returns obj with information about current dialog status
    function _dlgSaveValidate( e = null )
    {
        if( e ) {
            let el = $( e.target );
            switch( e.target.id )
            {
                case 'dlgsave_name':
                {
                    el.toggleClass( 'invalid_input', ( e.target.value.length == 0 || e.target.value.length > constants.files.max_name_length ) );
                    break;
                }
                case 'dlgsave_width': case 'dlgsave_height':
                {
                    let cur = Number( el.val() );
                    el.toggleClass( 'invalid_input', isNaN( cur ) || cur < el.data( 'min' ) || cur > el.data( 'max' ) );
                    break;
                }
            }
        } else {
            let el_name = $( '#dlgsave_name' )
            var b = {
                'filename' : el_name.val(),
                'filetype' : $( '#dlgsave' ).data( 'filetype' ),
                'valid' : true,
                'color' : $( '#dlgsave_color > input' ).val()
            };
            let valid_width = true;
            let valid_height = true;
            let valid_name = ( b.filename.length > 0 && b.filename.length <= constants.files.max_name_length );
            el_name.toggleClass( 'invalid_input', !valid_name );

            if( b.filetype === 'png' || b.filetype === 'svg' ) {
                let el_width = $( '#dlgsave_width' );
                let el_height = $( '#dlgsave_height' );
                b.width = Number( el_width.val() );
                b.height = Number( el_height.val() );
                valid_width = !( isNaN( b.width ) || b.width < el_width.data( 'min' ) || b.width > el_width.data( 'max' ) );
                valid_height = !( isNaN( b.height ) || b.height < el_height.data( 'min' ) || b.height > el_height.data( 'max' ) );
                el_width.toggleClass( 'invalid_input', !valid_width );
                el_height.toggleClass( 'invalid_input', !valid_height );
            }
            b.valid = (valid_name && valid_width && valid_height);
            return b;
        }
    }

    // -----------------------------------------------------------------------------------------------------------------------------

    // _dlgInfoScrollTop
    //      initialize dlgInfo tab scroll positions
    function _dlgInfoScrollTop()
    {
        $( '#dlginfo_t1' ).scrollTop(0);
        $( '#dlginfo_t2' ).scrollTop(0);
        $( '#dlginfo_t3' ).scrollTop(0);
    }

    // _dlgInfoOnTabClick( event )
    //      'click' event handler for tab link
    function _dlgInfoOnTabClick( e )
    {
        e.preventDefault();
        setTimeout( _dlgInfoScrollTop, 10 );
        $(this).tab('show');
    }

    // _dlgInfoInit()
    //      initialize info dialog
    function _dlgInfoInit()
    {
        // for some reason it seems to be necessary to use setTimeout for scrolling of div
        setTimeout( _dlgInfoScrollTop, 10 );
    }

    // -----------------------------------------------------------------------------------------------------------------------------

    // setup( update )
    //      sets up bootstrap dialogs. expects function pointer to updateSVG()
    function setup( update )
    {
        updateSVG = update;

        let temp_string = '';
        let dlg, dlg_buttons, i;

        // dlgDel
        dlg = $( '#dlgdel' );
        dlg.modal({
            show: false,
            keyboard: false,
            backdrop: 'static'
        });
        dlg.on( 'shown.bs.modal' , _onDlgReady );
        dlg_buttons = dlg.find( 'button' );
        dlg_buttons.eq( 0 ).on( 'click', _onDlgHide );
        dlg_buttons.eq( 1 ).on( 'click', _onDlgAction );
        dlg_buttons.eq( 2 ).on( 'click', _onDlgHide );

        // dlgLoad
        dlg = $( '#dlgload' );
        dlg.modal({
            show: false,
            keyboard: false,
            backdrop: 'static'
        });
        dlg.on( 'shown.bs.modal', _onDlgReady );
        dlg_buttons = dlg.find( 'button' );
        dlg_buttons.eq( 0 ).on( 'click', _onDlgHide );
        dlg_buttons.eq( 1 ).on( 'click', _onDlgHide );
        dlg.find( '#dlgload_file' ).on( 'change', _dlgLoadValidate );

        // dlgUpload
        dlg = $( '#dlgupload' );
        dlg.modal({
            show: false,
            keyboard: false,
            backdrop: 'static'
        });
        dlg.on( 'shown.bs.modal' , _onDlgReady );
        dlg_buttons = dlg.find( 'button' );
        dlg_buttons.eq( 0 ).on( 'click', _onDlgHide );
        dlg_buttons.eq( 1 ).on( 'click', _dlgUploadCopyLink );
        dlg_buttons.eq( 2 ).on( 'click', _onDlgHide );

        // dlgSave
        dlg = $( '#dlgsave' );
        dlg.modal({
            show: false,
            keyboard: false,
            backdrop: 'static'
        });
        $( '#dlgsave_color' ).colorpicker( { 'color' : 'rgba(255,255,255,1)' } );

        dlg.on( 'shown.bs.modal', _onDlgReady );
        dlg_buttons = dlg.find( 'button' );
        dlg_buttons.eq( 0 ).on( 'click', _onDlgHide );
        dlg_buttons.eq( 1 ).on( 'click', _onDlgAction );
        dlg_buttons.eq( 2 ).on( 'click', _onDlgHide );
        $( '#dlgsave_name' ).on( 'input', _dlgSaveValidate );
        $( '#dlgsave_width' ).on( 'input', _dlgSaveValidate );
        $( '#dlgsave_height' ).on( 'input', _dlgSaveValidate );

        // dlgEdit
        dlg = $( '#dlgedit' );
        dlg.modal({
            show: false,
            keyboard: false,
            backdrop: 'static'
        });
        $( '#dlgedit_color' ).colorpicker( { 'format' : 'rgba', 'color' : 'red' } );
        $( '#dlgedit_color_ol' ).colorpicker( { 'format' : 'rgba', 'color' : 'black' } );
        temp_string = '<option>None</option>';
        for ( i = 1; i < constants.max_outline_width; i++ ) {
            temp_string += '<option>' + i + '</option>';
        }
        $( '#dlgedit_ol_width' ).append( temp_string );
        temp_string = '';
        for ( i = 0; i < constants.arrow_types.length; i++ ) {
            temp_string += '<option>' + constants.arrow_types[i].label + '</option>';
        }
        $( '#dlgedit_arrow' ).append( temp_string );
        temp_string = '';
        for ( i = 1; i <= constants.max_phasor_width; i++ ) {
            temp_string += '<option>' + i + '</option>';
        }
        $( '#dlgedit_width' ).append( temp_string );
        temp_string = '';
        for ( i = 0; i < constants.phasor_skins.length; i++ ) {
            temp_string += '<option>' + constants.phasor_skins[i].label + '</option>';
        }
        $( '#dlgedit_skin' ).append( temp_string );
        dlg.find( 'span.oi' ).tooltip( { placement : 'top', container: 'body' } );
        $( '#dlgedit_arrowsize ').prop( 'min', constants.arrow_size.min ).prop( 'max', constants.arrow_size.max );

        dlg.on( 'shown.bs.modal', _onDlgReady );
        dlg_buttons = dlg.find( 'button' );
        dlg_buttons.eq( 0 ).on( 'click', _onDlgHide );
        dlg_buttons.eq( 1 ).on( 'click', _onDlgAction );
        dlg_buttons.eq( 2 ).on( 'click', _onDlgHide );
        dlg.find( '.dlgedit_overlay' ).on( 'click', _dlgEditOnToggleOverlay );
        dlg.find( '.dlgedit_label' ).on( 'click', _dlgEditOnToggleOverlay );

        // dlgSettings
        dlg = $( '#dlgsettings' );
        dlg.modal({
            show: false,
            keyboard: false,
            backdrop: 'static'
        });
        $( '#dlgs_grid_color' ).colorpicker( { 'color' : settings.grid.color.rgba } );
        $( '#dlgs_axis_color' ).colorpicker( { 'color' : settings.axis.color.rgba } );
        $( '#dlgs_compass_color' ).colorpicker( { 'color' : settings.compass.color.rgba } );
        $( '#dlgs_compass_grad_from' ).colorpicker( { 'color' : settings.compass.gradient.from.rgba } );
        $( '#dlgs_compass_grad_to' ).colorpicker( { 'color' : settings.compass.gradient.to.rgba } );
        $( '#dlgs_labels_color' ).colorpicker( { 'color' : settings.labels.color.rgba } );
        $( '#dlgs_legend_c_text' ).colorpicker( { 'color' : settings.legend.colors.text.rgba } );
        $( '#dlgs_legend_c_border' ).colorpicker( { 'color' : settings.legend.colors.border.rgba } );
        $( '#dlgs_legend_c_bg' ).colorpicker( { 'color' : settings.legend.colors.bg.rgba } );

        temp_string = '';
        for ( i = 0; i < constants.stroke_styles.length; i++ ) {
           temp_string += '<option>' + constants.stroke_styles[i].label + '</option>';
        }
        $( '#dlgs_compass_style' ).append( temp_string );
        $( '#dlgs_axis_style' ).append( temp_string );
        $( '#dlgs_grid_style' ).append( temp_string );
        $( '#dlgs_labels_textsize' ).prop( 'min', constants.text_size.min ).prop( 'max', constants.text_size.max );

        dlg.on( 'shown.bs.modal', _onDlgReady );
        dlg_buttons = dlg.find( 'button' );
        dlg_buttons.eq( 0 ).on( 'click', _onDlgHide );
        dlg_buttons.eq( 1 ).on( 'click', _onDlgAction );
        dlg_buttons.eq( 2 ).on( 'click', _onDlgHide );
        dlg.find( '#dlgs_cu_major' ).on( 'input', _dlgSettingsValidate );
        dlg.find( '#dlgs_cu_minor' ).on( 'input', _dlgSettingsValidate );
        dlg.find( '#dlgs_compass' ).on( 'click', _dlgSettingsCBClick );
        dlg.find( '#dlgs_axis' ).on( 'click', _dlgSettingsCBClick );
        dlg.find( '#dlgs_grid' ).on( 'click', _dlgSettingsCBClick );
        dlg.find( '#dlgs_legend' ).on( 'click', _dlgSettingsCBClick );
        dlg.find( '#dlgs_compass_grad' ).on( 'click', _dlgSettingsCBClick );
        dlg.find( '#dlgs_custom_units' ).on( 'click', _dlgSettingsCBClick );

        // dlgInfo
        dlg = $( '#dlginfo' );
        dlg.modal({
            show: false,
            backdrop: 'static'
        });
        $( '#dlginfo_tab a' ).on( 'click', _dlgInfoOnTabClick );
        dlg.on( 'shown.bs.modal', _onDlgReady );
        dlg.find( 'button' ).on( 'click', _onDlgHide );
    }

    // show( what, opt )
    //      displays dialog what (DlgEnum)
    function show( what, opt )
    {
        if( current > 0 || what < 1 || what > 7 ) {
            return;
        }
        current = what;
        try {
            switch( current )
            {
                case DlgEnum.edit:
                    _dlgEditInit();
                    $( '#dlgedit' ).modal( 'show' );
                    break;
                case DlgEnum.settings:
                    _dlgSettingsInit();
                    $( '#dlgsettings' ).modal( 'show' );
                    break;
                case DlgEnum.delete:
                    _dlgDelInit();
                    $( '#dlgdel' ).modal( 'show' );
                    break;
                case DlgEnum.load:
                    _dlgLoadInit();
                    $( '#dlgload' ).modal( 'show' );
                    break;
                case DlgEnum.save:
                    _dlgSaveInit( opt );
                    $( '#dlgsave' ).modal( 'show' );
                    break;
                case DlgEnum.info:
                    _dlgInfoInit();
                    $( '#dlginfo' ).modal( 'show' );
                    break;
                case DlgEnum.upload:
                    _dlgUploadInit( opt );
                    $( '#dlgupload' ).modal( 'show' );
                    break;
            }
        } catch (e) {
            current = DlgEnum.none;
        }
    }

    // isDialogVisible()
    //      returns true if a dialog is currently shown
    function isDialogVisible()
    {
        return (current !== DlgEnum.none);
    }

    return {
        'en' : DlgEnum,
        'setup' : setup,
        'show' : show,
        'isVisible' : isDialogVisible
    };
}());