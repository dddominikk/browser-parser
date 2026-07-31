export interface BookmarkletConfig {
    readonly publicModuleUrl?: string;
    readonly privateRawUrl?: string;
}

function quote(value: string): string {
    return JSON.stringify(value);
}

function sharedLoader(loader: string): string {
    return `(\()=>{const w=window.open('about:blank','browser-parser-report');if(!w){console.error('browser-parser:popup-blocked');return;}const d=w.document,e=(t,id,x)=>{const n=d.createElement(t);if(id)n.id=id;if(x)n.textContent=x;return n;},m=e('main','',null),h=e('header','outcome-block',null),s=e('p','capture-status',null),q=e('p','capture-message','Loading Browser Parser and capturing this tab. Keep this report tab open.'),r=e('div','report-sections',null);d.title='Browser Parser — Capture report';d.documentElement.lang='en';m.setAttribute('aria-labelledby','report-title');h.append(e('p','', 'Browser Parser'),e('h1','report-title','Capture report'));s.setAttribute('role','status');s.setAttribute('aria-live','polite');s.setAttribute('aria-atomic','true');h.append(s,q);m.append(h,r);d.body.replaceChildren(m);s.textContent='Capture status: Loading.';${loader}.then(module=>{if(typeof module.captureCurrentTab!=='function')throw new Error('The loaded module does not export captureCurrentTab.');return module.captureCurrentTab({reportWindow:w});}).catch(error=>{h.className='status-import-failed';q.textContent='The Browser Parser module could not load or capture this tab. Review the report and source-page console entry prefixed browser-parser:import-failed.';r.replaceChildren();s.textContent='Capture status: Import failed.';console.error('browser-parser:import-failed',error);});})()`;
}

export function generatePublicBookmarklet(moduleUrl: string): string {
    return `javascript:${sharedLoader(`import(${quote(moduleUrl)})`)}`;
}

export function generatePrivateBookmarklet(rawUrl: string): string {
    const loader = `(async()=>{const response=await fetch(${quote(rawUrl)},{cache:'no-store'});if(!response.ok)throw new Error('Raw bundle request failed with HTTP '+response.status);const source=await response.text();const blob=new Blob([source],{type:'text/javascript'});const objectUrl=URL.createObjectURL(blob);try{return await import(objectUrl)}finally{URL.revokeObjectURL(objectUrl)}})()`;
    return `javascript:${sharedLoader(loader)}`;
}

export function validateBookmarklet(value: string): void {
    if (!value.startsWith('javascript:')) throw new Error('Bookmarklet must begin with javascript:.');
    if (value.includes('\n') || value.includes('\r')) throw new Error('Bookmarklet must be a single line.');
}
