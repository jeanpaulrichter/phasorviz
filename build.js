/* eslint-disable */

var copyfiles = require('copyfiles');
const replace = require('replace-in-file');
const fs = require('fs');
var mkdirp = require('mkdirp');
const path = require('path');
var uglifycss = require('uglifycss');
const rollup = require('rollup');
var minify = require('html-minifier').minify;

var files = {
    'web' : {
        'js' : [
            './node_modules/file-saver/dist/FileSaver.min.js',
            './node_modules/jquery/dist/jquery.min.js',
            './src/javascript/thirdparty/jquery.mousewheel.min.js',
            './src/javascript/thirdparty/jquery-ui.min.js',
            './src/javascript/thirdparty/jquery.ui.touch-punch.js',
            './node_modules/mathjs/dist/math.min.js',
            './node_modules/popper.js/dist/umd/popper.min.js',
            './node_modules/bootstrap/dist/js/bootstrap.min.js',
            './node_modules/bootstrap-colorpicker/dist/js/bootstrap-colorpicker.min.js',
            'web/js'
        ],
        'css' : [
            './node_modules/bootstrap-colorpicker/dist/css/bootstrap-colorpicker.min.css',
            './src/css/thirdparty/bootstrap.min.css',
            './src/css/thirdparty/jquery-ui.min.css',
            'web/css'
        ],
        'icon' : [
            './src/icon/android-chrome-192x192.png',
            './src/icon/android-chrome-256x256.png',
            './src/icon/apple-touch-icon.png',
            './src/icon/browserconfig.xml',
            './src/icon/favicon.ico',
            './src/icon/favicon-16x16.png',
            './src/icon/favicon-32x32.png',
            './src/icon/mstile-150x150.png',
            './src/icon/safari-pinned-tab.svg',
            './src/icon/site.webmanifest',
            'web'
        ]
    },
    'app' : {
        'js' : [
            './node_modules/jquery/dist/jquery.min.js',
            './src/javascript/thirdparty/jquery-ui.min.js',
            './src/javascript/thirdparty/jquery.ui.touch-punch.js',
            './node_modules/mathjs/dist/math.min.js',
            './node_modules/popper.js/dist/umd/popper.min.js',
            './node_modules/bootstrap/dist/js/bootstrap.min.js',
            './node_modules/bootstrap-colorpicker/dist/js/bootstrap-colorpicker.min.js',
            'android/app/src/main/assets/www/js'
        ],
        'css' : [
            './node_modules/bootstrap-colorpicker/dist/css/bootstrap-colorpicker.min.css',
            './src/css/thirdparty/bootstrap.min.css',
            './src/css/thirdparty/jquery-ui.min.css',
            'android/app/src/main/assets/www/css'
        ]
    }
}

function getName( s )
{
    return s.replace(/^.*[\\\/]/, '');
}

function saveCSSFile( uglified, p )
{
    mkdirp.sync( path.join(__dirname, p + '/css') );

    fs.writeFileSync( path.join(__dirname, p + '/css/phasorviz.css'), uglified, function(err) {
        if(err) {
            console.error( 'failed to create css file: ' + p + '/css/phasorviz.css' );
        }
    });
}

function uglifyWebHtml()
{
    try {
        console.log( 'processing web/index.html...' );
        var cssString = '';
        for( let i = 0; i < files.web.css.length - 1; i++ ) {
            cssString += '<link rel="stylesheet" href="css/' + getName( files.web.css[i] ) + '">';
        }
        cssString += '<link rel="stylesheet" href="css/phasorviz.css">';
        var jsString = '';
        for( let i = 0; i < files.web.js.length - 1; i++ ) {
            jsString += '<script src="js/' + getName( files.web.js[i] ) + '"></script>';
        }
        jsString += '<script src="js/phasorviz.min.js"></script>';

        replace.sync({
            files: 'web/index.html',
            from: /<!--@BASEURL-->/g,
            to: '<base href="https://phasorviz.cerberus-design.de/">'
        });
        replace.sync({
            files: 'web/index.html',
            from: /<!--@CSS_START-->[\s\S]*<!--@CSS_END-->/g,
            to: cssString,
        });
        replace.sync({
            files: 'web/index.html',
            from: /<!--@ICON_START-->[\s\S]*<!--@ICON_END-->/g,
            to: '<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png"><link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png"><link rel="manifest" href="site.webmanifest"><link rel="mask-icon" href="safari-pinned-tab.svg" color="#3f88c5"><meta name="msapplication-TileColor" content="#2b5797"><meta name="theme-color" content="#ffffff">',
        });
        replace.sync({
            files: 'web/index.html',
            from: /<!--@JS_START-->[\s\S]*<!--@JS_END-->/g,
            to: jsString,
        });

        var index_path = path.join( __dirname, 'web/index.html' );

        fs.readFile( index_path, 'utf8', (err, data) => {
            if(!err) {
                var minifyed_html = minify(data, {
                    removeAttributeQuotes: true,
                    collapseWhitespace: true,
                    preserveLineBreaks: false,
                    removeComments: true,
                });
                fs.writeFile( index_path, minifyed_html, function(err) {
                    if(err) {
                        console.error( 'failed to write minifyed html (web)');
                    } else {
                        console.log( 'created web/index.html');
                    }
                });
            } else {
                console.error( 'failed to read web/index.html' );
            }
        });
    } catch (error) {
        console.error( 'Failed to create web/index.html', error );
    }
}

function uglifyAppHtml()
{
    try {
        console.log( 'processing android/app/src/main/assets/www/index.html...' );
        var cssString = '';
        for( let i = 0; i < files.app.css.length - 1; i++ ) {
            cssString += '<link rel="stylesheet" href="css/' + getName( files.app.css[i] ) + '">';
        }
        cssString += '<link rel="stylesheet" href="css/phasorviz.css">';
        var jsString = '';
        for( let i = 0; i < files.app.js.length - 1; i++ ) {
            jsString += '<script src="js/' + getName( files.app.js[i] ) + '"></script>';
        }
        jsString += '<script src="js/phasorviz.min.js"></script>';

        replace.sync({
            files: 'android/app/src/main/assets/www/index.html',
            from: /<!--@BUTTONS_START-->[\s\S]*<!--@BUTTONS_END-->/g,
            to: ''
        });
        replace.sync({
            files: 'android/app/src/main/assets/www/index.html',
            from: /<!--@ICON_START-->[\s\S]*<!--@ICON_END-->/g,
            to: ''
        });
        replace.sync({
            files: 'android/app/src/main/assets/www/index.html',
            from: /<!--@CSS_START-->[\s\S]*<!--@CSS_END-->/g,
            to: cssString
        });
        replace.sync({
            files: 'android/app/src/main/assets/www/index.html',
            from: /<!--@JS_START-->[\s\S]*<!--@JS_END-->/g,
            to: jsString
        });

        var index_path = path.join( __dirname, 'android/app/src/main/assets/www/index.html' );

        fs.readFile( index_path, 'utf8', (err, data) => {
            if(!err) {
                var minifyed_html = minify(data, {
                    removeAttributeQuotes: true,
                    collapseWhitespace: true,
                    preserveLineBreaks: false,
                    removeComments: true,
                });
                fs.writeFile( index_path, minifyed_html, function(err) {
                    if(err) {
                        console.error( 'failed to write minifyed html (app)');
                    } else {
                        console.log( 'created android/app/src/main/assets/www/index.html');
                    }
                });
            } else {
                console.error( 'failed to read android/app/src/main/assets/www/index.html' );
            }
        });
    } catch (error) {
        console.error( 'Failed to create android/app/src/main/assets/www/index.html', error );
    }
}

try {
    var uglified = uglifycss.processFiles( [ 'src/css/phasorviz.css', 'src/css/phasorviz_buttons.css' ], {} );

    let target = 0;
    if( process.argv.length > 2 ) {
        if( process.argv[2] == 'app' ) {
            target = 1;
        } else if( process.argv[2] == 'web' ) {
            target = 2;
        }
    }

    if( target == 1 || target == 0 ) {
        saveCSSFile( uglified, 'android/app/src/main/assets/www' );
        copyfiles( ['src/index.html', 'android/app/src/main/assets/www'], 1, uglifyAppHtml );
        copyfiles( files.app.css, true, function() {});
        copyfiles( files.app.js, true, function() {});
    }

    if( target == 2 || target == 0 ) {
        saveCSSFile( uglified, 'web' );
        copyfiles( ['src/index.html', 'src/css/icons/*', 'web'], 1, uglifyWebHtml );
        copyfiles( files.web.css, true, function() {});
        copyfiles( files.web.js, true, function() {});
        copyfiles( files.web.icon, true, function() {});
    }
} catch (error) {
    console.error( 'Error occurred: ', error );
}