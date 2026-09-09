/* Lightweight, actual mesh vehicles rendered inside MapLibre's WebGL scene. */
(() => {
  const T=window.THREE;
  if(!T)return;
  const material=color=>new T.MeshStandardMaterial({color,roughness:.48,metalness:.12});
  const palette={white:material('#f5f7f3'),blue:material('#2c94ae'),dark:material('#203645'),glass:material('#315e71'),rubber:material('#283139'),silver:material('#b5c7c8'),yellow:material('#ffe8a0'),red:material('#d44b48'),green:material('#337d68')};
  function mesh(group,geometry,mat,x=0,y=0,z=0){const m=new T.Mesh(geometry,palette[mat]||mat);m.position.set(x,y,z);group.add(m);return m;}
  function box(g,x,y,z,l,w,h,c){return mesh(g,new T.BoxGeometry(l,w,h),c,x,y,z);}
  function ellipsoid(g,x,y,z,l,w,h,c){const m=mesh(g,new T.SphereGeometry(1,20,12),c,x,y,z);m.scale.set(l,w,h);return m;}
  function wheel(g,x,y,z){mesh(g,new T.CylinderGeometry(.23,.23,.14,12),'rubber',x,y,z);mesh(g,new T.CylinderGeometry(.12,.12,.15,12),'silver',x,y,z);}
  function wing(g,points,z,c){const shape=new T.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();return mesh(g,new T.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:false}),c,0,0,z);}
  function aircraft(){const g=new T.Group();ellipsoid(g,0,0,.65,3.7,.39,.42,'white');ellipsoid(g,2.6,0,.88,.56,.3,.18,'glass');
    wing(g,[[.85,0],[-.5,3.55],[-1.5,3.4],[-.7,0]],.63,'white');wing(g,[[.85,0],[-.5,-3.55],[-1.5,-3.4],[-.7,0]],.63,'white');
    wing(g,[[-2.2,0],[-3.05,1.5],[-3.5,1.4],[-3.2,0]],.7,'blue');wing(g,[[-2.2,0],[-3.05,-1.5],[-3.5,-1.4],[-3.2,0]],.7,'blue');
    const tail=box(g,-2.9,0,1.22,.95,.12,1.15,'blue');tail.rotation.y=-.25;
    for(const y of [-1.3,1.3]){ellipsoid(g,-.15,y,.4,.66,.27,.27,'silver');const engine=mesh(g,new T.CylinderGeometry(.18,.18,.05,16),'dark',.47,y,.4);engine.rotation.z=Math.PI/2;}
    for(let x=-2.1;x<1.9;x+=.42)for(const y of [-.375,.375])box(g,x,y,.83,.16,.04,.13,'glass');return g;}
  function roadVehicle(kind){const g=new T.Group(),taxi=kind==='car-taxi-front',tram=kind==='tram-front',bus=kind==='bus';const len=taxi?4.2:6.5,w=taxi?1.65:1.85,h=tram?2.9:bus?2.15:1.65,c=taxi?'red':tram?'green':bus?'blue':'silver';
    box(g,0,0,.46,len,w,.4,'dark');box(g,0,0,.9,len,w,.65,c);
    if(taxi){box(g,-.3,0,1.35,2.45,1.48,.65,'white');box(g,.91,0,1.4,.06,1.38,.44,'glass');box(g,-1.5,0,1.4,.06,1.38,.44,'glass');for(const side of [-1,1])for(const x of [-.9,.25])box(g,x,side*.751,1.43,.98,.025,.4,'glass');box(g,-.2,0,1.78,.66,.43,.15,'yellow');}
    else{box(g,0,0,h/2+.6,len-.1,w-.08,h-.45,c);box(g,0,0,h+.39,len,.08+w,.17,'white');for(const side of [-1,1]){for(let x=-2.55;x<2.9;x+=.92){box(g,x,side*w/2,h-.04,.67,.045,.64,'glass');if(tram)box(g,x,side*w/2,1.05,.67,.045,.56,'glass');}box(g,0,side*(w/2+.03),.9,len,.025,.14,'white');}box(g,len/2,0,h-.03,.05,w-.2,.68,'glass');}
    for(const x of [-len*.32,len*.32])for(const y of [-w/2,w/2])wheel(g,x,y,.33);
    for(const y of [-w*.32,w*.32])box(g,len/2+.03,y,.7,.05,.24,.17,'yellow');
    if(tram){box(g,-1,0,3.45,.1,.1,.55,'dark');const pole=box(g,-.3,0,3.76,1.5,.07,.07,'dark');pole.rotation.y=-.17;}
    if(!taxi&&!tram&&!bus){box(g,0,0,2.28,1.2,.65,.25,'dark');box(g,-3.45,0,.8,.5,.5,.3,'dark');}
    return g;
  }
  window.createMemoryVehicles=function(map){
    const scene=new T.Scene(),camera=new T.Camera(),models={plane:aircraft()};for(const k of ['bus','car-taxi-front','tram-front'])models[k]=roadVehicle(k);
    const train=new T.Group(),cars=Array.from({length:4},()=>roadVehicle('train-front'));
    cars.forEach(car=>train.add(car));models['train-front']=train;
    Object.values(models).forEach(m=>{m.visible=false;scene.add(m)});
    scene.add(new T.HemisphereLight(0xffffff,0x667077,2.1));const sun=new T.DirectionalLight(0xfff0d8,2.8);sun.position.set(5,-8,14);scene.add(sun);
    let renderer,active=null,position=[121.2328,25.0797],angle=0,sampleBehind=null,sizeFactor=1;
    const layer={id:'memory-vehicle-model',type:'custom',renderingMode:'3d',onAdd(m,gl){renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false;},render(gl,args){
      if(!active||!renderer)return;const unit=40075016.686*Math.cos(position[1]*Math.PI/180)/(512*Math.pow(2,map.getZoom()))*(active===train?6:12)*sizeFactor;
      const merc=maplibregl.MercatorCoordinate.fromLngLat(position,unit*(active===models.plane ? .5 : .2)),scale=merc.meterInMercatorCoordinateUnits()*unit;
      active.rotation.z=angle;
      if(active===train){active.rotation.z=0;cars.forEach((car,i)=>{
        const p=sampleBehind?sampleBehind(i*7.15*unit):position;
        const ahead=sampleBehind?sampleBehind((i*7.15-.6)*unit):[p[0]+Math.cos(angle)*.001,p[1]+Math.sin(angle)*.001];
        const m=maplibregl.MercatorCoordinate.fromLngLat(p);
        car.position.set((m.x-merc.x)/scale,-(m.y-merc.y)/scale,0);
        car.rotation.z=Math.atan2(ahead[1]-p[1],(ahead[0]-p[0])*Math.cos(p[1]*Math.PI/180));
      });}
      const matrix=new T.Matrix4().fromArray(args.defaultProjectionData?.mainMatrix||args);
      const local=new T.Matrix4().makeTranslation(merc.x,merc.y,merc.z).scale(new T.Vector3(scale,-scale,scale));
      camera.projectionMatrix.copy(matrix.multiply(local));renderer.resetState();renderer.clearDepth();renderer.render(scene,camera);renderer.resetState();
    },onRemove(){Object.values(models).forEach(g=>g.traverse(m=>{if(m.geometry)m.geometry.dispose()}));Object.values(palette).forEach(m=>m.dispose());renderer?.dispose();}};
    map.addLayer(layer);
    return {opacity(value){Object.values(palette).forEach(m=>{m.transparent=true;m.opacity=value;});map.triggerRepaint();},move(type,point,next,sampler,context={}){sizeFactor=context.city==='seoul'?(type==='bus'?.56:type==='train-front'?.68:.85):1;sampleBehind=sampler;const selected=models[type]||models['train-front'];if(active!==selected){if(active)active.visible=false;active=selected;active.visible=true;}position=point;const dx=(next[0]-point[0])*Math.cos(point[1]*Math.PI/180),dy=next[1]-point[1];if(Math.hypot(dx,dy)>1e-10)angle=Math.atan2(dy,dx);map.triggerRepaint();},hide(){if(active)active.visible=false;active=null;map.triggerRepaint();}};
  };
})();
