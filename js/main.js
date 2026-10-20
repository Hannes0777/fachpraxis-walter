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
    var txt=pill.querySelector('span');
    var open=slots[d].some(function(s){return h>=s[0]&&h<s[1];});
    if(open){txt.textContent='Jetzt geöffnet';}
    else{
      var next=slots[d].filter(function(s){return h<s[0];})[0];
      txt.textContent=next?('Heute wieder ab '+next[0]+':00 Uhr'):'Gerade geschlossen';
      pill.classList.add('closed');
    }
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
})();
