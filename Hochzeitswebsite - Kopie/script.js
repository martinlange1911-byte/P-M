// Hochzeitsdatum: bei Bedarf hier ändern. Format: Jahr, Monat (0 = Januar), Tag.
const weddingDate = new Date(2027, 4, 1, 13, 0, 0);
function updateCountdown(){const now=new Date();let diff=Math.max(0,weddingDate-now);const d=Math.floor(diff/86400000);diff%=86400000;const h=Math.floor(diff/3600000);diff%=3600000;const m=Math.floor(diff/60000);const s=Math.floor(diff/1000)%60;for(const [id,val] of Object.entries({days:d,hours:h,minutes:m,seconds:s})){const el=document.getElementById(id);if(el)el.textContent=String(val).padStart(2,'0')}}
updateCountdown();setInterval(updateCountdown,1000);
const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('#nav');toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'×':'☰'});nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle?.setAttribute('aria-expanded','false');if(toggle)toggle.textContent='☰'}));
const rsvpForm=document.querySelector('#rsvp-form');
if(rsvpForm){
  const rsvpEndpoint='https://script.google.com/macros/s/AKfycbygvJeJJYvs89wlR5WVIgAsPqHnO63O_5IPqN_i8Ccq31YIj9C9fnJqJXTJwBytrlv2/exec';
  const guestFields=document.querySelector('#guest-fields');
  const peopleSelect=rsvpForm.querySelector('[name="people"]');
  const addGuestButton=rsvpForm.querySelector('.add-guest');
  const submitButton=rsvpForm.querySelector('[type="submit"]');
  const status=document.querySelector('#form-status');

  function setGuestCount(count){
    while(guestFields.children.length<count){
      const fields=document.createElement('div');
      fields.className='two-fields guest-fields';
      fields.innerHTML='<label>Vorname<input name="guestFirstName" required></label><label>Nachname<input name="guestLastName" required></label>';
      guestFields.append(fields);
    }
    while(guestFields.children.length>count)guestFields.lastElementChild.remove();
    peopleSelect.value=String(count);
    addGuestButton.hidden=count>=8;
  }

  addGuestButton.addEventListener('click',()=>setGuestCount(guestFields.children.length+1));
  peopleSelect.addEventListener('change',()=>setGuestCount(Number(peopleSelect.value)));

  rsvpForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(!rsvpEndpoint){
      status.textContent='Die Online-Anmeldung ist noch nicht eingerichtet. Eure Antwort wurde nicht gespeichert.';
      return;
    }

    let responseFrame=document.querySelector('#rsvp-response-frame');
    if(!responseFrame){
      responseFrame=document.createElement('iframe');
      responseFrame.name='rsvp-response-frame';
      responseFrame.id='rsvp-response-frame';
      responseFrame.title='Rückmeldung zur Anmeldung';
      responseFrame.hidden=true;
      document.body.append(responseFrame);
    }

    let honeypot=rsvpForm.querySelector('[name="website"]');
    if(!honeypot){
      honeypot=document.createElement('input');
      honeypot.type='hidden';
      honeypot.name='website';
      rsvpForm.append(honeypot);
    }

    let requestId=rsvpForm.querySelector('[name="requestId"]');
    if(!requestId){
      requestId=document.createElement('input');
      requestId.type='hidden';
      requestId.name='requestId';
      rsvpForm.append(requestId);
    }
    requestId.value=Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(value=>value.toString(16).padStart(2,'0'))
      .join('');

    const handleResponse=event=>{
      if(event.data?.type!=='rsvp-result'||event.data.requestId!==requestId.value)return;
      window.removeEventListener('message',handleResponse);
      window.clearTimeout(responseTimeout);
      submitButton.disabled=false;
      if(event.data.ok){
        status.textContent='Vielen Dank, eure Rückmeldung wurde gespeichert. Die Seite wird in wenigen Sekunden aktualisiert.';
        window.setTimeout(()=>window.location.reload(),4000);
      }else{
        status.textContent='Die Rückmeldung konnte nicht gespeichert werden. Bitte versucht es später erneut.';
      }
    };
    window.addEventListener('message',handleResponse);
    const responseTimeout=window.setTimeout(()=>{
      window.removeEventListener('message',handleResponse);
      submitButton.disabled=false;
      status.textContent='Keine Bestätigung vom Google-Sheets-Endpunkt erhalten. Bitte prüft die Eintragung, bevor ihr erneut absendet.';
    },20000);

    submitButton.disabled=true;
    status.textContent='Eure Rückmeldung wird gespeichert …';
    rsvpForm.action=rsvpEndpoint;
    rsvpForm.target=responseFrame.name;
    rsvpForm.submit();
  });
}
