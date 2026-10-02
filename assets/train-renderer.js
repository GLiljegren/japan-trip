/* Renders the original GLB geometry without fetching files, including on file://. */
(() => {
  function decode(encoded) {
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('Invalid train GLB');
  const jsonLength = view.getUint32(12, true);
  const model = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
  const binaryOffset = 20 + jsonLength + 8;
  function attribute(index) {
    const accessor = model.accessors[index], buffer = model.bufferViews[accessor.bufferView];
    if (accessor.componentType !== 5126 || accessor.type !== 'VEC3') throw new Error('Unsupported train geometry');
    return new Float32Array(bytes.buffer, binaryOffset + (buffer.byteOffset || 0) + (accessor.byteOffset || 0), accessor.count * 3);
  }
  const faces = [];
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  model.meshes.forEach(mesh => mesh.primitives.forEach(primitive => {
    const positions = attribute(primitive.attributes.POSITION), normals = attribute(primitive.attributes.NORMAL);
    const color = model.materials[primitive.material].pbrMetallicRoughness.baseColorFactor.slice(0, 3);
    for (let i = 0; i < positions.length; i += 9) {
      const vertices = [0, 3, 6].map(offset => Array.from(positions.subarray(i + offset, i + offset + 3)));
      vertices.forEach(([x,y]) => { xmin = Math.min(xmin,x); xmax = Math.max(xmax,x); ymin = Math.min(ymin,y); ymax = Math.max(ymax,y); });
      faces.push({ vertices, normal: Array.from(normals.subarray(i, i + 3)), color });
    }
  }));
  return {faces,centerX:(xmin+xmax)/2,centerY:(ymin+ymax)/2,width:xmax-xmin};
  }
  const models = {train:decode(window.JAPAN_TRAIN_GLB),bus:decode(window.JAPAN_BUS_GLB),flight:decode(window.JAPAN_AIRPLANE_GLB)};
  const canvas = document.getElementById('train-canvas'), ctx = canvas.getContext('2d');
  const train = document.getElementById('train-marker'), scene = document.querySelector('.scene');
  const pitch = 1.04, sinPitch = Math.sin(pitch), cosPitch = Math.cos(pitch);
  let lastAngle = -Math.PI / 2, lastSize = 0;
  function render(angle,state) {
    const {faces,centerX,centerY,width}=models[state.kind]||models.train;
    const size = train.clientWidth, padding = 48, bufferSize = size + padding*2, ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (lastSize !== bufferSize * ratio) { canvas.width = canvas.height = Math.round(bufferSize * ratio); canvas.style.width=canvas.style.height=bufferSize+'px';canvas.style.margin=-padding+'px';lastSize = bufferSize * ratio; }
    ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,bufferSize,bufferSize);ctx.translate(padding,padding);
    if(state.scale<.000001)return;
    const flying=state.kind==='flight',displayScale=state.scale*(state.kind==='bus'?.7225:flying?.9:1),altitude=flying?30*state.scale:0;
    // Canvas Y points down: the projected -X nose has direction (-cos(yaw), sin(yaw)*sinPitch).
    const yaw = Math.atan2(Math.sin(angle) / sinPitch, -Math.cos(angle)), c = Math.cos(yaw), s = Math.sin(yaw), scale = size * .80 / width;
    function rotate([x,y,z]) { return [c*x+s*z, y, -s*x+c*z]; }
    const triangles = faces.map(face => {
      const vertices = face.vertices.map(([x,y,z]) => {
        const [rx,ry,rz] = rotate([x-centerX,y-centerY,z]);
        return [size/2+rx*scale,size/2-(ry*cosPitch-rz*sinPitch)*scale,ry*sinPitch+rz*cosPitch];
      });
      let [nx,ny,nz] = rotate(face.normal);
      if (ny*sinPitch+nz*cosPitch < 0) { nx=-nx; ny=-ny; nz=-nz; }
      const lighting = .62 + .38 * Math.max(0, nx * -.28 + ny * .86 + nz * .42);
      return { vertices, depth: vertices.reduce((sum,p)=>sum+p[2],0)/3, color: 'rgb('+face.color.map(v=>Math.round(Math.min(1,v*lighting)*255)).join(',')+')' };
    }).sort((a,b)=>a.depth-b.depth);
    ctx.save();ctx.translate(size/2,size/2+9);ctx.rotate(angle);ctx.fillStyle='rgba(15,42,37,'+((flying?.10:.16)*state.scale*(1-state.jump/60))+')';ctx.beginPath();ctx.ellipse(0,0,size*.38*displayScale,size*(flying?.11:.065)*displayScale,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.translate(size/2,size/2-state.jump-altitude);ctx.scale(displayScale,displayScale);ctx.translate(-size/2,-size/2);
    triangles.forEach(face=>{ctx.beginPath();face.vertices.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=ctx.strokeStyle=face.color;ctx.lineWidth=.35;ctx.fill();ctx.stroke();});
    ctx.restore();
  }
  window.positionJapanTrain = (point, tangent, matrix,state={kind:'train',scale:1,jump:0}) => {
    if (!matrix) return;
    const bounds = scene.getBoundingClientRect(), x = matrix.a*point.x+matrix.c*point.y+matrix.e-bounds.left, y = matrix.b*point.x+matrix.d*point.y+matrix.f-bounds.top;
    train.style.left=x+'px';train.style.top=y+'px';
    const dx=matrix.a*tangent.x+matrix.c*tangent.y,dy=matrix.b*tangent.x+matrix.d*tangent.y;
    if (Math.hypot(dx,dy)>.0001) lastAngle=Math.atan2(dy,dx);
    train.dataset.vehicle=state.kind;
    train.setAttribute('aria-label',state.kind==='bus'?'Bussen följer resrutten':state.kind==='flight'?'Flygplanet följer resrutten ovanför kartan':'Ditt Shinkansen följer resrutten');
    render(lastAngle,state);
  };
})();
