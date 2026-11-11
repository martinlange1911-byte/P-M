// Hochzeitsdatum: bei Bedarf hier ändern. Format: Jahr, Monat (0 = Januar), Tag.
const weddingDate = new Date(2027, 4, 1, 13, 0, 0);
const rsvpEndpoint='https://script.google.com/macros/s/AKfycbwi1miaoCvyIvfzl5DPToH9yf1G2nynuUIk6jXwqRU6njCv5kTJoED4NG4E_htHfsQ/exec';
const authBuild='2026-11-02-1';
function updateCountdown(){const now=new Date();let diff=Math.max(0,weddingDate-now);const d=Math.floor(diff/86400000);diff%=86400000;const h=Math.floor(diff/3600000);diff%=3600000;const m=Math.floor(diff/60000);const s=Math.floor(diff/1000)%60;for(const [id,val] of Object.entries({days:d,hours:h,minutes:m,seconds:s})){const el=document.getElementById(id);if(el)el.textContent=String(val).padStart(2,'0')}}
updateCountdown();setInterval(updateCountdown,1000);
const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('#nav');toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'×':'☰'});nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle?.setAttribute('aria-expanded','false');if(toggle)toggle.textContent='☰'}));
const rsvpForm=document.querySelector('#rsvp-form');
if(rsvpForm){
  const guestFields=document.querySelector('#guest-fields');
  const submitButton=rsvpForm.querySelector('[type="submit"]');
  const status=document.querySelector('#form-status');

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
      }else if(event.data.alreadySubmitted){
        status.textContent='Mit diesem persönlichen Kennwort wurde bereits eine Rückmeldung abgegeben. Falls noch etwas korrigiert werden muss, meldet euch bitte bei uns 😊';
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

const passwordForm=document.querySelector('#password-form');
const accessStorageKey='wedding-personalized-access';
const passwordStatus=document.querySelector('#password-status');

function showAuthenticatedSite(access, persist=true){
  if(!access||typeof access.password!=='string'||!Array.isArray(access.guests))return false;
  if(!access.admin&&(!access.guests.length
      ||access.guests.some(guest=>!guest.firstName||typeof guest.lastName!=='string')))return false;
  if(persist){
    try{
      sessionStorage.setItem(accessStorageKey,JSON.stringify(access));
    }catch(error){
      console.error('Die Anmeldung konnte nicht für diese Sitzung gespeichert werden.',error);
      passwordStatus.textContent='Die Anmeldung ist aktiv, bleibt aber nach einem Neuladen nicht gespeichert.';
    }
  }
  document.body.classList.add('authenticated');
  if(access.admin){
    rsvpForm.hidden=true;
    const adminNotice=document.createElement('p');
    adminNotice.className='admin-rsvp-note';
    adminNotice.textContent='Ihr seid mit dem Admin-Passwort angemeldet. Für die Rückmeldung bitte den individuellen Gäste-Code verwenden.';
    rsvpForm.before(adminNotice);
    return true;
  }

  const guestFields=document.querySelector('#guest-fields');
  guestFields.replaceChildren();
  access.guests.forEach(guest=>{
    const fields=document.createElement('div');
    fields.className='guest-fields';
    const nameLabel=document.createElement('label');
    nameLabel.className='guest-name';
    nameLabel.textContent='Name';
    const nameInput=document.createElement('input');
    nameInput.name='guestName';
    nameInput.autocomplete='name';
    nameInput.required=true;
    nameInput.readOnly=true;
    nameInput.value=[guest.firstName,guest.lastName].filter(Boolean).join(' ');
    nameLabel.append(nameInput);

    const attendanceButton=document.createElement('button');
    attendanceButton.type='button';
    attendanceButton.className='attendance-toggle is-coming';
    attendanceButton.setAttribute('aria-pressed','true');
    attendanceButton.setAttribute('aria-label',`${nameInput.value}: kommt. Status ändern.`);
    attendanceButton.innerHTML='<span class="attendance-switch" aria-hidden="true"><span></span></span><span class="attendance-state">Kommt</span><span class="attendance-hint">Ändern</span>';
    const attendanceInput=document.createElement('input');
    attendanceInput.type='hidden';
    attendanceInput.name='attendance';
    attendanceInput.value='Ja, wir kommen';
    attendanceButton.addEventListener('click',()=>{
      const isComing=attendanceInput.value!=='Ja, wir kommen';
      attendanceInput.value=isComing?'Ja, wir kommen':'Leider verhindert';
      attendanceButton.querySelector('.attendance-state').textContent=isComing?'Kommt':'Kommt nicht';
      attendanceButton.classList.toggle('is-coming',isComing);
      attendanceButton.classList.toggle('is-not-coming',!isComing);
      attendanceButton.setAttribute('aria-pressed',String(isComing));
      attendanceButton.setAttribute('aria-label',`${nameInput.value}: ${isComing?'kommt':'kommt nicht'}. Status ändern.`);
    });

    fields.append(nameLabel,attendanceButton,attendanceInput);
    guestFields.append(fields);
  });
  let guestCount=rsvpForm.querySelector('[name="people"]');
  if(!guestCount){
    guestCount=document.createElement('input');
    guestCount.type='hidden';
    guestCount.name='people';
    rsvpForm.append(guestCount);
  }
  guestCount.value=String(access.guests.length);

  let accessPassword=rsvpForm.querySelector('[name="accessPassword"]');
  if(!accessPassword){
    accessPassword=document.createElement('input');
    accessPassword.type='hidden';
    accessPassword.name='accessPassword';
    rsvpForm.append(accessPassword);
  }
  accessPassword.value=access.password;
  return true;
}

if(passwordForm){
  const savedAccess=sessionStorage.getItem(accessStorageKey);
  if(savedAccess){
    try{
      if(!showAuthenticatedSite(JSON.parse(savedAccess),false)){
        sessionStorage.removeItem(accessStorageKey);
      }
    }catch(error){
      console.error('Die gespeicherte Anmeldung ist ungültig.',error);
      sessionStorage.removeItem(accessStorageKey);
    }
  }

  passwordForm.addEventListener('submit',event=>{
    event.preventDefault();
    const passwordInput=passwordForm.querySelector('[name="password"]');
    const submitButton=passwordForm.querySelector('[type="submit"]');
    let responseFrame=document.querySelector('#rsvp-response-frame');
    if(!responseFrame){
      responseFrame=document.createElement('iframe');
      responseFrame.name='rsvp-response-frame';
      responseFrame.id='rsvp-response-frame';
      responseFrame.title='Antwort der Passwortprüfung';
      responseFrame.hidden=true;
      document.body.append(responseFrame);
    }

    let requestId=passwordForm.querySelector('[name="requestId"]');
    if(!requestId){
      requestId=document.createElement('input');
      requestId.type='hidden';
      requestId.name='requestId';
      passwordForm.append(requestId);
    }
    requestId.value=Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(value=>value.toString(16).padStart(2,'0'))
      .join('');

    const handleResponse=response=>{
      if(response.data?.type!=='rsvp-result'||response.data.requestId!==requestId.value)return;
      window.removeEventListener('message',handleResponse);
      window.clearTimeout(responseTimeout);
      submitButton.disabled=false;
      if(response.data.authBuild!==authBuild){
        passwordStatus.textContent='Die veröffentlichte Passwortprüfung ist veraltet. Bitte aktualisiert die Google-Apps-Script-Bereitstellung.';
      }else if(response.data.ok&&showAuthenticatedSite({
        password:passwordInput.value,
        admin:Boolean(response.data.admin),
        guests:Array.isArray(response.data.guests)?response.data.guests:[]
      })){
        passwordStatus.textContent='';
      }else if(!response.data.ok){
        passwordStatus.textContent='Scheinbar hast du dich vertippt. Überprüfe nochmal dein persönliches Kennwort.';
      }else{
        passwordStatus.textContent='Scheinbar hast du dich vertippt. Überprüfe nochmal dein persönliches Kennwort.';
      }
    };
    window.addEventListener('message',handleResponse);
    const responseTimeout=window.setTimeout(()=>{
      window.removeEventListener('message',handleResponse);
      submitButton.disabled=false;
      passwordStatus.textContent='Keine Bestätigung vom Google-Sheets-Endpunkt erhalten. Bitte versucht es später erneut.';
    },20000);

    submitButton.disabled=true;
    passwordStatus.textContent='Gleich gehts weiter...';
    passwordForm.action=rsvpEndpoint;
    passwordForm.target=responseFrame.name;
    passwordForm.submit();
  });
}
