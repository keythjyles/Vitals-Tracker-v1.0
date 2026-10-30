export function frameAt(times,time){let lo=0,hi=times.length;while(lo<hi){const mid=(lo+hi)>>>1;if(times[mid]<=time+1e-7)lo=mid+1;else hi=mid;}return Math.max(0,lo-1);}
export function selection(times,end,inFrame,outFrame){if(!times.length||!Number.isInteger(inFrame)||!Number.isInteger(outFrame)||inFrame<0||outFrame<=inFrame||outFrame>times.length)throw Error('Mark IN before OUT.');return {inFrame,outFrame,start:times[inFrame],end:outFrame===times.length?end:times[outFrame],frames:outFrame-inFrame};}
export function clipName(name,ext){return (String(name||'Clip').replace(/\.[^.]+$/,'').replace(/[\\/<>:"|?*\x00-\x1f]/g,'_').replace(/^\.+/,'').trim().slice(0,110)||'Clip')+'.'+ext;}
export function cloudResult(receipt,hash,bytes){if(!receipt?.persisted&&!receipt?.reused)throw Error('Cloud save was not acknowledged.');if(receipt.asset?.sha256!==hash||receipt.asset?.size!==bytes||!receipt.asset?.path)throw Error('Cloud byte verification did not match.');return receipt.asset;}

export function constantFrameRate(times,end){if(!times.length)return null;const step=(end-times[0])/times.length;if(!(step>0)||!times.every((t,i)=>Math.abs(t-(times[0]+i*step))<.00001))return null;return 1/step;}
