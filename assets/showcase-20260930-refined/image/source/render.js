const format=new URLSearchParams(location.search).get('format')||'billboard';
window.LatticeArt.mount(document.getElementById('artboard'),format);
window.__ready=Promise.all([document.fonts.load('500 117px Rubik'),document.fonts.load('400 20px Rubik')]).then(()=>document.fonts.ready);
