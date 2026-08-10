/* ============================================================
   KINEA · FIGURA 3D ANATÓMICA
   ------------------------------------------------------------
   Muñeco cel-shaded con zonas de dolor, dibujado en WebGL.

   El modelo NO se descarga: se genera aquí con primitivas
   (esferas, cilindros, toros y tubos sobre curvas), igual que
   en la escena original de three.js. Son ~25 KB de código en
   vez de 2,5 MB de malla, y sin ninguna librería externa.

   API:  Kinea3D.mount(host, canvas, opts) -> { destroy }
   ============================================================ */
(function (window, document) {
  "use strict";

  /* ============================================================
     1 · Álgebra mínima (mat4 / vec3)
     ============================================================ */
  function m4() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }

  function m4mul(a, b, out) {
    out = out || new Float32Array(16);
    for (var c = 0; c < 4; c++) {
      var b0 = b[c*4], b1 = b[c*4+1], b2 = b[c*4+2], b3 = b[c*4+3];
      out[c*4]   = a[0]*b0 + a[4]*b1 + a[8]*b2  + a[12]*b3;
      out[c*4+1] = a[1]*b0 + a[5]*b1 + a[9]*b2  + a[13]*b3;
      out[c*4+2] = a[2]*b0 + a[6]*b1 + a[10]*b2 + a[14]*b3;
      out[c*4+3] = a[3]*b0 + a[7]*b1 + a[11]*b2 + a[15]*b3;
    }
    return out;
  }

  function m4perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far), o = m4();
    o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf;
    o[11] = -1; o[14] = 2 * far * near * nf; o[15] = 0;
    return o;
  }

  function m4lookAt(eye, target, up) {
    var zx = eye[0]-target[0], zy = eye[1]-target[1], zz = eye[2]-target[2];
    var l = Math.hypot(zx, zy, zz) || 1; zx/=l; zy/=l; zz/=l;
    var xx = up[1]*zz - up[2]*zy, xy = up[2]*zx - up[0]*zz, xz = up[0]*zy - up[1]*zx;
    l = Math.hypot(xx, xy, xz) || 1; xx/=l; xy/=l; xz/=l;
    var yx = zy*xz - zz*xy, yy = zz*xx - zx*xz, yz = zx*xy - zy*xx;
    var o = m4();
    o[0]=xx; o[1]=yx; o[2]=zx; o[4]=xy; o[5]=yy; o[6]=zy; o[8]=xz; o[9]=yz; o[10]=zz;
    o[12]=-(xx*eye[0]+xy*eye[1]+xz*eye[2]);
    o[13]=-(yx*eye[0]+yy*eye[1]+yz*eye[2]);
    o[14]=-(zx*eye[0]+zy*eye[1]+zz*eye[2]);
    return o;
  }

  /* Rotación Y·X + traslación: lo único que necesita el rig de la cabeza. */
  function m4rigid(rx, ry, tx, ty, tz) {
    var cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), o = m4();
    o[0]=cy;      o[1]=0;   o[2]=-sy;
    o[4]=sy*sx;   o[5]=cx;  o[6]=cy*sx;
    o[8]=sy*cx;   o[9]=-sx; o[10]=cy*cx;
    o[12]=tx; o[13]=ty; o[14]=tz;
    return o;
  }

  function m4apply(m, x, y, z) {
    var w = m[3]*x + m[7]*y + m[11]*z + m[15];
    return [ (m[0]*x + m[4]*y + m[8]*z  + m[12]) / w,
             (m[1]*x + m[5]*y + m[9]*z  + m[13]) / w,
             (m[2]*x + m[6]*y + m[10]*z + m[14]) / w ];
  }

  var V = function (x, y, z) { return [x, y, z]; };
  var vsub = function (a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; };
  var vlen = function (a) { return Math.hypot(a[0], a[1], a[2]); };
  var vnorm = function (a) { var l = vlen(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
  var vcross = function (a, b) {
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  };
  var vlerp = function (a, b, t) {
    return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
  };
  var vadds = function (a, b, s) { return [a[0]+b[0]*s, a[1]+b[1]*s, a[2]+b[2]*s]; };

  /* ============================================================
     2 · Constructor de mallas
     Cada pieza acumula vértices en un buffer por material.
     Las transformaciones se hornean aquí: en pantalla solo queda
     una llamada de dibujo por material y rig.
     ============================================================ */
  function Mesh() { this.pos = []; this.nrm = []; this.idx = []; }

  /* Se transforma en línea, sin crear arrays por vértice: con ~90.000
     vértices, un [x,y,z] por paso serían cientos de miles de objetos y el
     recolector de basura se come el tiempo de arranque. */
  Mesh.prototype.push = function (geo, xf) {
    var base = this.pos.length / 3, i, n = geo.pos.length;
    var P = this.pos, N = this.nrm, gp = geo.pos, gn = geo.nrm;
    if (!xf) {
      for (i = 0; i < n; i++) { P.push(gp[i]); N.push(gn[i]); }
    } else {
      var R = xf.R, s = xf.s, t = xf.t;
      var sx = s[0], sy = s[1], sz = s[2];
      var r0=R[0], r1=R[1], r2=R[2], r3=R[3], r4=R[4], r5=R[5], r6=R[6], r7=R[7], r8=R[8];
      var tx=t[0], ty=t[1], tz=t[2];
      for (i = 0; i < n; i += 3) {
        var x = gp[i]*sx, y = gp[i+1]*sy, z = gp[i+2]*sz;
        P.push(r0*x + r1*y + r2*z + tx, r3*x + r4*y + r5*z + ty, r6*x + r7*y + r8*z + tz);
        // la normal usa la inversa de la escala y se renormaliza
        var a = gn[i]/sx, b = gn[i+1]/sy, c = gn[i+2]/sz;
        var nx = r0*a + r1*b + r2*c, ny = r3*a + r4*b + r5*c, nz = r6*a + r7*b + r8*c;
        var l = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
        N.push(nx/l, ny/l, nz/l);
      }
    }
    for (i = 0; i < geo.idx.length; i++) this.idx.push(geo.idx[i] + base);
  };

  /* Transformación escala → rotación (XYZ) → traslación, como en three.js.
     Guarda también la inversa-traspuesta para las normales. */
  function Xf(pos, scale, rot) {
    var s = scale || [1,1,1], r = rot || [0,0,0];
    var cx=Math.cos(r[0]), sx=Math.sin(r[0]), cy=Math.cos(r[1]), sy=Math.sin(r[1]),
        cz=Math.cos(r[2]), sz=Math.sin(r[2]);
    // R = Rx·Ry·Rz (orden por defecto de three.js: 'XYZ' aplicado como Rx*Ry*Rz)
    var R = [
      cy*cz,               -cy*sz,                sy,
      sx*sy*cz + cx*sz,    -sx*sy*sz + cx*cz,    -sx*cy,
      -cx*sy*cz + sx*sz,    cx*sy*sz + sx*cz,     cx*cy
    ];
    this.R = R; this.s = s; this.t = pos || [0,0,0];
  }
  Xf.prototype.point = function (p) {
    var x = p[0]*this.s[0], y = p[1]*this.s[1], z = p[2]*this.s[2], R = this.R;
    return [ R[0]*x + R[1]*y + R[2]*z + this.t[0],
             R[3]*x + R[4]*y + R[5]*z + this.t[1],
             R[6]*x + R[7]*y + R[8]*z + this.t[2] ];
  };
  Xf.prototype.normal = function (n) {
    // normal = R · (n / s), renormalizada
    var x = n[0]/this.s[0], y = n[1]/this.s[1], z = n[2]/this.s[2], R = this.R;
    return vnorm([ R[0]*x + R[1]*y + R[2]*z,
                   R[3]*x + R[4]*y + R[5]*z,
                   R[6]*x + R[7]*y + R[8]*z ]);
  };

  /* ---------- primitivas ---------- */

  function gSphere(r, wSeg, hSeg) {
    var pos = [], nrm = [], idx = [], x, y;
    for (y = 0; y <= hSeg; y++) {
      var v = y / hSeg, phi = v * Math.PI;
      for (x = 0; x <= wSeg; x++) {
        var u = x / wSeg, th = u * Math.PI * 2;
        var nx = -Math.cos(th) * Math.sin(phi), ny = Math.cos(phi), nz = Math.sin(th) * Math.sin(phi);
        pos.push(nx*r, ny*r, nz*r); nrm.push(nx, ny, nz);
      }
    }
    for (y = 0; y < hSeg; y++) for (x = 0; x < wSeg; x++) {
      var a = y*(wSeg+1)+x, b = a+wSeg+1;
      if (y !== 0) idx.push(a, b, a+1);
      if (y !== hSeg-1) idx.push(b, b+1, a+1);
    }
    return { pos: pos, nrm: nrm, idx: idx };
  }

  function gCylinder(rTop, rBot, h, seg) {
    var pos = [], nrm = [], idx = [], i, half = h/2;
    var slope = (rBot - rTop) / h;
    for (var ring = 0; ring <= 1; ring++) {
      var r = ring === 0 ? rTop : rBot, yy = ring === 0 ? half : -half;
      for (i = 0; i <= seg; i++) {
        var th = i/seg * Math.PI*2, s = Math.sin(th), c = Math.cos(th);
        pos.push(r*s, yy, r*c);
        nrm.push.apply(nrm, vnorm([s, slope, c]));
      }
    }
    for (i = 0; i < seg; i++) {
      var a = i, b = i + seg + 1;
      idx.push(a, b, a+1, b, b+1, a+1);
    }
    // tapas (planas): evitan que se vea el hueco si el extremo queda a la vista
    [[rTop, half, 1], [rBot, -half, -1]].forEach(function (cap) {
      if (cap[0] <= 0) return;
      var c0 = pos.length/3;
      pos.push(0, cap[1], 0); nrm.push(0, cap[2], 0);
      for (i = 0; i <= seg; i++) {
        var th = i/seg * Math.PI*2;
        pos.push(cap[0]*Math.sin(th), cap[1], cap[0]*Math.cos(th));
        nrm.push(0, cap[2], 0);
      }
      for (i = 0; i < seg; i++) {
        if (cap[2] > 0) idx.push(c0, c0+1+i, c0+2+i);
        else idx.push(c0, c0+2+i, c0+1+i);
      }
    });
    return { pos: pos, nrm: nrm, idx: idx };
  }

  function gTorus(R, r, radSeg, tubSeg, arc) {
    arc = arc == null ? Math.PI*2 : arc;
    var pos = [], nrm = [], idx = [], i, j;
    for (j = 0; j <= tubSeg; j++) {
      var u = j/tubSeg * arc, cu = Math.cos(u), su = Math.sin(u);
      for (i = 0; i <= radSeg; i++) {
        var v = i/radSeg * Math.PI*2, cv = Math.cos(v), sv = Math.sin(v);
        pos.push((R + r*cv)*cu, (R + r*cv)*su, r*sv);
        nrm.push(cv*cu, cv*su, sv);
      }
    }
    for (j = 1; j <= tubSeg; j++) for (i = 1; i <= radSeg; i++) {
      var a = (radSeg+1)*j + i, b = (radSeg+1)*(j-1) + i,
          c = (radSeg+1)*(j-1) + i-1, d = (radSeg+1)*j + i-1;
      idx.push(a, b, d, b, c, d);
    }
    return { pos: pos, nrm: nrm, idx: idx };
  }

  function gBox(w, h, d) {
    var pos = [], nrm = [], idx = [];
    var f = [
      [[1,0,0],  [ w/2, h/2,-d/2], [ w/2,-h/2,-d/2], [ w/2,-h/2, d/2], [ w/2, h/2, d/2]],
      [[-1,0,0], [-w/2, h/2, d/2], [-w/2,-h/2, d/2], [-w/2,-h/2,-d/2], [-w/2, h/2,-d/2]],
      [[0,1,0],  [-w/2, h/2,-d/2], [-w/2, h/2, d/2], [ w/2, h/2, d/2], [ w/2, h/2,-d/2]],
      [[0,-1,0], [-w/2,-h/2, d/2], [-w/2,-h/2,-d/2], [ w/2,-h/2,-d/2], [ w/2,-h/2, d/2]],
      [[0,0,1],  [-w/2, h/2, d/2], [-w/2,-h/2, d/2], [ w/2,-h/2, d/2], [ w/2, h/2, d/2]],
      [[0,0,-1], [ w/2, h/2,-d/2], [ w/2,-h/2,-d/2], [-w/2,-h/2,-d/2], [-w/2, h/2,-d/2]]
    ];
    f.forEach(function (face, k) {
      var n = face[0];
      for (var i = 1; i <= 4; i++) { pos.push.apply(pos, face[i]); nrm.push(n[0], n[1], n[2]); }
      var b = k*4; idx.push(b, b+1, b+2, b, b+2, b+3);
    });
    return { pos: pos, nrm: nrm, idx: idx };
  }

  /* Catmull-Rom centrípeta (el modo por defecto de three.js) */
  function catmullRom(points, t) {
    var n = points.length - 1, p = t * n, i = Math.min(Math.floor(p), n - 1), w = p - i;
    var p0 = points[i === 0 ? 0 : i-1], p1 = points[i], p2 = points[i+1],
        p3 = points[i+2 !== undefined && i+2 <= n ? i+2 : n];
    // los tres dt son iguales para x, y y z: se calculan una sola vez
    var dt0 = Math.pow(Math.max(1e-4, dist2(p0, p1)), 0.25);
    var dt1 = Math.pow(Math.max(1e-4, dist2(p1, p2)), 0.25);
    var dt2 = Math.pow(Math.max(1e-4, dist2(p2, p3)), 0.25);
    var out = [];
    for (var k = 0; k < 3; k++) {
      var t1 = ((p1[k]-p0[k])/dt0 - (p2[k]-p0[k])/(dt0+dt1) + (p2[k]-p1[k])/dt1) * dt1;
      var t2 = ((p2[k]-p1[k])/dt1 - (p3[k]-p1[k])/(dt1+dt2) + (p3[k]-p2[k])/dt2) * dt1;
      var c0 = p1[k], c1 = t1, c2 = -3*p1[k] + 3*p2[k] - 2*t1 - t2, c3 = 2*p1[k] - 2*p2[k] + t1 + t2;
      out.push(c0 + c1*w + c2*w*w + c3*w*w*w);
    }
    return out;
  }
  function dist2(a, b) {
    var dx=a[0]-b[0], dy=a[1]-b[1], dz=a[2]-b[2]; return dx*dx+dy*dy+dz*dz;
  }

  /* Tubo sobre curva, con marcos de transporte paralelo (estables) */
  function gTube(points, r, tubSeg, radSeg) {
    var pos = [], nrm = [], idx = [], i, j;
    var pts = [], tans = [];
    for (i = 0; i <= tubSeg; i++) {
      var t = i / tubSeg;
      pts.push(catmullRom(points, t));
      var e = 1e-3;
      tans.push(vnorm(vsub(catmullRom(points, Math.min(1, t+e)), catmullRom(points, Math.max(0, t-e)))));
    }
    // marco inicial
    var up = Math.abs(tans[0][1]) > 0.9 ? [1,0,0] : [0,1,0];
    var N = vnorm(vcross(up, tans[0])), B = vcross(tans[0], N);
    for (i = 0; i <= tubSeg; i++) {
      if (i > 0) { // transporte paralelo
        N = vnorm(vsub(N, vadds([0,0,0], tans[i], N[0]*tans[i][0] + N[1]*tans[i][1] + N[2]*tans[i][2])));
        B = vcross(tans[i], N);
      }
      for (j = 0; j <= radSeg; j++) {
        var v = j/radSeg * Math.PI*2, cv = Math.cos(v), sv = Math.sin(v);
        var nx = -(cv*N[0] + sv*B[0]), ny = -(cv*N[1] + sv*B[1]), nz = -(cv*N[2] + sv*B[2]);
        pos.push(pts[i][0] - nx*r, pts[i][1] - ny*r, pts[i][2] - nz*r);
        nrm.push(-nx, -ny, -nz);
      }
    }
    for (i = 1; i <= tubSeg; i++) for (j = 1; j <= radSeg; j++) {
      var a = (radSeg+1)*(i-1) + (j-1), b = (radSeg+1)*i + (j-1),
          c = (radSeg+1)*i + j, d = (radSeg+1)*(i-1) + j;
      idx.push(a, b, d, b, c, d);
    }
    return { pos: pos, nrm: nrm, idx: idx };
  }

  /* ============================================================
     3 · El cuerpo
     Portado de la escena original. Las medidas están en metros y
     el muñeco mira hacia +Z.
     ============================================================ */
  function buildBody(det) {
    /* det = nivel de teselado (1 = completo, 0 = ligero).
       La figura se ve a ~440 px de ancho: subir de aquí no cambia nada en
       pantalla y sí dispara el tiempo de construcción. */
    var SW = det ? 22 : 14, SH = det ? 15 : 10;   // esfera
    var CS = det ? 18 : 12;                        // cilindro
    var TR = det ? 6  : 5,  TT = det ? 18 : 12;    // toro
    var UR = det ? 5  : 4;                         // tubo

    var M = {
      piel:   new Mesh(), ropa: new Mesh(), pelo: new Mesh(),
      gafas:  new Mesh(), lente: new Mesh(), alerta: new Mesh(), tinta: new Mesh()
    };
    var head = {                        // el rig de la cabeza gira aparte
      piel: new Mesh(), pelo: new Mesh(), gafas: new Mesh(), lente: new Mesh()
    };
    // Sólidos del cuerpo, para apoyar bien los marcadores sobre la piel
    var solids = [];

    var headY = 1.655;
    var HP = [0, headY, 0];             // pivote del rig de la cabeza

    function ball(target, mat, p, r, scale, rot, noSolid) {
      target[mat].push(gSphere(r, SW, SH), new Xf(p, scale, rot));
      if (!noSolid) solids.push({ k: 's', c: p, r: r, s: scale || [1,1,1] });
    }
    function seg(mat, a, b, rTop, rBot, zScale) {
      var dir = vsub(b, a), len = vlen(dir), mid = vlerp(a, b, 0.5);
      var xf = new XfDir(mid, dir, zScale || 1);
      M[mat].push(gCylinder(rTop, rBot, len, CS), xf);
      solids.push({ k: 'c', a: a, b: b, r0: rTop, r1: rBot });
    }
    /* Transformación que alinea el eje Y del cilindro con `dir`. */
    function XfDir(pos, dir, zScale) {
      var u = vnorm(dir), y = [0,1,0];
      var axis = vcross(y, u), s = vlen(axis), c = y[0]*u[0]+y[1]*u[1]+y[2]*u[2];
      var R;
      if (s < 1e-6) {
        R = c > 0 ? [1,0,0, 0,1,0, 0,0,1] : [1,0,0, 0,-1,0, 0,0,-1];
      } else {
        axis = [axis[0]/s, axis[1]/s, axis[2]/s];
        var x=axis[0], yy=axis[1], z=axis[2], t=1-c;
        R = [ t*x*x+c,   t*x*yy-s*z, t*x*z+s*yy,
              t*x*yy+s*z, t*yy*yy+c, t*yy*z-s*x,
              t*x*z-s*yy, t*yy*z+s*x, t*z*z+c ];
      }
      this.R = R; this.s = [1, 1, zScale]; this.t = pos;
    }
    XfDir.prototype = Xf.prototype;

    /* ---------- cabeza (rig propio, coordenadas relativas al pivote) ---------- */
    var hr = function (p) { return [p[0]-HP[0], p[1]-HP[1], p[2]-HP[2]]; };
    ball(head, 'piel', hr(V(0, headY, 0)), 0.158, [1, 1.06, 0.96], null, true);
    ball(head, 'pelo', hr(V(0, headY+0.05, -0.01)), 0.16, [1, 0.8, 1], null, true);
    ball(head, 'piel', hr(V(-0.152, headY-0.01, 0)), 0.036, [0.5, 1, 0.8], null, true);
    ball(head, 'piel', hr(V( 0.152, headY-0.01, 0)), 0.036, [0.5, 1, 0.8], null, true);
    ball(head, 'piel', hr(V(0, headY-0.022, 0.148)), 0.028, [0.9, 0.9, 1.1], null, true);
    solids.push({ k: 's', c: V(0, headY, 0), r: 0.158, s: [1, 1.06, 0.96] });

    head.pelo.push(gTorus(0.05, 0.009, TR, TT, Math.PI),
      new Xf(hr(V(0, headY-0.072, 0.128)), [1,1,1], [-0.25, 0, Math.PI]));

    [-0.052, 0.052].forEach(function (x) {
      var p = hr(V(x, headY+0.004, 0.134));
      var rot = [0.06, x > 0 ? -0.2 : 0.2, x > 0 ? 0.1 : -0.1];
      head.lente.push(gSphere(0.068, det ? 28 : 18, det ? 20 : 12), new Xf(p, [1.3, 0.66, 0.3], rot));
      // el aro va 0.004 hacia delante en el eje local del cristal
      var aroXf = new Xf(p, [1.3, 0.66, 1], rot);
      aroXf.t = aroXf.point([0, 0, 0.004]);
      head.gafas.push(gTorus(0.066, 0.0085, TR, det ? 40 : 22), aroXf);
    });
    head.gafas.push(gBox(0.042, 0.016, 0.02), new Xf(hr(V(0, headY+0.006, 0.153))));
    head.gafas.push(gBox(0.235, 0.017, 0.022), new Xf(hr(V(0, headY+0.043, 0.142)), [1,1,1], [-0.1, 0, 0]));
    [-1, 1].forEach(function (s) {
      head.gafas.push(gBox(0.014, 0.02, 0.16),
        new Xf(hr(V(s*0.136, headY+0.028, 0.05)), [1,1,1], [0.06, -s*0.22, 0]));
    });

    /* ---------- tronco ---------- */
    seg('piel', V(0,1.46,0), V(0,1.56,0), 0.058, 0.072);
    ball(M, 'piel', V(0,1.415,-0.015), 0.13,  [1.25, 0.42, 0.72]);
    ball(M, 'piel', V(0,1.29,0),       0.185, [1.15, 0.92, 0.78]);
    seg('piel', V(0,1.235,0), V(0,1.0,0), 0.172, 0.15, 0.82);
    ball(M, 'ropa', V(0,0.965,0), 0.163, [1, 0.86, 0.8]);
    seg('ropa', V(0,1.02,0), V(0,0.90,0), 0.163, 0.175, 0.88);
    [-1, 1].forEach(function (s) {
      seg('ropa', V(s*0.085,0.95,0), V(s*0.108,0.70,0), 0.115, 0.108);
    });

    /* ---------- extremidades ---------- */
    var brazo = {}, pierna = {};
    [-1, 1].forEach(function (s) {
      var lado = s < 0 ? 'izq' : 'der';
      var hombro = V(s*0.228,1.375,0), codo = V(s*0.335,1.075,0.012), muneca = V(s*0.40,0.83,0.048);
      brazo[lado] = { hombro: hombro, codo: codo, muneca: muneca };
      ball(M, 'piel', hombro, 0.095, [1, 0.98, 0.95]);
      seg('piel', hombro, codo, 0.078, 0.055);
      ball(M, 'piel', codo, 0.056);
      seg('piel', codo, muneca, 0.062, 0.038);
      ball(M, 'piel', muneca, 0.038);
      ball(M, 'piel', V(s*0.423,0.752,0.058), 0.058, [0.6, 1, 0.95], [0, 0, -s*0.18]);

      var cadera = V(s*0.10,0.88,0), rodilla = V(s*0.112,0.47,0.005), tobillo = V(s*0.115,0.09,0);
      pierna[lado] = { cadera: cadera, rodilla: rodilla, tobillo: tobillo };
      seg('piel', cadera, rodilla, 0.102, 0.075);
      ball(M, 'piel', rodilla, 0.076, [1, 0.9, 1]);
      seg('piel', rodilla, tobillo, 0.079, 0.044);
      ball(M, 'piel', tobillo, 0.046);
      ball(M, 'gafas', V(s*0.115,0.046,0.058), 0.072, [0.72, 0.62, 1.55]);
    });

    /* ---------- musculatura dibujada ---------- */
    function ink(pts, r) {
      M.tinta.push(gTube(pts, r == null ? 0.0058 : r, Math.max(8, pts.length*2), UR), null);
    }
    // superficie del torso: (ángulo alrededor de Y, altura) -> punto algo separado
    function torso(theta, y, out) {
      out = out == null ? 0.008 : out;
      var rx, rz;
      if (y >= 1.235) {
        var k = Math.sqrt(Math.max(0.02, 1 - Math.pow((y-1.29)/0.170, 2)));
        rx = 0.213*k; rz = 0.144*k;
      } else {
        var t = (1.235-y)/0.235;
        rx = 0.172 - 0.022*t; rz = rx*0.82;
      }
      var sx = Math.sin(theta), cz = Math.cos(theta);
      var p = [rx*sx, y, rz*cz];
      var n = vnorm([p[0]/(rx*rx), 0, p[2]/(rz*rz)]);
      return vadds(p, n, out);
    }
    var sample = function (n, fn) {
      var a = []; for (var i = 0; i < n; i++) a.push(fn(i/(n-1))); return a;
    };

    ink(sample(8,  function (t) { return torso(0, 1.375 - 0.155*t); }));
    ink(sample(11, function (t) { return torso(-1.0 + 2.0*t, 1.383 - 0.012*Math.cos(t*Math.PI)); }));
    [-1, 1].forEach(function (s) {
      ink(sample(12, function (t) { return torso(s*(0.1 + 1.15*t), 1.222 + 0.085*t*t); }));
      ink(sample(9,  function (t) { return torso(s*(0.66 - 0.20*t), 1.205 - 0.20*t); }));
      ink(sample(10, function (t) { return torso(s*(2.42 + 0.42*t), 1.375 - 0.26*t); }));
      ink(sample(8,  function (t) { return torso(s*(0.25 + 1.05*t), 1.405 + 0.02*Math.sin(t*Math.PI)); }), 0.005);
    });
    ink(sample(9,  function (t) { return torso(0, 1.215 - 0.185*t); }));
    ink(sample(10, function (t) { return torso(Math.PI, 1.40 - 0.34*t); }), 0.005);
    [1.185, 1.128, 1.072].forEach(function (y) {
      ink(sample(9, function (t) {
        var th = -0.46 + 0.92*t;
        return torso(th, y + 0.014*Math.abs(th)/0.46);
      }), 0.005);
    });

    // superficie de un miembro: (fracción del eje, ángulo; 0 = frontal)
    function limb(a, b, r0, r1, f, phi, out) {
      out = out == null ? 0.008 : out;
      var u = vnorm(vsub(b, a));
      var right = vnorm(vcross(u, [0,0,1]));
      var front = vnorm(vcross(right, u));
      var r = r0 + (r1-r0)*f + out;
      var p = vlerp(a, b, f);
      p = vadds(p, right, r*Math.sin(phi));
      return vadds(p, front, r*Math.cos(phi));
    }
    function ring(a, b, r0, r1, f, from, to, n, rad) {
      ink(sample(n || 16, function (t) { return limb(a, b, r0, r1, f, from + (to-from)*t); }), rad || 0.0055);
    }
    [-1, 1].forEach(function (s) {
      var lado = s < 0 ? 'izq' : 'der', A = brazo[lado], P = pierna[lado];
      ring(A.hombro, A.codo, 0.088, 0.055, 0.16, -1.9*s, 1.9*s, 18);
      ink(sample(9, function (t) { return limb(A.hombro,A.codo,0.078,0.055, 0.22+0.6*t, -s*0.35); }), 0.005);
      ink(sample(9, function (t) { return limb(A.hombro,A.codo,0.078,0.055, 0.22+0.62*t, Math.PI + s*0.3); }), 0.005);
      ring(A.hombro, A.codo, 0.078, 0.055, 0.97, -1.1, 1.1, 12, 0.005);
      ink(sample(8, function (t) { return limb(A.codo,A.muneca,0.062,0.038, 0.12+0.68*t, -s*0.5); }), 0.005);

      ring(P.cadera, P.rodilla, 0.102, 0.075, 0.86, -1.15, 1.15, 14, 0.005);
      ink(sample(9, function (t) { return limb(P.cadera,P.rodilla,0.118,0.082, 0.12+0.74*t, -s*0.42); }), 0.005);
      ink(sample(9, function (t) { return limb(P.cadera,P.rodilla,0.118,0.082, 0.18+0.68*t, s*(0.55-0.2*t)); }), 0.005);
      ink(sample(9, function (t) { return limb(P.cadera,P.rodilla,0.118,0.082, 0.12+0.7*t, Math.PI); }), 0.005);
      ring(P.cadera, P.rodilla, 0.102, 0.075, 1.0, -0.85, 0.85, 12, 0.005);
      ink(sample(9, function (t) { return limb(P.rodilla,P.tobillo,0.079,0.044, 0.08+0.55*t, Math.PI - s*0.5); }), 0.005);
      ink(sample(9, function (t) { return limb(P.rodilla,P.tobillo,0.079,0.044, 0.08+0.55*t, Math.PI + s*0.5); }), 0.005);
      ink(sample(6, function (t) { return limb(P.rodilla,P.tobillo,0.079,0.044, 0.66+0.3*t, Math.PI); }), 0.005);
    });

    /* ---------- zonas de dolor ----------
       En el modelo original los discos rojos quedaban medio enterrados
       en el brazo y la rodilla, y leían como heridas. Aquí cada marca se
       empuja por su normal hasta salir de TODOS los sólidos del cuerpo,
       y se dibuja como anillo con un punto central: lee como chincheta. */
    var ZONAS = [
      { txt: 'Cervicales',  p: V(-0.06,1.47,-0.05), dir: V(-0.85,0.5,-0.35) },
      { txt: 'Hombro',      p: V(0.268,1.40,0.03),  dir: V(0.95,0.35,0.35)  },
      { txt: 'Codo',        p: V(-0.378,1.075,0.03),dir: V(-0.9,0.05,0.4)   },
      { txt: 'Muñeca',      p: V(-0.432,0.845,0.06),dir: V(-0.9,-0.1,0.4)   },
      { txt: 'Lumbares',    p: V(0,1.10,-0.16),     dir: V(-0.15,-0.55,-1)  },
      { txt: 'Cadera',      p: V(0.178,0.945,0.05), dir: V(0.95,-0.25,0.3)  },
      { txt: 'Rodilla',     p: V(-0.112,0.47,0.08), dir: V(-0.55,-0.1,0.85) },
      { txt: 'Tobillo',     p: V(0.115,0.09,0.05),  dir: V(0.85,-0.05,0.5)  }
    ];

    /* ¿Está `p` dentro de algún sólido? Devuelve cuánto hay que salir. */
    function depthInside(p) {
      var worst = 0;
      solids.forEach(function (s) {
        var d;
        if (s.k === 's') {
          // se lleva el punto al espacio de la esfera unidad: dentro si |v| < r
          var dx = (p[0]-s.c[0])/s.s[0], dy = (p[1]-s.c[1])/s.s[1], dz = (p[2]-s.c[2])/s.s[2];
          var rmin = Math.min(s.s[0], s.s[1], s.s[2]);
          d = (s.r - Math.hypot(dx, dy, dz)) * rmin;   // de vuelta a metros
        } else {
          var ab = vsub(s.b, s.a), L = vlen(ab), u = vnorm(ab);
          var ap = vsub(p, s.a);
          var t = Math.max(0, Math.min(L, ap[0]*u[0] + ap[1]*u[1] + ap[2]*u[2]));
          var axisP = vadds(s.a, u, t);
          var r = s.r0 + (s.r1 - s.r0) * (t / (L || 1));
          d = r - vlen(vsub(p, axisP));
        }
        if (d > worst) worst = d;
      });
      return worst;
    }

    /* Rotación que lleva +Z a `n` (equivale a setFromUnitVectors).
       Se define ANTES de usarse: la asignación de prototype no se eleva. */
    function quatFromZ(n) {
      var z = [0,0,1], axis = vcross(z, n), s = vlen(axis), c = n[2];
      if (s < 1e-6) return c > 0 ? [1,0,0, 0,1,0, 0,0,1] : [1,0,0, 0,-1,0, 0,0,-1];
      axis = [axis[0]/s, axis[1]/s, axis[2]/s];
      var x=axis[0], y=axis[1], zz=axis[2], t=1-c;
      return [ t*x*x+c,    t*x*y-s*zz, t*x*zz+s*y,
               t*x*y+s*zz, t*y*y+c,    t*y*zz-s*x,
               t*x*zz-s*y, t*y*zz+s*x, t*zz*zz+c ];
    }
    function XfQ(pos, R, s) { this.R = R; this.s = s || [1,1,1]; this.t = pos; }
    XfQ.prototype = Xf.prototype;

    var zonas = [];
    ZONAS.forEach(function (z) {
      var n = vnorm(z.dir), p = z.p.slice();
      // Saca la marca de la piel. El tope de 8 pasos (3,2 cm) es una red de
      // seguridad: sin él, un punto mal medido empujaría la chincheta
      // lejísimos del cuerpo.
      for (var i = 0; i < 8 && depthInside(p) > 0; i++) p = vadds(p, n, 0.004);
      var anchor = vadds(p, n, 0.004);              // roza la superficie
      var xfRot = quatFromZ(n);

      M.alerta.push(gTorus(0.030, 0.0075, TR, det ? 30 : 18), new XfQ(vadds(anchor, n, 0.004), xfRot, [1,1,1]));
      M.alerta.push(gSphere(0.0125, det ? 18 : 12, det ? 12 : 8), new XfQ(vadds(anchor, n, 0.006), xfRot, [1,1,0.6]));
      zonas.push({ txt: z.txt, p: anchor, n: n });
    });

    return { body: M, head: head, zonas: zonas, headPivot: HP };
  }

  /* ============================================================
     4 · Renderizador WebGL (cel shading + contorno de tinta)
     ============================================================ */
  var VS = [
    'attribute vec3 aPos; attribute vec3 aNrm;',
    'uniform mat4 uMVP; uniform mat4 uModel; uniform mat3 uNrmMat;',
    'uniform float uGrow;',
    'varying vec3 vN;',
    'void main(){',
    '  vec3 p = aPos + aNrm * uGrow;',
    '  vN = uNrmMat * aNrm;',
    '  gl_Position = uMVP * vec4(p, 1.0);',
    '}'
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'uniform vec3 uColor; uniform float uUnlit;',
    'varying vec3 vN;',
    'void main(){',
    '  if (uUnlit > 0.5) { gl_FragColor = vec4(uColor, 1.0); return; }',
    '  vec3 N = normalize(vN);',
    /* luz principal + relleno, como el estudio neutro de la escena original */
    '  float key  = max(dot(N, normalize(vec3(0.42, 0.74, 0.53))), 0.0);',
    '  float fill = max(dot(N, normalize(vec3(-0.7, 0.42, -0.56))), 0.0);',
    /* cel shading: cuatro escalones en vez de un degradado continuo */
    '  float l = key + 0.28 * fill;',
    '  float band = l > 0.86 ? 1.0 : (l > 0.52 ? 0.90 : (l > 0.22 ? 0.775 : 0.64));',
    '  gl_FragColor = vec4(uColor * band, 1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('shader: ' + gl.getShaderInfoLog(s));
    }
    return s;
  }

  function hex2rgb(h) {
    return [((h >> 16) & 255)/255, ((h >> 8) & 255)/255, (h & 255)/255];
  }

  var COLORS = {
    piel:   hex2rgb(0xf3c8a2),
    ropa:   hex2rgb(0x2f8f86),
    pelo:   hex2rgb(0x2b1d18),
    gafas:  hex2rgb(0x1b2029),
    lente:  hex2rgb(0x2b7d8c),
    alerta: hex2rgb(0xd2453f),
    tinta:  hex2rgb(0x6d4230)
  };
  var INK = hex2rgb(0x37241c);   // contorno

  /* ============================================================
     5 · Montaje
     ============================================================ */
  function mount(host, canvas, opts) {
    opts = opts || {};
    // Montar dos veces sobre el mismo lienzo dejaría dos bucles peleándose
    // por el mismo contexto WebGL: se retira el anterior.
    if (canvas.__kinea3d) { try { canvas.__kinea3d.destroy(); } catch (e) {} }

    var gl = null;
    try {
      // preserveDrawingBuffer deja el último fotograma legible: es lo que
      // permite capturar el lienzo (toDataURL) para pruebas y miniaturas.
      var attrs = { antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true };
      gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
    } catch (e) { gl = null; }
    if (!gl) { host.classList.add('no3d'); return null; }

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var coarse  = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var lowPower = (navigator.hardwareConcurrency || 4) <= 4 || coarse;

    var model = buildBody(lowPower ? 0 : 1);

    /* --- programa --- */
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      host.classList.add('no3d'); return null;
    }
    gl.useProgram(prog);
    var A = {
      pos: gl.getAttribLocation(prog, 'aPos'),
      nrm: gl.getAttribLocation(prog, 'aNrm')
    };
    var U = {};
    ['uMVP','uModel','uNrmMat','uGrow','uColor','uUnlit'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });

    var uintOK = !!gl.getExtension('OES_element_index_uint');

    /* --- sube una malla a la GPU --- */
    function upload(mesh) {
      if (!mesh.pos.length) return null;
      var big = mesh.pos.length / 3 > 65535;
      if (big && !uintOK) return null;
      var b = {
        pos: gl.createBuffer(), nrm: gl.createBuffer(), idx: gl.createBuffer(),
        n: mesh.idx.length, type: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT
      };
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.pos), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.nrm);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.nrm), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        big ? new Uint32Array(mesh.idx) : new Uint16Array(mesh.idx), gl.STATIC_DRAW);
      return b;
    }

    var rigs = [];   // { buffers: {mat: buf}, isHead: bool }
    function pack(meshes, isHead) {
      var out = { isHead: isHead, parts: [] };
      Object.keys(meshes).forEach(function (mat) {
        var b = upload(meshes[mat]);
        if (b) out.parts.push({ mat: mat, buf: b });
      });
      rigs.push(out);
      return out;
    }
    pack(model.body, false);
    pack(model.head, true);

    function drawBuf(b) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos);
      gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(A.pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.nrm);
      gl.vertexAttribPointer(A.nrm, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(A.nrm);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
      gl.drawElements(gl.TRIANGLES, b.n, b.type, 0);
    }

    /* --- lienzo y tamaño --- */
    var dpr = 1, W = 1, H = 1;
    function resize() {
      var r = host.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
      W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      gl.viewport(0, 0, W, H);
    }
    var ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(host); }
    else window.addEventListener('resize', resize);
    resize();

    /* --- cámara --- */
    var CENTER = [0, 0.92, 0];
    var cam = {
      yaw: 0, pitch: 0.06, dist: 3.1,
      tx: 0, ty: 0.92,            // punto al que mira
      yawT: 0, pitchT: 0.06, distT: 3.1, txT: 0, tyT: 0.92
    };
    var HOME = { yaw: 0, pitch: 0.06, dist: 3.1, tx: 0, ty: 0.92 };
    var look = { x: 0, y: 0 };    // hacia dónde mira la cabeza

    /* Intro: primer plano de la cara → cuerpo entero */
    var intro = reduced ? 1 : 0;
    var started = false;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) started = true;
        visible = e.isIntersecting;
      });
    }, { threshold: 0.05 });
    io.observe(host);
    var visible = true;
    // Red de seguridad: si el observador no llega a disparar (pestaña en
    // segundo plano al cargar, por ejemplo), la intro arranca igualmente
    // para que la figura nunca se quede congelada en el primer plano.
    setTimeout(function () { started = true; }, 1200);

    /* --- interacción --- */
    var drag = null, pinch = null;
    host.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' && pinch) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 };
      host.setPointerCapture && host.setPointerCapture(e.pointerId);
      host.classList.add('dragging');
    });
    host.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect();
      // la cabeza sigue al cursor
      look.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      look.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      cam.yawT   += dx * 0.0075;
      cam.pitchT  = Math.max(-0.5, Math.min(0.6, cam.pitchT + dy * 0.004));
      drag.x = e.clientX; drag.y = e.clientY;
      started = true;
    });
    function endDrag(e) {
      if (drag && e.pointerId === drag.id) drag = null;
      host.classList.remove('dragging');
    }
    host.addEventListener('pointerup', endDrag);
    host.addEventListener('pointercancel', endDrag);
    host.addEventListener('pointerleave', function () { look.x = look.y = 0; });

    /* Zoom hacia el cursor: al acercar, el punto bajo el ratón se queda quieto */
    host.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = host.getBoundingClientRect();
      var ux = ((e.clientX - r.left) / r.width) * 2 - 1;
      var uy = -(((e.clientY - r.top) / r.height) * 2 - 1);
      var k = Math.exp(-e.deltaY * 0.0013);
      var nd = Math.max(0.75, Math.min(4.2, cam.distT / k));
      var real = cam.distT / nd;
      // desplaza el objetivo para anclar el zoom al cursor
      var span = 2 * cam.distT * Math.tan(0.39);
      cam.txT += ux * span * 0.5 * (1 - 1/real) * 0.6;
      cam.tyT += uy * span * 0.5 * (1 - 1/real) * 0.6;
      cam.tyT = Math.max(0.15, Math.min(1.75, cam.tyT));
      cam.txT = Math.max(-0.6, Math.min(0.6, cam.txT));
      cam.distT = nd;
      started = true;
    }, { passive: false });

    host.addEventListener('dblclick', function () {
      cam.yawT = HOME.yaw; cam.pitchT = HOME.pitch; cam.distT = HOME.dist;
      cam.txT = HOME.tx; cam.tyT = HOME.ty;
    });

    /* Pellizco en móvil */
    var touches = {};
    host.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        drag = null;
        pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                           e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    host.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                           e.touches[0].clientY - e.touches[1].clientY);
        cam.distT = Math.max(0.75, Math.min(4.2, cam.distT * (pinch / d)));
        pinch = d; started = true;
      }
    }, { passive: false });
    host.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) pinch = null;
    }, { passive: true });

    /* El pie del panel explica cómo se maneja, según el dispositivo */
    var cap = host.querySelector('.hero-3d-caption');
    if (cap) {
      var dot = cap.querySelector('.dot-live');
      cap.textContent = coarse
        ? ' Arrastra para girar · Pellizca para acercar'
        : ' Arrastra para girar · Rueda para acercar';
      if (dot) cap.insertBefore(dot, cap.firstChild);
    }

    /* Teclado: accesible sin ratón */
    host.setAttribute('tabindex', '0');
    host.setAttribute('role', 'application');
    host.setAttribute('aria-label',
      'Figura anatómica interactiva. Flechas para girar y acercar, Inicio para reiniciar la vista.');
    host.addEventListener('keydown', function (e) {
      var k = e.key, step = 0.22;
      if (k === 'ArrowLeft')  { cam.yawT -= step; e.preventDefault(); }
      else if (k === 'ArrowRight') { cam.yawT += step; e.preventDefault(); }
      else if (k === 'ArrowUp')    { cam.distT = Math.max(0.75, cam.distT - 0.25); e.preventDefault(); }
      else if (k === 'ArrowDown')  { cam.distT = Math.min(4.2, cam.distT + 0.25); e.preventDefault(); }
      else if (k === 'Home' || k === 'Escape') {
        cam.yawT = HOME.yaw; cam.pitchT = HOME.pitch; cam.distT = HOME.dist;
        cam.txT = HOME.tx; cam.tyT = HOME.ty;
      } else return;
      started = true;
    });

    /* --- etiquetas de zonas de dolor (HTML: texto nítido y accesible) --- */
    var layer = document.createElement('div');
    layer.className = 'zonas-layer';
    layer.setAttribute('aria-hidden', 'true');
    host.appendChild(layer);
    var labels = model.zonas.map(function (z) {
      var el = document.createElement('span');
      el.className = 'zona-tag';
      el.textContent = z.txt;
      layer.appendChild(el);
      return el;
    });

    /* --- bucle --- */
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);

    var mvp = new Float32Array(16), vp = new Float32Array(16);
    var raf = 0, t0 = 0, lastDraw = 0;

    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (!t0) t0 = t;
      if (!visible || document.hidden) return;
      // en equipos lentos, 30 fps es suficiente para esta escena
      if (lowPower && t - lastDraw < 32) return;
      lastDraw = t;
      draw(t);
    }

    function draw(t) {
      if (!t0) t0 = t;
      if (started && intro < 1) intro = Math.min(1, intro + 0.0075);
      var e = 1 - Math.pow(1 - intro, 3);          // easing de salida

      // La intro va del primer plano de la cara al cuerpo completo
      var introDist = 0.95 + (HOME.dist - 0.95) * e;
      var introTy   = 1.60 + (HOME.ty - 1.60) * e;

      var kd = 0.10;
      cam.yaw   += (cam.yawT   - cam.yaw)   * kd;
      cam.pitch += (cam.pitchT - cam.pitch) * kd;
      cam.dist  += ((intro < 1 ? introDist : cam.distT) - cam.dist) * kd;
      cam.tx    += (cam.txT    - cam.tx)    * kd;
      cam.ty    += ((intro < 1 ? introTy : cam.tyT) - cam.ty) * kd;

      var idle = reduced ? 0 : Math.sin((t - t0) * 0.00035) * 0.12;
      var yaw = cam.yaw + (drag || started && intro >= 1 && cam.yawT !== 0 ? 0 : idle);
      if (!drag && cam.yawT === 0 && !reduced) yaw = cam.yaw + idle;

      var ex = cam.tx + Math.sin(yaw) * Math.cos(cam.pitch) * cam.dist;
      var ey = cam.ty + Math.sin(cam.pitch) * cam.dist;
      var ez = cam.tx * 0 + Math.cos(yaw) * Math.cos(cam.pitch) * cam.dist;

      // Reafirma el programa en cada fotograma: las localizaciones de
      // uniformes solo valen para el programa activo, y el contexto puede
      // haber quedado en otro (otra instancia, una extensión, DevTools).
      gl.useProgram(prog);

      var proj = m4perspective(0.78, W / H || 1, 0.05, 40);
      var view = m4lookAt([ex, ey, ez], [cam.tx, cam.ty, 0], [0, 1, 0]);
      m4mul(proj, view, vp);

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      rigs.forEach(function (rig) {
        var mdl;
        if (rig.isHead) {
          // la cabeza mira al cursor, girando sobre su propio pivote
          var ry = -look.x * 0.42 - yaw * 0.12, rx = look.y * 0.24;
          var P = model.headPivot;
          mdl = m4rigid(rx, ry, P[0], P[1], P[2]);
        } else {
          mdl = m4();
        }
        m4mul(vp, mdl, mvp);
        gl.uniformMatrix4fv(U.uMVP, false, mvp);
        gl.uniformMatrix3fv(U.uNrmMat, false, new Float32Array([
          mdl[0], mdl[1], mdl[2], mdl[4], mdl[5], mdl[6], mdl[8], mdl[9], mdl[10]
        ]));

        // 1) contorno: la misma malla inflada por su normal, solo caras traseras
        gl.cullFace(gl.FRONT);
        gl.uniform1f(U.uUnlit, 1);
        gl.uniform3fv(U.uColor, INK);
        gl.uniform1f(U.uGrow, 0.007);
        rig.parts.forEach(function (p) {
          if (p.mat === 'tinta' || p.mat === 'lente') return;  // las líneas no llevan contorno
          drawBuf(p.buf);
        });

        // 2) relleno cel-shaded
        gl.cullFace(gl.BACK);
        gl.uniform1f(U.uGrow, 0);
        rig.parts.forEach(function (p) {
          gl.uniform1f(U.uUnlit, p.mat === 'tinta' ? 1 : 0);
          gl.uniform3fv(U.uColor, COLORS[p.mat]);
          drawBuf(p.buf);
        });
      });

      /* Etiquetas. Mostrarlas todas a la vez emborrona el panel, así que
         solo se enseña una: la zona bajo el cursor. Si nadie interactúa,
         van rotando solas para que se vea que el muñeco es explorable. */
      var rect = host.getBoundingClientRect();
      var mx = (look.x * 0.5 + 0.5) * rect.width;
      var my = (look.y * 0.5 + 0.5) * rect.height;
      var hovering = look.x !== 0 || look.y !== 0;
      var tick = Math.floor((t - t0) / 2600);
      var mejor = -1, mejorD = 90, aLaVista = [];

      var vistas = model.zonas.map(function (z, i) {
        var c = m4apply(vp, z.p[0], z.p[1], z.p[2]);
        var toCam = vnorm([ex - z.p[0], ey - z.p[1], ez - z.p[2]]);
        var v = {
          px: (c[0] * 0.5 + 0.5) * rect.width,
          py: (-c[1] * 0.5 + 0.5) * rect.height,
          // de cara a la cámara = la marca se ve; si no, la tapa el cuerpo
          facing: z.n[0]*toCam[0] + z.n[1]*toCam[1] + z.n[2]*toCam[2],
          z: c[2]
        };
        v.ok = v.facing > 0.25 && v.z < 1 && intro > 0.85 &&
               v.px > 6 && v.px < rect.width - 6 && v.py > 6 && v.py < rect.height - 6;
        if (v.ok) {
          aLaVista.push(i);
          if (hovering) {
            var d = Math.hypot(v.px - mx, v.py - my);
            if (d < mejorD) { mejorD = d; mejor = i; }
          }
        }
        return v;
      });
      // Sin cursor encima, va rotando SOLO entre las zonas que se ven: si
      // ciclara por las ocho, la etiqueta desaparecería la mitad del tiempo.
      if (mejor < 0 && !hovering && aLaVista.length) {
        mejor = aLaVista[tick % aLaVista.length];
      }

      vistas.forEach(function (v, i) {
        var el = labels[i];
        el.style.transform = 'translate(-50%,-50%) translate(' +
          v.px.toFixed(1) + 'px,' + (v.py - 26).toFixed(1) + 'px)';
        el.style.opacity = i === mejor ? '1' : '0';
      });
    }
    raf = requestAnimationFrame(frame);

    var api = {
      /* Fuerza un fotograma sin esperar al bucle (p. ej. al volver de una
         pestaña en segundo plano, donde requestAnimationFrame no corre). */
      redraw: function () { resize(); draw(performance.now()); },
      destroy: function () {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        io.disconnect();
        layer.remove();
        if (canvas.__kinea3d === api) canvas.__kinea3d = null;
      }
    };
    canvas.__kinea3d = api;
    return api;
  }

  window.Kinea3D = { mount: mount };
})(window, document);
