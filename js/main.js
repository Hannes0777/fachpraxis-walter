(function(){
  var btn=document.getElementById('menuBtn'), links=document.getElementById('links');
  btn.addEventListener('click',function(){var o=links.classList.toggle('open');btn.setAttribute('aria-expanded',o);});
  links.addEventListener('click',function(e){if(e.target.tagName==='A'){links.classList.remove('open');btn.setAttribute('aria-expanded','false');}});

  // Therapiezeiten (Mo-Fr, 0 = Sonntag)
  var slots={1:[[10,13],[14,20]],2:[[8,13]],3:[[8,13],[14,20]],4:[[8,13],[14,20]],5:[[9,13]],6:[],0:[]};
  var now=new Date(), d=now.getDay(), h=now.getHours()+now.getMinutes()/60;
  var row=document.querySelector('#hours tr[data-d="'+(d===0?6:d)+'"]'); if(row) row.classList.add('today');
  var pill=document.getElementById('openNow');
  if(pill){
    var lbl=pill.querySelector('b'), sub=pill.querySelector('small');
    var fmt=function(x){var m=Math.round((x%1)*60);return Math.floor(x)+(m?':'+(m<10?'0':'')+m:':00')+' Uhr';};
    var open=null; (slots[d]||[]).forEach(function(s){if(h>=s[0]&&h<s[1])open=s;});
    if(open){pill.dataset.state='open';lbl.textContent='Jetzt geöffnet';sub.textContent='bis '+fmt(open[1]);}
    else{
      pill.dataset.state='closed';lbl.textContent='Gerade geschlossen';
      var days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
      var txt='';
      for(var i=0;i<8&&!txt;i++){
        var dd=(d+i)%7, list=slots[dd]||[];
        var nx=list.filter(function(s){return i>0||h<s[0];})[0];
        if(nx) txt=(i===0?'heute':(i===1?'morgen':days[dd]))+' wieder ab '+fmt(nx[0]);
      }
      sub.textContent=txt;
    }
  }

  // Startseite: Hero streckt sich so, dass die Statusleiste genau am unteren Bildschirmrand endet
  var hero=document.querySelector('.hero'), strip=document.querySelector('.strip');
  if(hero&&strip){
    var probe=document.createElement('div');probe.setAttribute('aria-hidden','true');probe.style.cssText='position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none';document.body.appendChild(probe);
    var fit=function(){
      hero.style.minHeight='';
      var dock=document.querySelector('.dock'), dh=(dock&&getComputedStyle(dock).display!=='none')?dock.offsetHeight:0;
      var vh=probe.offsetHeight||window.innerHeight; // kleinste Viewport-Höhe (svh), damit iPhone-Browserleisten nichts verdecken
      var delta=vh-dh-strip.getBoundingClientRect().bottom-window.scrollY;
      if(delta>0) hero.style.minHeight=(hero.offsetHeight+delta)+'px';
    };
    fit(); window.addEventListener('load',fit); window.addEventListener('resize',fit);
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fit);
  }

  document.querySelectorAll('.copy[data-copy]').forEach(function(b){
    b.addEventListener('click',function(){
      var t=b.getAttribute('data-copy');
      var done=function(){b.textContent='Kopiert';setTimeout(function(){b.textContent='Kopieren';},1500);};
      try{navigator.clipboard.writeText(t).then(done,function(){sel(b);});}catch(e){sel(b);}
    });
  });
  function sel(b){var dd=b.previousElementSibling;var r=document.createRange();r.selectNodeContents(dd);var s=getSelection();s.removeAllRanges();s.addRange(r);}

  var form=document.getElementById('contact-form');
  if(form){
    var err=document.getElementById('err'), ok=document.getElementById('ok'), fileRow=document.getElementById('file-row');
    function sync(){var v=form.querySelector('input[name=art]:checked').value;fileRow.hidden=(v==='hp');}
    form.querySelectorAll('input[name=art]').forEach(function(r){r.addEventListener('change',sync);});sync();
    form.addEventListener('input',function(){err.hidden=true;});
    form.addEventListener('submit',function(e){
      e.preventDefault(); ok.hidden=true;
      var name=document.getElementById('f-name').value.trim(), tel=document.getElementById('f-tel').value.trim(), mail=document.getElementById('f-mail').value.trim();
      var msg='';
      if(!name) msg='Bitte geben Sie Ihren Namen an.';
      else if(!tel&&!mail) msg='Bitte geben Sie eine Telefonnummer oder E-Mail-Adresse an, damit wir Sie erreichen.';
      else if(mail&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) msg='Die E-Mail-Adresse sieht unvollständig aus.';
      else if(!document.getElementById('f-ok').checked) msg='Bitte bestätigen Sie die Datenschutzerklärung.';
      if(msg){err.textContent=msg;err.hidden=false;return;}
      ok.hidden=false;
    });
  }


  // Suche (Index wird beim ersten Öffnen geladen)
  var sBox=document.getElementById('search'), sBtn=document.getElementById('searchBtn');
  if(sBox&&sBtn){
    var sIn=document.getElementById('searchInput'), sRes=document.getElementById('searchResults'), sHint=document.getElementById('searchHint');
    var idx=null, loading=false, lastFocus=null;
    var norm=function(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');};
    var esc=function(s){return s.replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
    var load=function(cb){
      if(idx) return cb();
      if(loading) return; loading=true;
      fetch('js/search-index.json').then(function(r){return r.json();}).then(function(d){idx=d.map(function(e){e.nt=norm(e.t);e.nx=norm(e.x);return e;});cb();}).catch(function(){sHint.textContent='Die Suche konnte nicht geladen werden. Bitte nutzen Sie die Navigation.';});
    };
    var snippet=function(e,words){
      var low=norm(e.x), pos=-1;
      for(var i=0;i<words.length&&pos<0;i++) pos=low.indexOf(words[i]);
      var start=Math.max(0,pos-50), s=e.x.slice(start,start+150);
      return (start>0?'… ':'')+s+(start+150<e.x.length?' …':'');
    };
    var mark=function(s,words){
      var out=esc(s), n=norm(s);
      words.forEach(function(w){ if(!w) return; var re=new RegExp('('+w.replace(/[.*+?^${}()|[\]\\]/g,'\\  // Sanftes Einblenden beim Scrollen')+')','gi'); out=out.replace(re,'<mark>$1</mark>'); });
      return out;
    };
    var run=function(){
      var q=norm(sIn.value.trim()); sRes.innerHTML='';
      if(!q){sHint.textContent='Tippen Sie einen Begriff. Gesucht wird in allen Seiten der Praxis.';return;}
      var words=q.split(/\s+/).filter(Boolean);
      var hits=idx.map(function(e){
        var sc=0, ok=words.every(function(w){var inT=e.nt.indexOf(w)>-1,inX=e.nx.indexOf(w)>-1; if(inT) sc+=10; if(inX) sc+=2; return inT||inX;});
        return ok?{e:e,sc:sc}:null;
      }).filter(Boolean).sort(function(a,b){return b.sc-a.sc;}).slice(0,8);
      if(!hits.length){sHint.innerHTML='Nichts gefunden für „'+esc(sIn.value.trim())+'“. Versuchen Sie es mit einem anderen Wort oder rufen Sie uns an: <a href="tel:+4971819907607">07181 9907607</a>.';return;}
      sHint.textContent=hits.length+(hits.length===1?' Treffer':' Treffer');
      hits.forEach(function(h){
        var li=document.createElement('li'), a=document.createElement('a');
        a.href=h.e.u; a.innerHTML='<b>'+mark(h.e.t,words)+'<span class="where">'+esc(h.e.p)+'</span></b><small>'+mark(snippet(h.e,words),words)+'</small>';
        li.appendChild(a); sRes.appendChild(li);
      });
    };
    var openS=function(){lastFocus=document.activeElement;sBox.hidden=false;document.body.style.overflow='hidden';load(function(){run();});setTimeout(function(){sIn.focus();},30);};
    var closeS=function(){sBox.hidden=true;document.body.style.overflow='';if(lastFocus&&lastFocus.focus)lastFocus.focus();};
    sBtn.addEventListener('click',openS);
    window.addEventListener('pageshow',function(){if(!sBox.hidden)closeS();document.body.style.overflow='';});
    document.getElementById('searchClose').addEventListener('click',closeS);
    sBox.addEventListener('click',function(e){if(e.target===sBox)closeS();});
    sIn.addEventListener('input',function(){load(run);});
    sRes.addEventListener('click',function(e){if(e.target.closest('a'))closeS();});
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&!sBox.hidden){closeS();}
      else if(e.key==='/'&&sBox.hidden&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();openS();}
      else if(e.key==='Enter'&&!sBox.hidden){var a=sRes.querySelector('a');if(a&&document.activeElement===sIn){var href=a.getAttribute('href');closeS();window.location.href=href;}}
      else if((e.key==='ArrowDown'||e.key==='ArrowUp')&&!sBox.hidden){
        var links=[].slice.call(sRes.querySelectorAll('a')); if(!links.length) return;
        var i=links.indexOf(document.activeElement);
        e.preventDefault();
        if(e.key==='ArrowDown') (links[i+1]||links[0]).focus(); else (i<=0?sIn:links[i-1]).focus();
      }
    });
  }

  // Sanftes Einblenden beim Scrollen
  if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion:reduce)').matches){
    document.documentElement.classList.add('js');
    var sel='.sec-head,.area-card,.steps>li,.photo,.three>.card,.split>div,.more>div,.price,.form-grid>*,.career .wrap';
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:.08});
    document.querySelectorAll('main '+sel.split(',').join(',main ')).forEach(function(el){
      if(el.closest('.hero')) return;
      var sibs=el.parentNode.children, idx=Array.prototype.indexOf.call(sibs,el);
      el.style.setProperty('--i',Math.min(idx,4));
      el.classList.add('reveal');
      var r=el.getBoundingClientRect(); if(r.top<innerHeight*0.9&&r.bottom>0) el.classList.add('in'); else io.observe(el);
    });
  }
})();
