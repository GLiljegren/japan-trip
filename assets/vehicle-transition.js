(function(root){
  function mode(value){const key=String(value??'train').trim().toLowerCase();if(key==='none')return 'none';if(key==='flight')return 'flight';if(['train','rail','shinkansen','tåg'].includes(key))return 'train';if(['bus','buss'].includes(key))return 'bus';throw new Error('Transport mode must be train, bus or flight (Shinkansen is also accepted).');}
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
  function state(progress,modes,scrollLength,reducedMotion=false){
    if(!modes.length)return {kind:'train',scale:0,jump:0};
    const position=Math.max(0,Math.min(1,progress))*modes.length,index=Math.min(modes.length-1,Math.floor(position));
    const kind=mode(modes[index]),rest={kind,scale:kind==='none'?0:1,jump:0};
    if(reducedMotion)return {...rest,scale:position===0||position===modes.length?0:rest.scale};
    const edge=Math.min(.4,300/Math.max(1,scrollLength/modes.length));
    // Grow and land on departure; reverse the same curve on arrival.
    function entrance(kind,t){if(kind==='none')return {kind,scale:0,jump:0};if(t<.6)return {kind,scale:ease(t/.6),jump:0};return {kind,scale:1,jump:18*Math.sin(Math.PI*ease((t-.6)/.4))};}
    if(position<edge)return entrance(mode(modes[0]),position/edge);
    if(position>modes.length-edge)return entrance(mode(modes.at(-1)),(modes.length-position)/edge);
    // 300px of scroll per change, capped at 40% of one leg to avoid overlapping windows.
    const half=Math.min(.2,150/Math.max(1,scrollLength/modes.length));
    for(let boundary=1;boundary<modes.length;boundary++){
      const from=mode(modes[boundary-1]),to=mode(modes[boundary]);if(from===to||position<boundary-half||position>boundary+half)continue;
      const t=(position-boundary+half)/(2*half);
      if(t<.2)return {kind:from,scale:from==='none'?0:1,jump:from==='none'?0:18*Math.sin(Math.PI*ease(t/.2))};
      if(t<.5)return {kind:from,scale:from==='none'?0:1-ease((t-.2)/.3),jump:0};
      if(t<.8)return {kind:to,scale:to==='none'?0:ease((t-.5)/.3),jump:0};
      return {kind:to,scale:to==='none'?0:1,jump:to==='none'?0:18*Math.sin(Math.PI*ease((t-.8)/.2))};
    }return rest;
  }
  const api={mode,state};root.JapanVehicleTransition=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
