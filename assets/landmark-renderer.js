/* Static original GLB geometry, projected once and anchored to the moving map. */
(() => {
 const definitions=[
  {city:'Tokyo',key:'tokyo-tower',label:'Tokyo Tower',offset:[0,0],placement:'above',gap:18,size:[74,116]},
  {city:'Kyoto',key:'kyoto-temple',label:'Illustrativt Kyoto-tempel',offset:[0,0],placement:'above',gap:36,size:[94,102]},
  {city:'Nara',key:'nara-deer',label:'Nara-hjort',offset:[0,0],placement:'below',gap:50,yaw:-.92,size:[84,90]},
  {city:'Kobe',key:'kobe-beef',label:'Kobe-biff',offset:[0,0],placement:'above',gap:36,size:[88,76]},
  {city:'Takamatsu',key:'sanuki-udon-cup',label:'Sanuki udon',offset:[0,0],placement:'below',gap:52,size:[90,104]}
 ];
 const layer=document.getElementById('map-landmarks'),scene=document.querySelector('.scene');
 const pitch=1.04,yaw=-.62,cp=Math.cos(pitch),sp=Math.sin(pitch);
 function decode(encoded,angle=yaw){
  const cy=Math.cos(angle),sy=Math.sin(angle),rotate=([x,y,z])=>[cy*x+sy*z,y,-sy*x+cy*z];
  const project=vertex=>{const [x,y,z]=rotate(vertex);return [x,-y*cp+z*sp,y*sp+z*cp]};
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer);
  if(view.getUint32(0,true)!==0x46546c67)throw Error('Invalid landmark GLB');
  const length=view.getUint32(12,true),model=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+length))),offset=28+length;
  function attribute(index){const a=model.accessors[index],b=model.bufferViews[a.bufferView];if(a.componentType!==5126||a.type!=='VEC3')throw Error('Unsupported landmark geometry');return new Float32Array(bytes.buffer,offset+(b.byteOffset||0)+(a.byteOffset||0),a.count*3)}
  const faces=[];let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity,ground=Infinity;
  for(const mesh of model.meshes)for(const primitive of mesh.primitives){const positions=attribute(primitive.attributes.POSITION),normals=attribute(primitive.attributes.NORMAL),color=model.materials[primitive.material].pbrMetallicRoughness.baseColorFactor.slice(0,3);
   for(let i=0;i<positions.length;i+=9){const vertices=[0,3,6].map(n=>{const v=Array.from(positions.subarray(i+n,i+n+3));ground=Math.min(ground,v[1]);const p=project(v);xmin=Math.min(xmin,p[0]);xmax=Math.max(xmax,p[0]);ymin=Math.min(ymin,p[1]);ymax=Math.max(ymax,p[1]);return p});let [nx,ny,nz]=rotate(Array.from(normals.subarray(i,i+3)));if(ny*sp+nz*cp<0){nx=-nx;ny=-ny;nz=-nz}const light=.64+.36*Math.max(0,nx*-.28+ny*.86+nz*.42);faces.push({vertices,depth:vertices.reduce((s,p)=>s+p[2],0)/3,color:'rgb('+color.map(v=>Math.round(Math.min(1,v*light)*255)).join(',')+')'})}
  }
  faces.sort((a,b)=>a.depth-b.depth);return {faces,xmin,xmax,ymin,ymax,ground:project([0,ground,0])};
 }
 const geometry=new Map(definitions.map(d=>[d.key,decode(window.JAPAN_LANDMARK_GLB[d.key],d.yaw) ]));
 function paint(marker){const {canvas,definition}=marker,g=geometry.get(definition.key),[width,height]=definition.size,ratio=Math.min(devicePixelRatio||1,2),scale=Math.min((width-14)/(g.xmax-g.xmin),(height-16)/(g.ymax-g.ymin)),center=(g.xmin+g.xmax)/2,top=6;
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);canvas.style.width=width+'px';canvas.style.height=height+'px';const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);const px=x=>width/2+(x-center)*scale,py=y=>top+(y-g.ymin)*scale;
  marker.anchor=[px(g.ground[0]),py(g.ground[1])];ctx.fillStyle='rgba(15,42,37,.12)';ctx.beginPath();ctx.ellipse(marker.anchor[0],marker.anchor[1],width*.30,5,0,0,Math.PI*2);ctx.fill();
  for(const face of g.faces){ctx.beginPath();face.vertices.forEach((p,i)=>i?ctx.lineTo(px(p[0]),py(p[1])):ctx.moveTo(px(p[0]),py(p[1])));ctx.closePath();ctx.fillStyle=ctx.strokeStyle=face.color;ctx.lineWidth=.3;ctx.fill();ctx.stroke()}
 }
 let markers=[],pixelRatio=0;
 function setStops(stops){layer.replaceChildren();markers=[];for(const definition of definitions){const stop=stops.find(s=>s.status!=='pending'&&s.coordinates&&s.city.toLowerCase()===definition.city.toLowerCase());if(!stop)continue;const [x,y]=JapanItinerary.project(stop.coordinates),node=document.createElement('div'),canvas=document.createElement('canvas');node.className='map-landmark';node.setAttribute('role','img');node.setAttribute('aria-label',definition.label+' – illustrativ symbol vid '+definition.city);node.append(canvas);layer.append(node);const marker={definition,node,canvas,x:x+definition.offset[0],y:y+definition.offset[1]};paint(marker);markers.push(marker)}pixelRatio=devicePixelRatio||1}
 function update(matrix){if(!matrix)return;const bounds=scene.getBoundingClientRect(),factor=innerWidth<700?.78:1;if(pixelRatio!==(devicePixelRatio||1)){markers.forEach(paint);pixelRatio=devicePixelRatio||1}for(const marker of markers){const x=matrix.a*marker.x+matrix.c*marker.y+matrix.e-bounds.left,y=matrix.b*marker.x+matrix.d*marker.y+matrix.f-bounds.top;marker.node.hidden=x<-150||x>bounds.width+150||y<-160||y>bounds.height+160;const [width,height]=marker.definition.size,top=marker.definition.placement==='above'?y-(height+marker.definition.gap)*factor:y+marker.definition.gap*factor;marker.node.style.transform=`translate(${x-width/2*factor}px,${top}px) scale(${factor})`}}
 window.JapanLandmarks={setStops,update};
})();
