# Browser Parser

Browser Parser captures a small, typed context envelope from the current supported browser tab. Phase 1 supports a visible Asana task pane in current Chrome and Edge.

## Bookmarklet

Create a bookmark with this exact single-line URL:

```text
javascript:(()=>{const w=window.open('about:blank','browser-parser-report');if(!w){console.error('browser-parser:popup-blocked');return;}const d=w.document,e=(t,id,x)=>{const n=d.createElement(t);if(id)n.id=id;if(x)n.textContent=x;return n;},m=e('main','',''),h=e('header','outcome-block',''),s=e('p','capture-status',''),q=e('p','capture-message','Loading Browser Parser and capturing this tab. Keep this report tab open.'),r=e('div','report-sections','');d.title='Browser Parser — Capture report';d.documentElement.lang='en';m.setAttribute('aria-labelledby','report-title');h.append(e('p','','Browser Parser'),e('h1','report-title','Capture report'));s.setAttribute('role','status');s.setAttribute('aria-live','polite');s.setAttribute('aria-atomic','true');h.append(s,q);m.append(h,r);d.body.replaceChildren(m);s.textContent='Capture status: Loading.';import('https://esm.sh/gh/dddominikk/browser-parser?target=es2022').then(({captureCurrentTab})=>captureCurrentTab({reportWindow:w})).catch(error=>{h.className='status-import-failed';q.textContent='The Browser Parser module did not load. Review the source page console entry prefixed browser-parser:import-failed. Browser Parser does not bypass site policy or retry another host.';r.replaceChildren();s.textContent='Capture status: Import failed.';console.error('browser-parser:import-failed',error);});})()
```

The bookmarklet opens one report tab synchronously, then imports the latest default-branch module from esm.sh. A strict site content-security policy can block that import; Browser Parser does not bypass policy or retry another host. A commit-pinned esm.sh URL is for diagnostics only, not normal use.

The public API exports `captureCurrentTab`, `registerParser`, and `asanaParser`. Results are typed plain-data envelopes; the report renders captured values as literal text and leaves captured URLs non-clickable.
