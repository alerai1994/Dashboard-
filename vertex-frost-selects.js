/* Vertex custom frosted selectors, shared by every dashboard <select>.
   Native selection remains in the DOM for forms and app change handlers.
   The overlay replaces the platform picker on pointer/keyboard activation. */
(() => {
 'use strict';
 let active=null;
 let lastPointer=null;
 let sequence=0;
 const $=(sel,root=document)=>root.querySelector(sel);
 const isSelect=el=>el&&el.tagName==='SELECT'&&!el.multiple&&el.size<=1&&!el.disabled;
 const close=()=>{
  if(!active)return;
  active.select.removeAttribute('aria-expanded');
  active.select.removeAttribute('aria-controls');
  active.panel.remove();
  active=null;
 };
 function position(){
  if(!active||!active.select.isConnected){close();return;}
  const {select,panel}=active,rect=select.getBoundingClientRect();
  if(!rect.width||!rect.height){close();return;}
  const viewportWidth=document.documentElement.clientWidth||window.innerWidth;
  const viewportHeight=window.innerHeight;
  const maxWidth=Math.max(180,viewportWidth-20);
  const width=Math.min(Math.max(rect.width,Math.min(310,maxWidth)),maxWidth);
  panel.style.width=width+'px';
  const left=Math.max(10,Math.min(rect.left,viewportWidth-width-10));
  panel.style.left=left+'px';
  const height=panel.getBoundingClientRect().height;
  const bottomSpace=viewportHeight-rect.bottom;
  const top=bottomSpace>=Math.min(height,280)||bottomSpace>=rect.top?
   rect.bottom+7:Math.max(8,rect.top-height-7);
  panel.style.top=Math.max(8,Math.min(top,viewportHeight-Math.min(height,viewportHeight-16)-8))+'px';
 }
 function choose(index){
  if(!active)return;
  const {select}=active,option=select.options[index];
  if(!option||option.disabled)return;
  const old=select.value;
  select.selectedIndex=index;
  close();
  if(select.value!==old){
   select.dispatchEvent(new Event('input',{bubbles:true}));
   select.dispatchEvent(new Event('change',{bubbles:true}));
  }
  if(select.isConnected)try{select.focus({preventScroll:true})}catch(_){}
 }
 function open(select,keyboard=false){
  if(!isSelect(select))return;
  if(active?.select===select){close();return;}
  close();
  const portal=select.closest('dialog[open]')||document.fullscreenElement||document.body;
  const panel=document.createElement('div');
  panel.className='vertex-frost-select-popover';
  panel.id='vertexFrostSelect'+(++sequence);
  panel.setAttribute('role','listbox');
  panel.setAttribute('aria-label',select.getAttribute('aria-label')||'Scegli un elemento');
  const items=document.createElement('div');
  items.className='vertex-frost-select-items';
  const options=Array.from(select.options);
  const groups=new Map();
  options.forEach((option,index)=>{
   if(option.parentElement?.tagName==='OPTGROUP'){
    const group=option.parentElement;
    if(!groups.has(group)){
     groups.set(group,true);
     const heading=document.createElement('div');
     heading.className='vertex-frost-select-group';
     heading.textContent=group.label||'';
     items.appendChild(heading);
    }
   }
   const btn=document.createElement('button');
   btn.type='button';
   btn.className='vertex-frost-select-option'+(option.selected?' is-selected':'');
   btn.setAttribute('role','option');
   btn.setAttribute('aria-selected',String(option.selected));
   btn.setAttribute('data-option-index',index);
   btn.disabled=option.disabled||option.parentElement?.disabled||false;
   const label=document.createElement('span');
   label.textContent=option.textContent.trim();
   btn.appendChild(label);
   if(option.selected){
    const check=document.createElement('span');
    check.className='vertex-frost-select-check';
    check.textContent='✓';
    check.setAttribute('aria-hidden','true');
    btn.appendChild(check);
   }
   items.appendChild(btn);
  });
  if(options.length>16){
   const search=document.createElement('input');
   search.className='vertex-frost-select-search';
   search.type='search';
   search.placeholder='Cerca...';
   search.setAttribute('aria-label','Filtra le opzioni');
   search.addEventListener('input',()=>{
    const q=search.value.trim().toLocaleLowerCase('it');
    for(const btn of items.querySelectorAll('[data-option-index]'))
     btn.hidden=!btn.textContent.toLocaleLowerCase('it').includes(q);
    for(const heading of items.querySelectorAll('.vertex-frost-select-group')){
     let sibling=heading.nextElementSibling,visible=false;
     while(sibling&&!sibling.classList.contains('vertex-frost-select-group')){
      visible||=!sibling.hidden;sibling=sibling.nextElementSibling;
     }
     heading.hidden=!visible;
    }
    position();
   });
   panel.appendChild(search);
  }
  panel.appendChild(items);
  portal.appendChild(panel);
  active={select,panel};
  select.setAttribute('aria-expanded','true');
  select.setAttribute('aria-controls',panel.id);
  panel.addEventListener('click',e=>{
   const button=e.target.closest('[data-option-index]');
   if(button)choose(Number(button.dataset.optionIndex));
  });
  position();
  const chosen=items.querySelector('.is-selected');
  if(chosen)chosen.scrollIntoView({block:'nearest'});
  if(keyboard&&panel.querySelector('.vertex-frost-select-search'))
   panel.querySelector('.vertex-frost-select-search').focus({preventScroll:true});
 }
 document.addEventListener('pointerdown',e=>{
  const select=e.target.closest?.('select');
  if(select&&isSelect(select)){
   e.preventDefault();
   e.stopPropagation();
   lastPointer=select;
   open(select);
   return;
  }
  if(active&&!active.panel.contains(e.target))close();
 },true);
 // Suppress the subsequent native click, including on mobile WebKit.
 document.addEventListener('click',e=>{
  const select=e.target.closest?.('select');
  if(!select||!isSelect(select))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(lastPointer===select){lastPointer=null;return;}
  open(select);
 },true);
 document.addEventListener('keydown',e=>{
  if(active){
   if(e.key==='Escape'){e.preventDefault();const sel=active.select;close();sel.focus({preventScroll:true});return;}
   if(e.key==='Enter'&&e.target.closest?.('[data-option-index]')){
    e.preventDefault();choose(Number(e.target.dataset.optionIndex));return;
   }
  }
  const select=e.target.closest?.('select');
  if(!isSelect(select))return;
  if(['Enter',' ','ArrowDown','ArrowUp'].includes(e.key)){
   e.preventDefault();open(select,true);
  }
 },true);
 document.addEventListener('change',e=>{
  if(active&&e.target===active.select)close();
 },true);
 document.addEventListener('focusin',e=>{
  if(active&&e.target!==active.select&&!active.panel.contains(e.target))close();
 },true);
 window.addEventListener('scroll',()=>{if(active)position();},{passive:true,capture:true});
 window.addEventListener('resize',()=>{if(active)position();},{passive:true});
 document.addEventListener('fullscreenchange',close);
 window.__vertexFrostSelectorsReady=true;
})();
