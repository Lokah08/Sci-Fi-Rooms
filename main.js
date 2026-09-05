import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createEditor} from './editor.js';

const canvas=document.querySelector('#scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color('#c99f80');scene.fog=new THREE.FogExp2('#c99f80',0.0038);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,0.08,1600);
camera.rotation.order='YXZ';
let yaw=0,pitch=0,night=0,targetNight=0;
const colliders=[];
const records=[];
let boxNumber=0,lightNumber=0;
function register(object,id,name,category,solid=false){object.name=name;records.push({object,id,name,category,solid});return object;}
const mat=(color,metalness=0,roughness=0.7)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const cream=mat('#d2c9b2',0.25),dark=mat('#253a40',0.45),floorMat=mat('#637170',0.25),wood=mat('#927051'),gold=mat('#c08b50',0.5);
const warm=new THREE.MeshStandardMaterial({color:'#ffe0a1',emissive:'#ffc376',emissiveIntensity:3});
const teal=new THREE.MeshStandardMaterial({color:'#8be6df',emissive:'#55c9d0',emissiveIntensity:2});
function box(w,h,d,x,y,z,m,solid=false){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return register(o,`box-${++boxNumber}`,`${solid?'壁・家具':'建築パーツ'} ${boxNumber}`,'structure',solid);}
function light(color,intensity,x,y,z,distance=15){const l=new THREE.PointLight(color,intensity,distance,2);l.position.set(x,y,z);scene.add(l);return register(l,`light-${++lightNumber}`,`室内照明 ${lightNumber}`,'light');}
const hemi=new THREE.HemisphereLight('#ffe3ba','#665146',2.2);scene.add(hemi);
const sun=new THREE.DirectionalLight('#ffe0ae',3.1);sun.position.set(-25,35,-35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:120});sun.shadow.normalBias=.035;scene.add(sun);
light('#ffc38a',55,-3,3.2,0);light('#ffd7a2',45,3,3.1,2);light('#8cdbec',25,4,2,-4);

// A continuous ground level keeps the open airlock accessible in both directions.
box(16,.22,13,0,-.13,0,dark);
for(let x=-7;x<8;x+=2)for(let z=-5.5;z<6;z+=2)box(1.97,.07,1.97,x,-.025,z,floorMat);
box(16,.28,13,0,4.35,0,cream);
box(16,.18,.3,0,4.13,-6.35,dark);box(16,.18,.3,0,4.13,6.35,dark);
box(.32,4.3,13,-8,2.1,0,cream,true);
box(16,4.3,.32,0,2.1,6.5,cream,true);
// Front panoramic window: low sill, lintel, slender mullions, clear view.
box(16,.65,.35,0,.3,-6.5,cream,true);box(16,.6,.35,0,4,-6.5,cream);
for(const x of [-7.85,-4,0,4,7.85]){box(.13,3.5,.18,x,2.3,-6.48,dark);box(.025,3.1,.04,x+.075,2.25,-6.36,gold);}
colliders.push({minX:-8.3,maxX:8.3,minZ:-6.78,maxZ:-6.22});
// Right-hand exit is a full-height 3 m opening.
box(.32,4.3,4.8,8,2.1,-4.1,cream,true);box(.32,4.3,5.2,8,2.1,3.9,cream,true);box(.4,.8,3,8,3.95,-.2,cream);
for(const z of [-1.7,1.3]){box(.45,3.5,.18,8,1.75,z,dark);box(.06,3.2,.065,7.74,1.65,z,teal);}
box(4,.08,3,9.6,-.015,-.2,dark);
for(let x=8.2;x<12;x+=.5)box(.025,.012,2.7,x,.03,-.2,gold);
for(const x of [-7.6,7.6])box(.045,.045,12,x,.08,0,warm);
for(const x of [-5,1,5]){box(.1,.12,10,x,4.15,0,dark);box(.065,.025,9.8,x,4.075,0,warm);}
for(let z=-5;z<6;z+=2.5)box(.14,4.1,.12,-7.78,2.1,z,dark);

// Soft seating, a low table and a warm textile island.
box(6.2,.025,4.5,-2,.028,-2,mat('#ad7253'));
for(let i=0;i<14;i++)box(5.9,.007,.016,-2,.046,-4.05+i*.31,mat(i%2?'#c6916d':'#a36d52'));
box(3.8,.32,1.15,-3.1,.24,-.5,dark,true);
box(3.8,.35,.95,-3.1,.52,-.5,mat('#d6baa0'));
box(3.8,.62,.23,-3.1,.85,.01,mat('#d6baa0'));
for(const x of [-4.9,-1.3])box(.22,.5,1.2,x,.65,-.5,mat('#b99578'));
for(const x of [-4.1,-2.5]){const p=box(.55,.48,.19,x,.91,-.2,mat(x<-3?'#687c71':'#c77d52'));p.rotation.z=.12;}
// Rear sleeping alcove and galley.
box(3.5,.12,3.5,-5.7,.06,4.4,wood);
box(.12,2.7,3.5,-3.8,1.35,4.7,dark,true);
for(let z=3.2;z<6.4;z+=.3)box(.14,2.6,.055,-3.7,1.35,z,wood);
box(5,.85,.85,3.4,.43,5.8,cream,true);box(5.15,.09,1,3.4,.9,5.8,wood);
for(let x=1.3;x<5.8;x+=1.05){box(.025,.65,.025,x,.43,5.36,dark);box(.3,.035,.045,x+.45,.68,5.34,gold);}
box(3.8,.08,.45,4,2.5,6.05,wood);box(3.7,.025,.03,4,2.45,5.85,warm);
// Mission screen drawn locally, without remote font or texture requests.
function label(text,sub,w=3,h=1){const c=document.createElement('canvas');c.width=1024;c.height=320;const ctx=c.getContext('2d');ctx.fillStyle='#132d34';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#599fa2';ctx.strokeRect(20,20,984,280);ctx.fillStyle='#bde3d9';ctx.font='44px monospace';ctx.fillText(text,60,120);ctx.fillStyle='#83a8a8';ctx.font='22px monospace';ctx.fillText(sub,60,195);const m=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)});const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);scene.add(o);return o;}
const screen=label('AURELIA / HABITAT 07','ALL SYSTEMS NOMINAL     /     MAKE YOURSELF AT HOME',3.8,1.2);screen.position.set(3.5,2.1,6.31);
const exitSign=label('SURFACE →','AIRLOCK / 07',1.7,.53);exitSign.position.set(7.72,3.1,-.2);exitSign.rotation.y=-Math.PI/2;

// Desert terrain with a flat walkable region surrounding the habitat.
function terrainHeight(x,z){const d=Math.hypot(x,z);const fade=THREE.MathUtils.smoothstep(d,18,65);return -.18+fade*(2.6*Math.sin(x*.036+z*.022)+1.8*Math.sin(z*.055-x*.024)+.65*Math.sin(x*.12+z*.06));}
const terrainGeo=new THREE.PlaneGeometry(1000,1000,180,180);terrainGeo.rotateX(-Math.PI/2);const pos=terrainGeo.attributes.position;const colors=[];
for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=terrainHeight(x,z);pos.setY(i,h);const c=new THREE.Color('#be8860');c.multiplyScalar(.92+.09*Math.sin(x*.06+z*.08)+h*.015);colors.push(c.r,c.g,c.b);}
terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();const ground=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));ground.receiveShadow=true;scene.add(ground);
let seed=79;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const rockGeo=new THREE.DodecahedronGeometry(1,0),rockMat=mat('#977459');
for(let i=0;i<160;i++){const x=(rand()-.5)*330,z=(rand()-.5)*330;if(Math.abs(x)<17&&Math.abs(z)<17)continue;const r=new THREE.Mesh(rockGeo,rockMat);const s=.3+rand()*2.5;r.scale.set(s,s*(.4+rand()),s);r.position.set(x,terrainHeight(x,z)+s*.23,z);r.rotation.set(rand(),rand()*6,rand());r.castShadow=true;r.receiveShadow=true;scene.add(r);}
for(let i=0;i<23;i++){const angle=i/23*Math.PI*2;const x=Math.cos(angle)*260,z=Math.sin(angle)*260;const r=new THREE.Mesh(new THREE.ConeGeometry(25+rand()*25,25+rand()*35,5),mat('#a27a67'));r.position.set(x,6,z);r.rotation.y=rand()*4;scene.add(r);}
for(let x=13;x<55;x+=7){for(const z of [-2.1,2.1]){box(.12,.7,.12,x,.22,z,dark);box(.14,.12,.14,x,.62,z,teal);}}
// Banded gas giant and a distant moon.
const planetCanvas=document.createElement('canvas');planetCanvas.width=512;planetCanvas.height=256;const pc=planetCanvas.getContext('2d');
for(let y=0;y<256;y++){const v=Math.sin(y*.13)*12+Math.sin(y*.39)*5;pc.fillStyle=`rgb(${165+v},${157+v},${143+v})`;pc.fillRect(0,y,512,1);}
const planet=new THREE.Mesh(new THREE.SphereGeometry(29,64,48),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(planetCanvas),color:'#cbbbab',fog:false}));planet.position.set(-25,36,-235);planet.rotation.z=.28;scene.add(planet);
const ring=new THREE.Mesh(new THREE.RingGeometry(38,53,100),new THREE.MeshBasicMaterial({color:'#bfaf91',side:THREE.DoubleSide,transparent:true,opacity:.64,fog:false}));ring.position.copy(planet.position);ring.rotation.set(1.25,.18,-.35);scene.add(ring);
const moon=new THREE.Mesh(new THREE.SphereGeometry(8,32,24),mat('#d8c8ad'));moon.position.set(-92,59,-230);scene.add(moon);
const starsGeo=new THREE.BufferGeometry();const starPositions=[];for(let i=0;i<2200;i++){const a=rand()*Math.PI*2,y=rand(),r=Math.sqrt(1-y*y);starPositions.push(Math.cos(a)*r*700,y*700,Math.sin(a)*r*700);}starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));const starMat=new THREE.PointsMaterial({color:'#e2edff',size:1.15,transparent:true,opacity:0,depthWrite:false,fog:false});scene.add(new THREE.Points(starsGeo,starMat));

// Original GLB meshes are normalized from their authored bounds, retaining textures.
const specs=[['table_001',-2.8,.07,-2.8,1.65,Math.PI/2],['seat_003',.1,0,-2.3,1.2,-Math.PI/2],['seat_003',.1,0,-4,1.2,-Math.PI/2],['flower_001',-6.8,0,-5.4,1.9,0],['flower_003',6.7,0,-5.5,1.65,0],['flower_005',1.7,.96,5.8,.5,0],['bed_001',-5.7,.13,4.7,2.8,0],['coffee_machine_001',4.4,.96,5.8,.65,Math.PI],['cup_001',-2.9,.43,-2.8,.15,0],['cup_002',3.7,.96,5.7,.15,0],['laptop_001',2.5,.96,5.7,.6,Math.PI],['lamp_001',-6.9,.55,3.1,.65,0],['drawer_001',-6.9,0,3.1,.6,0],['pillow_001',-5.7,.72,5.4,.6,0],['flower_008',6.5,0,3.9,1.3,0],['wall_computer_001',7.75,1.4,-3.4,.8,-Math.PI/2]];
let loaded=0;const failures=[];const loader=new GLTFLoader();
await Promise.all(specs.map(async([name,x,y,z,size,rot],index)=>{try{const gltf=await loader.loadAsync(`./assets/${name}.glb`);const o=gltf.scene;const bounds=new THREE.Box3().setFromObject(o),s=bounds.getSize(new THREE.Vector3());o.scale.setScalar(size/Math.max(s.x,s.y,s.z));const b=new THREE.Box3().setFromObject(o),center=b.getCenter(new THREE.Vector3());o.position.set(-center.x,-b.min.y,-center.z);const group=new THREE.Group();group.add(o);group.rotation.y=rot;group.position.set(x,y,z);o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});scene.add(group);register(group,`asset-${index}`,name,'asset',['bed_001','seat_003','table_001','drawer_001'].includes(name));}catch(e){console.error(name,e);failures.push(name);}document.querySelector('#progress').textContent=`${Math.round(++loaded/specs.length*100)}%`;}));
document.querySelector('#loading').hidden=!failures.length;if(failures.length)document.querySelector('#loading').textContent=`読み込み失敗: ${failures.join(', ')}。再読み込みしてください。`;

camera.position.set(4.9,1.68,4.1);camera.rotation.set(-.045,.52,0);
const dayColor=new THREE.Color('#c99f80'),nightColor=new THREE.Color('#101b32'),dayHemi=new THREE.Color('#ffe3ba'),nightHemi=new THREE.Color('#779ac9');
const app=createEditor({THREE,scene,camera,canvas,records,staticColliders:colliders,terrainHeight,failures,
  getNight:()=>targetNight,
  setNight(v){targetNight=v;document.querySelector('#day').classList.toggle('active',!v);document.querySelector('#night').classList.toggle('active',!!v);document.querySelector('#day').setAttribute('aria-pressed',String(!v));document.querySelector('#night').setAttribute('aria-pressed',String(!!v));document.querySelector('#time').textContent=v?'SOL 128 · NIGHTFALL':'SOL 128 · DAYLIGHT';}
});
document.querySelector('#day').onclick=()=>app.setNight(0);document.querySelector('#night').onclick=()=>app.setNight(1);
let previous=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;
night=THREE.MathUtils.damp(night,targetNight,3,dt);scene.background.copy(dayColor).lerp(nightColor,night);scene.fog.color.copy(scene.background);hemi.color.copy(dayHemi).lerp(nightHemi,night);hemi.intensity=2.2-night*1.65;sun.intensity=3.1-night*2.9;sun.color.set(night>.5?'#accbff':'#ffe0ae');starMat.opacity=night*.95;renderer.toneMappingExposure=1.15+night*.2;
app.update(dt);renderer.render(scene,camera);}
requestAnimationFrame(frame);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});


