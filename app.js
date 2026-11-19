(() => {
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "dayflow.activities.v1";
  const PROFILE_KEY = "dayflow.profile.v1";
  const THEME_KEY = "dayflow.theme.v1";
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const parseDate = (value) => { const [y,m,d] = value.split("-").map(Number); return new Date(y,m-1,d); };
  const formatDate = (value, opts={weekday:"long",day:"numeric",month:"long"}) => parseDate(value).toLocaleDateString("fr-FR",opts);
  const escapeHTML = (s="") => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let activities = loadActivities();
  let calendarDate = new Date();
  let calendarMode = "month";
  let statsRange = 7;
  let activeDate = todayISO();
  const reminded = new Set();
  let toastTimer;

  function loadActivities(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(activities)); renderAll(); }
  function notify(message){ const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2500); }
  function getToday(){ return activities.filter(a=>a.date===todayISO()).sort((a,b)=>a.start.localeCompare(b.start)); }
  function priorityRank(p){ return ({Urgent:0,"Élevé":1,Moyen:2,Faible:3})[p] ?? 4; }
  function categoryClass(c){ return c==="Personnel"?"Personnel":c; }
  function empty(message="Aucune activité pour le moment."){ return `<div class="empty-state"><strong>Tout est calme ici ✦</strong>${escapeHTML(message)}</div>`; }
  function openModal(item=null){
    $("activityForm").reset(); $("activityId").value=item?.id||"";
    $("modalTitle").textContent=item?"Modifier l'activité":"Nouvelle activité";
    $("activityTitle").value=item?.title||""; $("activityDescription").value=item?.description||"";
    $("activityDate").value=item?.date||activeDate||todayISO(); $("activityStart").value=item?.start||"09:00";
    $("activityEnd").value=item?.end||"10:00"; $("activityPriority").value=item?.priority||"Moyen";
    $("activityCategory").value=item?.category||"Personnel"; $("activityReminder").value=String(item?.reminder ?? 15);
    $("activityModal").classList.add("open"); $("activityModal").setAttribute("aria-hidden","false"); $("activityTitle").focus();
  }
  function closeModal(){ $("activityModal").classList.remove("open"); $("activityModal").setAttribute("aria-hidden","true"); }
  function editActivity(id){ const item=activities.find(a=>a.id===id); if(item) openModal(item); }
  function deleteActivity(id){ if(!confirm("Supprimer cette activité ?")) return; activities=activities.filter(a=>a.id!==id); save(); notify("Activité supprimée."); }
  function toggleActivity(id){ const a=activities.find(x=>x.id===id); if(a){a.done=!a.done;save();notify(a.done?"Activité terminée !":"Activité remise à faire.");} }
  function taskActions(a){return `<div class="task-actions"><button class="action-button" data-edit="${a.id}" title="Modifier">✎</button><button class="action-button" data-delete="${a.id}" title="Supprimer">×</button></div>`;}
  function scheduleItem(a){return `<div class="schedule-item ${a.done?"done":""}"><span class="schedule-time">${escapeHTML(a.start)}</span><i class="schedule-line" style="background:${a.category==="Travail"?"var(--blue)":a.category==="Études"?"var(--orange)":a.category==="Santé"?"var(--green)":"var(--purple)"}"></i><div class="schedule-info"><strong>${escapeHTML(a.title)}</strong><small>${escapeHTML(a.category)} · ${escapeHTML(a.start)} – ${escapeHTML(a.end)}</small></div><button class="mini-check" data-toggle="${a.id}" title="Marquer comme terminée">${a.done?"✓":"○"}</button></div>`;}
  function renderDashboard(){
    const list=getToday(), done=list.filter(a=>a.done).length, pct=list.length?Math.round(done/list.length*100):0;
    $("totalMetric").textContent=list.length; $("doneMetric").textContent=done; $("pendingMetric").textContent=list.length-done; $("rateMetric").textContent=pct+"%";
    $("progressPercent").textContent=pct+"%"; $("progressRing").style.setProperty("--progress",pct+"%");
    $("heroDate").textContent=formatDate(todayISO(),{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    $("dashboardSchedule").innerHTML=list.length?list.slice(0,5).map(scheduleItem).join(""):empty("Ajoutez votre première activité pour construire votre programme.");
    const priorities=activities.filter(a=>!a.done).sort((a,b)=>priorityRank(a.priority)-priorityRank(b.priority)||a.date.localeCompare(b.date)||a.start.localeCompare(b.start)).slice(0,4);
    $("priorityList").innerHTML=priorities.length?priorities.map(a=>`<div class="priority-item"><i class="priority-dot" style="background:${a.priority==="Urgent"?"var(--red)":a.priority==="Élevé"?"var(--orange)":"var(--purple)"}"></i><strong>${escapeHTML(a.title)}</strong><small>${escapeHTML(a.priority)}</small></div>`).join(""):empty("Aucune priorité en attente.");
  }
  function renderDay(){
    $("dayDate").textContent=formatDate(activeDate,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    const list=activities.filter(a=>a.date===activeDate).sort((a,b)=>a.start.localeCompare(b.start));
    $("daySchedule").innerHTML=list.length?list.map(a=>`<div class="timeline-row"><div class="timeline-hour">${escapeHTML(a.start)}</div><div class="timeline-track"></div><div class="timeline-card" style="border-color:${a.category==="Travail"?"var(--blue)":a.category==="Études"?"var(--orange)":a.category==="Santé"?"var(--green)":"var(--purple)"}"><div class="task-actions">${taskActions(a)}</div><strong>${escapeHTML(a.title)} ${a.done?"✓":""}</strong><p>${escapeHTML(a.description||a.category)} · Jusqu'à ${escapeHTML(a.end)}</p><span class="pill ${escapeHTML(a.priority)}">${escapeHTML(a.priority)}</span></div></div>`).join(""):empty("Aucune activité planifiée à cette date.");
  }
  function renderTasks(){
    const q=$("taskSearch").value.toLowerCase(), status=$("statusFilter").value, priority=$("priorityFilter").value;
    const list=activities.filter(a=>(a.title+" "+a.description+" "+a.category).toLowerCase().includes(q)&&(status==="all"||(status==="done"?a.done:status==="progress"?(!a.done&&a.date===todayISO()&&a.start<=new Date().toTimeString().slice(0,5)&&a.end>new Date().toTimeString().slice(0,5)):!a.done))&&(priority==="all"||a.priority===priority)).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
    $("tasksList").innerHTML=list.length?list.map(a=>`<div class="task-row ${a.done?"is-done":""}"><input class="task-check" type="checkbox" data-toggle="${a.id}" ${a.done?"checked":""} aria-label="Terminer ${escapeHTML(a.title)}"><div class="task-main"><strong>${escapeHTML(a.title)}</strong><p>${formatDate(a.date,{day:"numeric",month:"short"})} · ${escapeHTML(a.start)}–${escapeHTML(a.end)} · ${escapeHTML(a.category)}</p></div><span class="pill ${escapeHTML(a.priority)}">${escapeHTML(a.priority)}</span>${taskActions(a)}</div>`).join(""):empty("Aucune tâche ne correspond à votre recherche.");
  }
  function renderCalendar(){
    const y=calendarDate.getFullYear(),m=calendarDate.getMonth();
    $("monthLabel").textContent=calendarMode==="day"?formatDate(activeDate,{weekday:"long",day:"numeric",month:"long"}):calendarMode==="week"?"Semaine du "+formatDate(weekStart(calendarDate),{day:"numeric",month:"long"}):calendarDate.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
    document.querySelectorAll("[data-calendar-view]").forEach(b=>b.classList.toggle("active",b.dataset.calendarView===calendarMode));
    const days=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
    let dates=[];
    if(calendarMode==="day") dates=[activeDate];
    else if(calendarMode==="week"){const d=weekStart(calendarDate);dates=Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(x.getDate()+i);return isoDate(x);});}
    else {
      const first=new Date(y,m,1),last=new Date(y,m+1,0),offset=(first.getDay()+6)%7;
      dates=Array(offset).fill(null);
      for(let day=1;day<=last.getDate();day++)dates.push(`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`);
      while(dates.length%7)dates.push(null);
    }
    const head=calendarMode==="day"?[]:days.map(d=>`<div class="calendar-cell calendar-day-name">${d}</div>`);
    const cells=dates.map(date=>{
      if(!date)return '<div class="calendar-cell"></div>';
      const events=activities.filter(a=>a.date===date).sort((a,b)=>a.start.localeCompare(b.start));
      const dayNum=parseDate(date).getDate();
      return `<div class="calendar-cell ${calendarMode!=="month"?"calendar-expanded":""}"><button class="calendar-number ${date===todayISO()?"today":""}" data-date="${date}" title="Afficher cette journée">${dayNum}</button>${events.map(a=>`<button class="calendar-event ${escapeHTML(categoryClass(a.category))}" data-edit="${a.id}" title="${escapeHTML(a.title)}">${escapeHTML(a.start)} ${escapeHTML(a.title)}</button>`).join("")}<button class="action-button calendar-add" data-calendar-add="${date}" title="Ajouter une activité à cette date">＋</button></div>`;
    });
    $("calendarGrid").innerHTML=head.concat(cells).join("");
  }
  function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function weekStart(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
  function renderStats(){
    const done=activities.filter(a=>a.done).length,total=activities.length,pct=total?Math.round(done/total*100):0;
    $("statsTotal").textContent=total;$("statsDone").textContent=done;$("statsRate").textContent=pct+"%";
    document.querySelectorAll("[data-range]").forEach(b=>b.classList.toggle("active",Number(b.dataset.range)===statsRange));
    const days=[];for(let i=statsRange-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const iso=isoDate(d);days.push({label:statsRange===7?d.toLocaleDateString("fr-FR",{weekday:"short"}).replace(".",""):d.getDate()+"/"+(d.getMonth()+1),count:activities.filter(a=>a.date===iso&&a.done).length});}
    const max=Math.max(1,...days.map(d=>d.count));
    $("weeklyChart").innerHTML=days.map(d=>`<div class="bar-column"><b>${d.count}</b><div class="bar" style="height:${Math.max(3,d.count/max*125)}px"></div><small>${d.label}</small></div>`).join("");
    const hours=activities.filter(a=>a.done).reduce((sum,a)=>{const [sh,sm]=a.start.split(":").map(Number),[eh,em]=a.end.split(":").map(Number);return sum+(eh*60+em-sh*60-sm)/60;},0);
    $("statsHours").textContent=hours.toFixed(1)+" h";
    $("statsAdvice").textContent=total===0?"Commencez par planifier une petite tâche réalisable.":pct>=75?`Excellent travail ! Vous avez terminé ${done} activité(s), soit environ ${hours.toFixed(1)} heure(s) planifiée(s). Pensez à prévoir des pauses.`:"Choisissez une tâche importante et accordez-lui un créneau sans distraction.";
  }
  function renderAll(){renderDashboard();renderDay();renderTasks();renderCalendar();renderStats();}
  function switchView(view){
    document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+view));
    document.querySelectorAll(".nav-link[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    const labels={dashboard:"Tableau de bord",day:"Ma journée",tasks:"Mes tâches",calendar:"Calendrier",stats:"Statistiques",assistant:"Assistant IA",settings:"Paramètres"};
    $("currentSection").textContent=labels[view]||"Tableau de bord";
    $("sidebar").classList.remove("open"); window.scrollTo({top:0,behavior:"smooth"});
    if(view==="tasks")renderTasks();
  }
  function assistantReply(question){
    const q=question.toLowerCase(), pending=activities.filter(a=>!a.done).sort((a,b)=>priorityRank(a.priority)-priorityRank(b.priority)||a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
    if(q.includes("priorit")||q.includes("organis")){
      if(!pending.length)return "Vous n'avez aucune tâche en attente. Ajoutez une activité et je vous aiderai à définir vos priorités.";
      return "Voici un ordre conseillé : "+pending.slice(0,5).map((a,i)=>`${i+1}. ${a.title} (${a.priority}, ${formatDate(a.date,{day:"numeric",month:"short"})} à ${a.start})`).join(" · ")+". Commencez par la tâche urgente ou la plus importante, puis regroupez les petites tâches.";
    }
    if(q.includes("bilan")||q.includes("journée")){const today=getToday(),done=today.filter(a=>a.done).length;return `Aujourd'hui : ${done} activité(s) terminée(s) sur ${today.length}. ${today.length&&done===today.length?"Bravo, tout est accompli !":"Identifiez ce qui reste essentiel et reportez le reste sans culpabiliser."}`;}
    if(q.includes("conseil")||q.includes("productiv"))return "Essayez la méthode 25/5 : concentrez-vous pendant 25 minutes sur une seule tâche, puis prenez 5 minutes de pause. Commencez par votre priorité la plus importante et gardez une marge entre deux activités.";
    return "Je peux vous aider à organiser vos priorités, faire le bilan de votre journée ou partager un conseil de productivité. Pour des recommandations plus précises, ajoutez vos activités dans DAYFLOW.";
  }
  function addAssistantMessage(text,isUser=false){const box=$("assistantMessages"),el=document.createElement("div");el.className="assistant-bubble"+(isUser?" user":"");el.textContent=text;box.appendChild(el);box.scrollTop=box.scrollHeight;}
  function askAssistant(text){if(!text.trim())return;addAssistantMessage(text,true);addAssistantMessage(assistantReply(text));$("assistantInput").value="";}
  function requestNotifications(){
    if(!("Notification" in window)){notify("Ce navigateur ne prend pas en charge les notifications.");return;}
    Notification.requestPermission().then(permission=>notify(permission==="granted"?"Notifications activées.":"Autorisation des notifications refusée."));
  }
  function checkReminders(){
    if(!("Notification" in window)||Notification.permission!=="granted")return;
    const now=new Date();
    activities.filter(a=>!a.done&&a.reminder>0).forEach(a=>{
      const start=new Date(`${a.date}T${a.start}:00`);
      const trigger=new Date(start.getTime()-a.reminder*60000);
      const key=a.id+"|"+a.date+"|"+a.start;
      if(now>=trigger&&now<start&& !reminded.has(key)){
        new Notification("DAYFLOW · Rappel",{body:`${a.title} commence à ${a.start}.`,tag:key});
        reminded.add(key);
      }
    });
  }
  function applyTheme(){document.body.classList.toggle("dark",localStorage.getItem(THEME_KEY)==="dark");$("themeToggle").textContent=document.body.classList.contains("dark")?"☀":"☾";}
  function toggleTheme(){localStorage.setItem(THEME_KEY,document.body.classList.contains("dark")?"light":"dark");applyTheme();}
  function initProfile(){const name=localStorage.getItem(PROFILE_KEY)||"Adebayo";$("welcomeName").textContent=name;$("profileName").textContent=name;$("profileButton").textContent=name.charAt(0).toUpperCase();$("nameSetting").value=name;}
  document.addEventListener("click",e=>{
    const nav=e.target.closest("[data-view]");if(nav)switchView(nav.dataset.view);
    const go=e.target.closest("[data-go]");if(go)switchView(go.dataset.go);
    if(e.target.closest("[data-add]"))openModal();
    const edit=e.target.closest("[data-edit]");if(edit)editActivity(edit.dataset.edit);
    const del=e.target.closest("[data-delete]");if(del)deleteActivity(del.dataset.delete);
    const toggle=e.target.closest("[data-toggle]");if(toggle)toggleActivity(toggle.dataset.toggle);
    const date=e.target.closest("[data-date]");if(date){activeDate=date.dataset.date;calendarDate=parseDate(activeDate);if(e.target.closest("[data-date]")&&e.target.closest("[data-calendar-view]")){} switchView("day");renderDay();}
    const calAdd=e.target.closest("[data-calendar-add]");if(calAdd){activeDate=calAdd.dataset.calendarAdd;openModal();}
    const calView=e.target.closest("[data-calendar-view]");if(calView){calendarMode=calView.dataset.calendarView;if(calendarMode==="day")activeDate=isoDate(calendarDate);renderCalendar();}
    const range=e.target.closest("[data-range]");if(range){statsRange=Number(range.dataset.range);renderStats();}
    const suggestion=e.target.closest("[data-suggestion]");if(suggestion)askAssistant(suggestion.dataset.suggestion);
  });
  function findNextSlot(item){
    const duration=(t)=>{const [h,m]=t.split(":").map(Number);return h*60+m;};
    const mins=(n)=>`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
    const length=duration(item.end)-duration(item.start);
    const busy=activities.filter(a=>a.id!==item.id&&a.date===item.date).sort((a,b)=>a.start.localeCompare(b.start));
    let candidate=duration(item.end);
    for(const a of busy){const st=duration(a.start),en=duration(a.end);if(candidate+length<=st)break;if(candidate<en&&candidate+length>st)candidate=en;}
    return candidate+length<=1440?{start:mins(candidate),end:mins(candidate+length)}:null;
  }
  $("activityForm").addEventListener("submit",e=>{
    e.preventDefault();const start=$("activityStart").value,end=$("activityEnd").value;
    if(end<=start){notify("L'heure de fin doit être après l'heure de début.");return;}
    const id=$("activityId").value||crypto.randomUUID();
    const item={id,title:$("activityTitle").value.trim(),description:$("activityDescription").value.trim(),date:$("activityDate").value,start,end,category:$("activityCategory").value,priority:$("activityPriority").value,reminder:Number($("activityReminder").value)||0,done:activities.find(a=>a.id===id)?.done||false};
    const conflict=activities.find(a=>a.id!==id&&a.date===item.date&&item.start<a.end&&item.end>a.start);
    if(conflict){
      const slot=findNextSlot(item);
      const message=slot?`Chevauchement avec « ${conflict.title} ». Voulez-vous déplacer cette activité au prochain créneau libre (${slot.start}–${slot.end}) ?\nChoisissez Annuler pour modifier vous-même l'horaire.`:`Chevauchement avec « ${conflict.title} ». Aucun créneau libre n'a été trouvé aujourd'hui. Enregistrer quand même ?`;
      if(!confirm(message))return;
      if(slot){item.start=slot.start;item.end=slot.end;}
    }
    const index=activities.findIndex(a=>a.id===id);if(index>=0)activities[index]=item;else activities.push(item);
    activeDate=item.date;save();closeModal();notify(index>=0?"Activité modifiée.":"Activité ajoutée.");
  });
  $("closeModal").onclick=closeModal;$("cancelModal").onclick=closeModal;
  $("activityModal").addEventListener("click",e=>{if(e.target===$("activityModal"))closeModal();});
  $("themeToggle").onclick=toggleTheme;$("settingsTheme").onclick=toggleTheme;$("enableNotifications").onclick=requestNotifications;
  $("mobileMenu").onclick=()=>$("sidebar").classList.toggle("open");
  $("todayButton").onclick=()=>{activeDate=todayISO();renderDay();};
  $("prevMonth").onclick=()=>{if(calendarMode==="day")calendarDate.setDate(calendarDate.getDate()-1);else if(calendarMode==="week")calendarDate.setDate(calendarDate.getDate()-7);else calendarDate.setMonth(calendarDate.getMonth()-1);activeDate=isoDate(calendarDate);renderCalendar();};
  $("nextMonth").onclick=()=>{if(calendarMode==="day")calendarDate.setDate(calendarDate.getDate()+1);else if(calendarMode==="week")calendarDate.setDate(calendarDate.getDate()+7);else calendarDate.setMonth(calendarDate.getMonth()+1);activeDate=isoDate(calendarDate);renderCalendar();};
  $("calendarToday").onclick=()=>{calendarDate=new Date();activeDate=todayISO();renderCalendar();};
  ["taskSearch","statusFilter","priorityFilter"].forEach(id=>$(id).addEventListener("input",renderTasks));
  $("askAssistant").onclick=()=>askAssistant($("assistantInput").value);
  $("assistantInput").addEventListener("keydown",e=>{if(e.key==="Enter")askAssistant($("assistantInput").value);});
  $("saveName").onclick=()=>{const name=$("nameSetting").value.trim()||"Mon espace";localStorage.setItem(PROFILE_KEY,name);initProfile();notify("Profil mis à jour.");};
  $("profileButton").onclick=()=>switchView("settings");
  $("clearData").onclick=()=>{if(confirm("Effacer définitivement toutes les activités enregistrées dans ce navigateur ?")){activities=[];save();notify("Toutes les activités ont été effacées.");}};
  $("todayLabel").textContent=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}).toUpperCase();
  initProfile();applyTheme();renderAll();checkReminders();setInterval(checkReminders,30000);
  if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
})();