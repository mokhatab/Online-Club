import { useEffect } from 'react';
import { api } from '../api/client';

/**
 * Loads browser tracking snippets (GA4 / Meta Pixel / TikTok) automatically
 * from the API's public marketing config — the admin pastes IDs once in the
 * Admin → Marketing page and every visitor gets the snippets. No redeploy.
 */
function loadScriptOnce(id, src) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function inlineOnce(id, code) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.textContent = code;
  document.head.appendChild(s);
}

export default function MarketingSnippets() {
  useEffect(() => {
    api.marketingPublic().then((cfg) => {
      if (cfg.ga4?.measurementId) {
        const mid = cfg.ga4.measurementId;
        loadScriptOnce('ga4-lib', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(mid)}`);
        inlineOnce('ga4-init', `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${mid}');`);
      }
      if (cfg.meta?.pixelId) {
        const pid = cfg.meta.pixelId;
        inlineOnce('meta-pixel', `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pid}');fbq('track','PageView');`);
      }
      if (cfg.tiktok?.pixelId) {
        const pid = cfg.tiktok.pixelId;
        inlineOnce('tiktok-pixel', `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=n,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=e;var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=n+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${pid}');ttq.page();}(window,document,'ttq');`);
      }
    }).catch(() => {});
  }, []);

  return null;
}
