/* Highlight the mapped building footprint at a stop, never an arbitrary city block. */
window.createMemoryLandmarks = function(map) {
  const empty=()=>({type:'FeatureCollection',features:[]});
  const data=features=>({type:'FeatureCollection',features});
  let current=null,found=false,lastTry=-1000,lastPaint=-1000;
  map.addSource('memory-landmark',{type:'geojson',data:empty()});
  map.addLayer({id:'memory-landmark-building',type:'fill-extrusion',source:'memory-landmark',paint:{
    'fill-extrusion-color':'#ffe89a','fill-extrusion-height':['get','height'],
    'fill-extrusion-base':['get','base'],'fill-extrusion-opacity':.9,
    'fill-extrusion-opacity-transition':{duration:0},'fill-extrusion-color-transition':{duration:0}
  }});
  map.addLayer({id:'memory-landmark-outline',type:'line',source:'memory-landmark',paint:{'line-color':'#f2ba32','line-width':3,'line-opacity':.9}});
  map.addSource('memory-arrival-point',{type:'geojson',data:empty()});
  map.addLayer({id:'memory-arrival-ring',type:'circle',source:'memory-arrival-point',paint:{'circle-radius':18,'circle-color':'#ffcd59','circle-opacity':.10,'circle-stroke-color':'#ffd65c','circle-stroke-width':2,'circle-stroke-opacity':.8,'circle-radius-transition':{duration:0},'circle-stroke-opacity-transition':{duration:0}}});
  function inside(p,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
  }return yes;}
  function distance(p,ring){let best=Infinity;const k=Math.cos(p[1]*Math.PI/180)*111320;
    for(let i=1;i<ring.length;i++){const a=[(ring[i-1][0]-p[0])*k,(ring[i-1][1]-p[1])*111320],b=[(ring[i][0]-p[0])*k,(ring[i][1]-p[1])*111320],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,Math.hypot(a[0]+t*dx,a[1]+t*dy));}return best;
  }
  function resolve(){if(!current)return;const candidates=map.querySourceFeatures('openmaptiles',{sourceLayer:'building'}),ranked=[];
    for(const f of candidates){if(f.properties.hide_3d===true||!['Polygon','MultiPolygon'].includes(f.geometry.type))continue;const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
      for(const rings of polygons){const contains=inside(current.at,rings[0])&&!rings.slice(1).some(r=>inside(current.at,r));const d=contains?0:distance(current.at,rings[0]);if(d>25)continue;
        const base=Math.max(0,Number(f.properties.render_min_height)||0),height=Math.max(base+1,8,Number(f.properties.render_height)||12)+.3;
        ranked.push({d,feature:{type:'Feature',geometry:{type:'Polygon',coordinates:rings},properties:{height,base}}});
      }
    }
    ranked.sort((a,b)=>a.d-b.d);const selected=ranked[0];found=!!selected;
    map.getSource('memory-landmark').setData(data(selected?[selected.feature]:[]));
    document.getElementById('map-instruction').textContent=found?'景點所在建築亮起，回憶準備展開。':'這一站的回憶亮起，準備回到當時。';
  }
  return {
    start(stop){current=stop;found=false;lastTry=-1000;lastPaint=-1000;map.getSource('memory-arrival-point').setData(data([{type:'Feature',geometry:{type:'Point',coordinates:stop.at},properties:{}}]));resolve();},
    update(ms,reduced=false){if(!current||ms-lastPaint<32)return;lastPaint=ms;if(!found&&ms-lastTry>650){resolve();lastTry=ms;}
      const wave=reduced?1:(1+Math.cos(Math.min(ms,1800)/600*Math.PI*2))/2;
      map.setPaintProperty('memory-landmark-building','fill-extrusion-opacity',.30+.68*wave);
      map.setPaintProperty('memory-landmark-building','fill-extrusion-color',`rgb(${218+Math.round(37*wave)},${155+Math.round(79*wave)},${40+Math.round(126*wave)})`);
      map.setPaintProperty('memory-arrival-ring','circle-radius',18+wave*24);
      map.setPaintProperty('memory-arrival-ring','circle-stroke-opacity',.85-wave*.55);
    },
    settle(){if(!current)return;map.setPaintProperty('memory-landmark-building','fill-extrusion-opacity',.98);map.setPaintProperty('memory-landmark-building','fill-extrusion-color','#ffeaa6');map.setPaintProperty('memory-arrival-ring','circle-radius',42);map.setPaintProperty('memory-arrival-ring','circle-stroke-opacity',.3);},
    clear(){current=null;found=false;map.getSource('memory-landmark').setData(empty());map.getSource('memory-arrival-point').setData(empty());}
  };
};
