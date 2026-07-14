
document.addEventListener('DOMContentLoaded',function(){
  var t=document.querySelector('.menu-toggle'),m=document.querySelector('.mobile-nav');
  if(t&&m){t.addEventListener('click',function(){m.classList.toggle('open');});}

  // sticky header shrink
  var hd=document.querySelector('header.nav');
  function onScroll(){ if(hd){ if(window.scrollY>40)hd.classList.add('shrink'); else hd.classList.remove('shrink'); } }
  window.addEventListener('scroll',onScroll,{passive:true}); onScroll();

  // reveal on scroll
  var rev=document.querySelectorAll('.sec-head,.svc,.proj,.stat,.person,.sector,.pstep,.csr .box,.value,.country,.logo-wall .cell,.lead-img,.form-card,.aside');
  rev.forEach(function(el){el.classList.add('reveal');});
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
    rev.forEach(function(el){io.observe(el);});
  } else { rev.forEach(function(el){el.classList.add('in');}); }

  // count-up stats
  function countup(el){var span=el.querySelector('span');var suf=span?span.outerHTML:'';var target=parseInt((el.textContent||'').replace(/[^0-9]/g,''));if(isNaN(target))return;var t0=null;function step(ts){if(!t0)t0=ts;var p=Math.min((ts-t0)/1100,1);var v=Math.floor(p*target);el.innerHTML=v+suf;if(p<1)requestAnimationFrame(step);else el.innerHTML=target+suf;}requestAnimationFrame(step);}
  var nums=document.querySelectorAll('.stat .num');
  if('IntersectionObserver' in window){
    var io2=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){countup(e.target);io2.unobserve(e.target);}});},{threshold:.5});
    nums.forEach(function(n){io2.observe(n);});
  }

  // project filters
  var fbtns=document.querySelectorAll('.filters button');
  if(fbtns.length){fbtns.forEach(function(b){b.addEventListener('click',function(){
    fbtns.forEach(function(x){x.classList.remove('active');});b.classList.add('active');
    var f=b.getAttribute('data-filter');
    document.querySelectorAll('.proj[data-cat]').forEach(function(c){c.style.display=(f==='all'||c.getAttribute('data-cat')===f)?'':'none';});
  });});}

  // lightbox
  var lb=document.querySelector('.lightbox');
  if(lb){var lbi=lb.querySelector('img');
    document.querySelectorAll('.gallery img').forEach(function(g){g.addEventListener('click',function(){lbi.src=g.getAttribute('data-full')||g.src;lb.classList.add('open');});});
    lb.addEventListener('click',function(){lb.classList.remove('open');});}

  // quote form -> mailto
  var f=document.querySelector('#quoteForm');
  if(f){f.addEventListener('submit',function(e){e.preventDefault();var ok=true;
    f.querySelectorAll('[required]').forEach(function(el){if(!el.value.trim()){el.classList.add('err');ok=false;}else{el.classList.remove('err');}});
    if(!ok)return;
    var get=function(n){var el=f.querySelector('[name="'+n+'"]');return el?el.value:'';};
    var body=encodeURIComponent('Name: '+get('first')+' '+get('last')+'\nCompany: '+get('company')+'\nPosition: '+get('position')+'\nPhone: '+get('phone')+'\nEmail: '+get('email')+'\nCountry: '+get('country')+'\nService: '+get('service')+'\n\nProject details: '+get('message'));
    var ok2=f.querySelector('.form-ok');if(ok2)ok2.classList.add('show');
    window.location.href='mailto:admin@currentegypt.com?subject='+encodeURIComponent('Project inquiry from '+get('first')+' '+get('last'))+'&body='+body;
    f.reset();
  });}
});
