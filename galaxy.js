/* -*- Mode: JavaScript; tab-width: 4 -*- */
/* galaxy --- spinning galaxies */

/* Originally done by Uli Siegmund <uli@wombat.okapi.sub.org> on Amiga
 *   for EGS in Cluster
 * Port from Cluster/EGS to C/Intuition by Harald Backert
 * Port to X11 and incorporation into xlockmore by Hubert Feyrer
 *   <hubert.feyrer@rz.uni-regensburg.de>
 * Port to JavaScript by Paul Sarando
 *
 * Permission to use, copy, modify, and distribute this software and its
 * documentation for any purpose and without fee is hereby granted,
 * provided that the above copyright notice appear in all copies and that
 * both that copyright notice and this permission notice appear in
 * supporting documentation.
 *
 * This file is provided AS IS with no warranties of any kind.  The author
 * shall have no liability with respect to the infringement of copyrights,
 * trade secrets or any patents by this file or any part thereof.  In no
 * event will the author be liable for any lost revenue or profits or
 * other special, indirect and consequential damages.
 *
 * Revision History:
 * 19-Aug-11: Paul Sarando
 *            Converted from C source to JavaScript,
 *            with some canvas and jQuery code inspired by kathack.com
 * 26-Aug-00: robert.nagtegaal@phil.uu.nl and roland@tschai.demon.nl:
 *            various improvements
 * 10-May-97: jwz@jwz.org: turned into a standalone program.
 * 18-Apr-97: Memory leak fixed by Tom Schmidt <tschmidt@micron.com>
 * 07-Apr-97: Modified by Dave Mitchell <davem@magnet.com>
 * 23-Oct-94: Modified by David Bagley <bagleyd@bigfoot.com>
 *  random star sizes
 *  colors change depending on velocity
 * 10-Oct-94: Add colors by Hubert Feyer
 * 30-Sep-94: Initial port by Hubert Feyer
 * 09-Mar-94: VMS can generate a random number 0.0 which results in a
 *            division by zero, corrected by Jouk Jansen
 *            <joukj@crys.chem.uva.nl>
 */
var DEFAULTS =
    "*delay:  20000  \n" +
    "*count:  -5     \n" +
    "*cycles:  250   \n" +
    "*ncolors:  64   \n" +
    "*fpsSolid:  true   \n";

var UNIFORM_COLORS = true;
var reshape_galaxy = 0;
var galaxy_handle_event = 0;

function NRAND( n ) {
    return Math.round( Math.random() * (n - 1) );
}

var delay = 10;
var batchcount = 2; /* Original -5. */
var cycles = 250;
var tracks = false;
var spin = true;
var simu = true; //Andres: variable simu para ejecutar o detener simulación.
var simuback = false; //Andres: variable simuback para playback.

function FLOATRAND() {
    return Math.random();
}

var MINSIZE = 1;
var MINGALAXIES = 2;
var MAX_STARS = 3000;
var MAX_IDELTAT = 50;
/* These come originally from the Cluster-version */
var DEFAULT_GALAXIES = 3;
var DEFAULT_STARS = 1000;
var DEFAULT_HITITERATIONS = 7500;
var DEFAULT_IDELTAT = 200; /* 0.02 */
var EPSILON = 0.00000001;

var sqrt_EPSILON = 0.0001;

var DELTAT = (MAX_IDELTAT * 0.0001);

var GALAXYRANGESIZE = 0.1;
var GALAXYMINSIZE = 0.15;
var QCONS = 0.00006674; 
/* Andres: original 0.001, gravitational constant 6.674x10^-11 Nm^2/kg^2 = 0.00000000006674, 
used 6.674x10^-11 x 10^6 */

var COLORBASE = 16;
/* colors per galaxy */
var NUMCOLORS = 1365;
var COLORSTEP = Math.round( 0xFFF / NUMCOLORS )


function XPoint() {
    this.x = 0;
    this.y = 0;
    this.z = 0; //Andres: agrega punto z
}

function Star() {
    this.pos = {
        x:0.0,
        y:0.0,
        z:0.0
    };
    this.vel = {
        x:0.0,
        y:0.0,
        z:0.0
    };
}

function Galaxy() {
    this.mass = 0;
    this.stars = [];
    this.oldpoints = [];
    this.newpoints = [];
    this.pos = {
        x:0.0,
        y:0.0,
        z:0.0
    };
    this.vel = {
        x:0.0,
        y:0.0,
        z:0.0
    };
    this.galcol = "#FFF";
}

var canvas_el, canvas_ctx;
var a = 20; //Parámetro para Menú de Comandos.
function Universe() {
    this.mat = new Array( new Array(3), new Array(3), new Array(3) ); /* Movement of stars(?) */
    this.scale = 0.0; /* Scale */
    this.midx = 0; /* Middle of screen, x */
    this.midy = 0; /* Middle of screen, y */
    this.midz = 0; // Andres: crea midz
    this.size = 0.0; /* */
    this.diff = []; /* array of doubles */
    this.galaxies = null; /* the Whole Universe */
    this.f_hititerations = 0; /* # iterations before restart */
    this.step = 0; /* */
    this.rot_y = 0.0; /* rotation of eye around center of universe, around y-axis*/
    this.rot_x = 0.0; /* rotation of eye around center of universe, around x-axis */
    this.rot_z = 0.0; /* rotation of eye around center of universe, around z-axis */

    this.onReady = function( parentNode ) {
        canvas_el = document.createElement( 'canvas' );
        canvas_el.width = 1366; /*Andres: Original 1024*/
        canvas_el.height = 768; /*Andres: Original 768*/
        canvas_el.style.cssText = 'background-color: black; position: absolute; z-index: 500;';
        canvas_ctx = canvas_el.getContext( '2d' );
        
        parentNode.appendChild( canvas_el );

        var drag = false; //Para los mouse listener crea: drag, dragStart, dragEnd.
        var dragStart;
        var dragEnd;
        var gp = universe; //Para manipular el movimiento (spin).

        
        canvas_el.addEventListener('mousedown',function(e){ //Listener para pointer
            dragStart = {
                x: e.screenX,
                y: e.screenY
            }
            drag = true;
        });

        canvas_el.addEventListener('mousemove',function(e){ //Listener para pointer
            if (drag) {
                dragEnd = {
                    x: e.screenX,
                    y: e.screenY
                }
            }
            gp.rot_x += (dragEnd.y - dragStart.y)/100;
            gp.rot_y += (dragEnd.x - dragStart.x)/100;
            dragStart = dragEnd;
        });

        canvas_el.addEventListener('mouseup',function(e) { //Listener para pointer
            drag = false;
        });
        
        canvas_el.addEventListener('touchstart', function(e){ //Listener para touch
            dragStart = {
                x: e.changedTouches[0].pageX,
                y: e.changedTouches[0].pageY
            }
            drag = true;
        });
        
        canvas_el.addEventListener('touchmove', function(e){ //Listener para touch
            e.preventDefault();            
                dragEnd = {
                    x: e.changedTouches[0].pageX,
                    y: e.changedTouches[0].pageY
                }            
            gp.rot_x += (dragEnd.y - dragStart.y)/100; 
            gp.rot_y += (dragEnd.x - dragStart.x)/100;
            dragStart = dragEnd;
        });

        canvas_el.addEventListener('pointerdown', function(e) {
            var r = this.getBoundingClientRect(),
                x = e.clientX - r.left,
                y = e.clientY - r.top;
            if (x >= canvas_el.width / 2 - a/10 - a && x < canvas_el.width / 2 + a/10 + a && y >= canvas_el.height / 2 + 370 - 2*a && y < canvas_el.height / 2 + 370) {
                simu = false; 
                simuback = false;
            }
        })

        canvas_el.addEventListener('pointerdown', function(e) {
            var r = this.getBoundingClientRect(),
                x = e.clientX - r.left,
                y = e.clientY - r.top;
            if (x >= canvas_el.width / 2 + 3*a && x < canvas_el.width / 2 + 5*a && y >= canvas_el.height / 2 + 370 - 2*a && y < canvas_el.height / 2 + 370) simu = true;
        })
        /*
        canvas_el.addEventListener('pointerdown', function(e) {
            var r = this.getBoundingClientRect(),
                x = e.clientX - r.left,
                y = e.clientY - r.top;
            if (x >= canvas_el.width / 2 - 5*a && x < canvas_el.width / 2 - 3*a && y >= canvas_el.height / 2 + 370 - 2*a && y < canvas_el.height / 2 + 370) simuback = true;
        })*/
        
        var num = 8.0, keys = [];

        function update() {

            if (keys[38]) { //Andres: Zoom in with ArrowUp key.
                if (num > 2.0){
                    num--;
                }
                else {num = 2.0}
            }

            if (keys[40]) { //Andres: Zoom out with ArrowDown key.
                if (num < 40.0){
                    num++;
                }
                else {num = 40.0}
            }

            if (keys[80]) { //Andres: Pause simulation with P key.
                simu = false;
            }

            if (keys[76]) { //Andres: Restart simulation with L key.
                simu = true;
            }

            if (keys[83]) { //Andres: Stop spin with S key.
                spin = false;
            }

            if (keys[87]) { //Andres: Restart spin with W key.
                spin = true;
            }
            
            updateScale();
            setTimeout(update, 10);
        }

        function updateScale() { //Andres: Actualiza escala.
            var gp = universe;
            gp.scale = (canvas_el.width + canvas_el.height) / num;
        }

        update();
        
        document.body.addEventListener('keydown', function (e) { //Andres: Listener para keydown.
            keys[e.keyCode] = true;
        });
        document.body.addEventListener('keyup', function (e) { //Andres: Listener para keyup.
            keys[e.keyCode] = false;
        });

        init_galaxy();
    }
}

var universe = new Universe();
var drawInterval = null;

function startover() {
    var gp = universe;
    var i, j; /* more tmp */
    var w1, w2; /* more tmp */
    var d, v, w, h; /* yet more tmp */

    clearInterval( drawInterval );

    gp.step = 0;
    gp.rot_y = 0;
    gp.rot_x = 0;
    gp.rot_z = 0; /* Andres: agregando rotacion z. */

    var ngalaxies = batchcount;
    if( ngalaxies < -MINGALAXIES ) {
        ngalaxies = NRAND( -ngalaxies - MINGALAXIES + 1 ) + MINGALAXIES;
    } else if( ngalaxies < MINGALAXIES ) {
        ngalaxies = MINGALAXIES;
    }

    gp.galaxies = [];
    for( i = 0; i < ngalaxies; ++i ) {
        gp.galaxies[i] = new Galaxy();
    }

    for( i = 0; i < ngalaxies; ++i ) {
        var gt = gp.galaxies[i];
        var sinw1, sinw2, cosw1, cosw2;

        var r = Math.round( NRAND( COLORBASE ) / COLORSTEP ) * COLORSTEP;
        var g = Math.round( NRAND( COLORBASE ) / COLORSTEP ) * COLORSTEP;
        var b = Math.round( NRAND( COLORBASE ) / COLORSTEP ) * COLORSTEP;
        if( r + g + b == 0 ) {
            // Galaxies should not have black stars.
            r = COLORSTEP;
            g = COLORSTEP;
            b = COLORSTEP;
        }

        //if((r == 255 & g == 0 & b == 0) && (r == 0 & g == 0 & b == 255)){
        gt.galcol = "#" + r.toString(16) + g.toString(16) + b.toString(16);
        //}

        var nstars = (NRAND( MAX_STARS / 2 )) + MAX_STARS / 2;
        gt.stars = [];
        gt.oldpoints = [];
        gt.newpoints = [];

        for( j = 0; j < nstars; j++ ) {
            gt.stars[j] = new Star();
            gt.oldpoints[j] = new XPoint();
            gt.newpoints[j] = new XPoint();
        }

        w1 = 2.0 * Math.PI * FLOATRAND();
        w2 = 2.0 * Math.PI * FLOATRAND();
        sinw1 = Math.sin( w1 );
        sinw2 = Math.sin( w2 );
        cosw1 = Math.cos( w1 );
        cosw2 = Math.cos( w2 );

        gp.mat[0][0] = cosw2;
        gp.mat[0][1] = -sinw1 * sinw2;
        gp.mat[0][2] = cosw1 * sinw2;
        gp.mat[1][0] = 0.0;
        gp.mat[1][1] = cosw1;
        gp.mat[1][2] = sinw1;
        gp.mat[2][0] = -sinw2;
        gp.mat[2][1] = -sinw1 * cosw2;
        gp.mat[2][2] = cosw1 * cosw2;

        gt.vel.x = FLOATRAND() * 2.0 - 1.0;
        gt.vel.y = FLOATRAND() * 2.0 - 1.0;
        gt.vel.z = FLOATRAND() * 2.0 - 1.0;
        gt.pos.x = -gt.vel.x * DELTAT * gp.f_hititerations + FLOATRAND() - 0.5;
        gt.pos.y = -gt.vel.y * DELTAT * gp.f_hititerations + FLOATRAND() - 0.5;
        gt.pos.z = -gt.vel.z * DELTAT * gp.f_hititerations + FLOATRAND() - 0.5;

        gt.mass = (FLOATRAND() * 1000.0) + 1;

        gp.size = GALAXYRANGESIZE * FLOATRAND() + GALAXYMINSIZE;

        for( j = 0; j < nstars; ++j ) {
            var st = gt.stars[j];
            var oldp = gt.oldpoints[j];
            var newp = gt.newpoints[j];

            var sinw, cosw;

            w = 2.0 * Math.PI * FLOATRAND();
            sinw = Math.sin( w );
            cosw = Math.cos( w );
            d = FLOATRAND() * gp.size;
            h = FLOATRAND() * Math.exp( -2.0 * (d / gp.size) ) / 5.0 * gp.size;
            if( FLOATRAND() < 0.5 ) {
                h = -h;
            }

            st.pos.x = gp.mat[0][0] * d * cosw + gp.mat[1][0] * d * sinw +
                gp.mat[2][0] * h + gt.pos.x;
            st.pos.y = gp.mat[0][1] * d * cosw + gp.mat[1][1] * d * sinw +
                gp.mat[2][1] * h + gt.pos.y;
            st.pos.z = gp.mat[0][2] * d * cosw + gp.mat[1][2] * d * sinw +
                gp.mat[2][2] * h + gt.pos.z;

            v = Math.sqrt( gt.mass * QCONS / Math.sqrt( d * d + h * h ) );
            st.vel.x = -gp.mat[0][0] * v * sinw + gp.mat[1][0] * v * cosw +
                gt.vel.x;
            st.vel.y = -gp.mat[0][1] * v * sinw + gp.mat[1][1] * v * cosw +
                gt.vel.y;
            st.vel.z = -gp.mat[0][2] * v * sinw + gp.mat[1][2] * v * cosw +
                gt.vel.z;

            st.vel.x *= DELTAT;
            st.vel.y *= DELTAT;
            st.vel.z *= DELTAT;

            oldp.x = 0;
            oldp.y = 0;
            newp.x = 0;
            newp.y = 0;
        }
    }

    canvas_ctx.clearRect( 0, 0, canvas_el.width, canvas_el.height );

    if( 0 ) {
        console.log( "ngalaxies=%d, f_hititerations=%d\n", ngalaxies, gp.f_hititerations );
        console.log( "f_deltat=%g\n", DELTAT );
        console.log( "Screen: " );
    }

    drawInterval = setInterval( draw_galaxy, delay );
}

function init_galaxy() {
    var gp = universe;
    var num = 8.0;

    gp.f_hititerations = cycles;

    gp.scale = (canvas_el.width + canvas_el.height) / num; //Andres: Original 8.0
    gp.midx =  canvas_el.width  / 2;
    gp.midy =  canvas_el.height / 2;
    gp.midz =  canvas_el.deep / 2; //Andres: crea gp.midz
    startover();
}

function draw_galaxy() {
    var gp = universe;
    var d, eps, cox, six, cor, sir, coz, siz;  /* tmp */
    var i, j, k; /* more tmp */
    var dummy = null;

    if( !tracks ) {
        canvas_ctx.clearRect( 0, 0, canvas_el.width, canvas_el.height );
    }

    if( spin ) {
        gp.rot_y += 0.02;
        gp.rot_x += 0.00;
        gp.rot_z += 0.00; /* Andres: agregando rotacion z. */
    }

    cox = Math.cos( gp.rot_y );
    six = Math.sin( gp.rot_y );
    cor = Math.cos( gp.rot_x );
    sir = Math.sin( gp.rot_x );
    coz = Math.cos( gp.rot_z ); //
    siz = Math.sin( gp.rot_z ); //


    eps = 1/(EPSILON * sqrt_EPSILON * DELTAT * DELTAT * QCONS);

    for( i = 0; i < gp.galaxies.length; ++i ) {
        var gt = gp.galaxies[i];

        for( j = 0; j < gt.stars.length; ++j ) {
            var st = gt.stars[j];
            var newp = gt.newpoints[j];
            var v0 = st.vel.x;
            var v1 = st.vel.y;
            var v2 = st.vel.z;

            for( k = 0; k < gp.galaxies.length; ++k ) {
                var gtk = gp.galaxies[k];
                var d0 = gtk.pos.x - st.pos.x;
                var d1 = gtk.pos.y - st.pos.y;
                var d2 = gtk.pos.z - st.pos.z;

                d = d0 * d0 + d1 * d1 + d2 * d2;
                if( d > EPSILON ) {
                    d = gtk.mass / (d * Math.sqrt( d )) * DELTAT * DELTAT * QCONS;
                } else {
                    d = gtk.mass / (eps * Math.sqrt( eps ));
                }

                v0 += d0 * d;
                v1 += d1 * d;
                v2 += d2 * d;
            }
            
            if (simu){ /*Andres: si simu es TRUE actualiza velocidades y posiciones.*/
            st.vel.x = v0;
            st.vel.y = v1;
            st.vel.z = v2;

            st.pos.x += v0;
            st.pos.y += v1;
            st.pos.z += v2;
            } 

            newp.x = (((cox * st.pos.x) - (six * st.pos.z)) * gp.scale) + gp.midx;
            newp.y = (((cor * st.pos.y) - (sir * ((six * st.pos.x) + (cox * st.pos.z)))) * gp.scale) + gp.midy;
            newp.z = (((cor * st.pos.y) - (sir * ((six * st.pos.x) + (cox * st.pos.z)))) * gp.scale) + gp.midz; /* Andres: testing... */
        } 

        for( k = i + 1; k < gp.galaxies.length; ++k ) {
            gtk = gp.galaxies[k];
            d0 = gtk.pos.x - gt.pos.x;
            d1 = gtk.pos.y - gt.pos.y;
            d2 = gtk.pos.z - gt.pos.z;

            d = d0 * d0 + d1 * d1 + d2 * d2;
            if( d > EPSILON ) {
                d = 1 / (d * Math.sqrt( d )) * DELTAT * QCONS;
            } else {
                d = 1 / (EPSILON * sqrt_EPSILON) * DELTAT * QCONS;
            }

            d0 *= d;
            d1 *= d;
            d2 *= d;
            gt.vel.x += d0 * gtk.mass;
            gt.vel.y += d1 * gtk.mass;
            gt.vel.z += d2 * gtk.mass;
            gtk.vel.x -= d0 * gt.mass;
            gtk.vel.y -= d1 * gt.mass;
            gtk.vel.z -= d2 * gt.mass;
        }

        if (simu){ /*Andres: si simu es TRUE dibuja los puntos y actualiza variables.*/
            gt.pos.x += gt.vel.x * DELTAT;
            gt.pos.y += gt.vel.y * DELTAT;
            gt.pos.z += gt.vel.z * DELTAT;

            XDrawPoints( gt );

            dummy = gt.oldpoints;
            gt.oldpoints = gt.newpoints;
            gt.newpoints = dummy;
            } else {
            XDrawPoints( gt ); /*Andres: si simu FALSE, dibuja los puntos, pero no actualiza variables.*/
        }
        /*
        if (simuback){ //Andres: si back es TRUE dibuja los puntos y actualiza variables.
            gt.pos.x -= gt.vel.x * DELTAT;
            gt.pos.y -= gt.vel.y * DELTAT;
            gt.pos.z -= gt.vel.z * DELTAT;

            XDrawPoints( gt );

            dummy = gt.oldpoints;
            gt.oldpoints = gt.newpoints;
            gt.newpoints = dummy;
            } else {
            XDrawPoints( gt ); //Andres: si back FALSE, dibuja los puntos, pero no actualiza variables.
            }*/

    }

    gp.step++;
    if( gp.step > gp.f_hititerations * 4 ) {
        startover();
    }

    XMenu();
}

function XMenu(){ /* Andres: Crea Menu de Comandos. */
    var PBX = canvas_el.width / 2 - 3*a; //Comando PB Play Backward
    var PBY = canvas_el.height / 2 + 370;
    var PAX = canvas_el.width / 2; //Comando PA Pause 
    var PAY = canvas_el.height / 2 + 370;
    var PFX = canvas_el.width / 2 + 3*a; //Comando PF Play Forward 
    var PFY = canvas_el.height / 2 + 370;
    /*
    canvas_ctx.beginPath();
    canvas_ctx.moveTo(PBX, PBY);
    canvas_ctx.lineTo(PBX, PBY-2*a);
    canvas_ctx.lineTo(PBX-Math.sqrt(4*a*a-a*a), PBY-a); //sqrt(4*a*a-a*a)
    canvas_ctx.closePath();
    canvas_ctx.lineWidth = a/6;
    canvas_ctx.strokeStyle = '#FF0000';
    canvas_ctx.stroke();*/

    canvas_ctx.beginPath();
    canvas_ctx.moveTo(PFX, PFY);
    canvas_ctx.lineTo(PFX, PFY-2*a);
    canvas_ctx.lineTo(PFX+Math.sqrt(4*a*a-a*a), PFY-a); //sqrt(4*a*a-a*a)
    canvas_ctx.closePath();
    canvas_ctx.lineWidth = a/6;
    canvas_ctx.strokeStyle = '#FF0000';
    canvas_ctx.stroke();

    canvas_ctx.beginPath();
    canvas_ctx.rect(PAX-a/10, PAY, -a, -2*a);
    canvas_ctx.rect(PAX+a/10+a, PAY, -a, -2*a);
    canvas_ctx.lineWidth = a/6;
    canvas_ctx.strokeStyle = '#FF0000';
    canvas_ctx.stroke();
}

function XDrawPoints( gt ) {
    for( var i = 0; i < gt.newpoints.length; i++ ) {
        var newp = gt.newpoints[i];
        canvas_ctx.fillStyle = gt.galcol;
        canvas_ctx.fillRect( newp.x, newp.y, 1, 1 );
    }
}

function buildForm( universeDiv ) {
    var div = document.createElement('div');
    div.innerHTML =
'<h1 style="text-align:center; font-size:16pt">Galactic Collisions</h1>\
<div style="text-align:center; color:gray;">\
<label title="Delay in milliseconds (10 - 1000)">\
Animation Delay: <input id="delay" type="text" size="6" value="10" />\
</label><br />\
<label title="Duration (10 - 1000)">\
Duration: <input id="cycles" type="text" size="6" value="250" />\
</label><br />\
<label title="Max number of stars per galaxy (10 - 10000)">\
Max number of stars per galaxy: <input id="maxstars" type="text" size="6" value="3000" />\
</label><br />\
<label title="Number of colors per galaxy (1 step = 4096 colors, 15 steps = 7 colors)">\
Color step per galaxy: <input id="colorstep" type="text" size="6" value="3" />\
</label><br />\
<label title="turn on/off star tracks">\
Star tracks? <input id="tracks" type="checkbox" />\
</label><br />\
<label title="do/don\'t spin viewpoint">\
Spin view? <input id="spin" type="checkbox" checked="checked" />\
</label>\
</div>\
<div id="btnStart" style="text-align:center; font-size:16pt">Loading...</div>';

    universeDiv.appendChild( div );

    return div;
}

function refresh_galaxy() {
    var universeDiv = document.createElement('div');
    var form = buildForm( universeDiv );
    document.body.appendChild( universeDiv );

    var checkInterval = setInterval( function () {
        if ( window.jQuery ) {
            clearInterval( checkInterval );

            jQuery('#btnStart').empty();
            jQuery('<button>Start!</button>').click( function () {
                delay = parseInt( jQuery('#delay').val() );
                cycles = parseInt( jQuery('#cycles').val() );
                MAX_STARS = parseInt( jQuery('#maxstars').val() );
                COLORSTEP = parseInt( jQuery('#colorstep').val() );
                tracks = (jQuery('#tracks').attr('checked'))? true : false;
                spin = (jQuery('#spin').attr('checked'))? true : false;

                universeDiv.removeChild(form);
                universe.onReady( universeDiv );
            }).css( 'font-size', '24pt' ).appendTo( '#btnStart' );
        }
    }, 100 );
}