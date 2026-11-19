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
  let activeDate = todayISO();
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
    $("activityCategory").value=item?.category||"Personnel";
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
    const list=activities.filter(a=>(a.title+" "+a.description+" "+a.category).toLowerCase().includes(q)&&(status==="all"||(status==="done"?a.done:!a.done))&&(priority==="all"||a.priority===priority)).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
    $("tasksList").innerHTML=list.length?list.map(a=>`<div class="task-row ${a.done?"is-done":""}"><input class="task-check" type="checkbox" data-toggle="${a.id}" ${a.done?"checked":""} aria-label="Terminer ${escapeHTML(a.title)}"><div class="task-main"><strong>${escapeHTML(a.title)}</strong><p>${formatDate(a.date,{day:"numeric",month:"short"})} · ${escapeHTML(a.start)}–${escapeHTML(a.end)} · ${escapeHTML(a.category)}</p></div><span class="pill ${escapeHTML(a.priority)}">${escapeHTML(a.priority)}</span>${taskActions(a)}</div>`).join(""):empty("Aucune tâche ne correspond à votre recherche.");
  }
  function renderCalendar(){
    const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0);
    $("monthLabel").textContent=calendarDate.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
    const offset=(first.getDay()+6)%7, cells=[];
    ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].forEach(d=>cells.push(`<div class="calendar-cell calendar-day-name">${d}</div>`));
    for(let i=0;i<offset;i++) cells.push(`<div class="calendar-cell"></div>`);
    for(let day=1;day<=last.getDate();day++){
      const date=`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const events=activities.filter(a=>a.date===date).sort((a,b)=>a.start.localeCompare(b.start));
      cells.push(`<div class="calendar-cell"><div class="calendar-number ${date===todayISO()?"today":""}">${day}</div>${events.slice(0,3).map(a=>`<div class="calendar-event ${escapeHTML(categoryClass(a.category))}" title="${escapeHTML(a.title)}">${escapeHTML(a.start)} ${escapeHTML(a.title)}</div>`).join("")}${events.length>3?`<small class="muted">+${events.length-3} autres</small>`:""}<button class="action-button" data-date="${date}" title="Ajouter à cette date">＋</button></div>`);
    }
    $("calendarGrid").innerHTML=cells.join("");
  }
  function renderStats(){
    const done=activities.filter(a=>a.done).length,total=activities.length,pct=total?Math.round(done/total*100):0;
    $("statsTotal").textContent=total;$("statsDone").textContent=done;$("statsRate").textContent=pct+"%";
    const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;days.push({label:d.toLocaleDateString("fr-FR",{weekday:"short"}).replace(".",""),count:activities.filter(a=>a.date===iso&&a.done).length});}
    const max=Math.max(1,...days.map(d=>d.count));
    $("weeklyChart").innerHTML=days.map(d=>`<div class="bar-column"><b>${d.count}</b><div class="bar" style="height:${Math.max(3,d.count/max*125)}px"></div><small>${d.label}</small></div>`).join("");
    $("statsAdvice").textContent=total===0?"Commencez par planifier une petite tâche réalisable.":pct>=75?"Excellent travail ! Votre régularité porte ses fruits. Pensez à prévoir des pauses.": "Choisissez une tâche importante et accordez-lui un créneau sans distraction.";
  }
  function renderAll(){renderDashboard();renderDay();renderTasks();renderCalendar();renderStats();}
  function switchView(view){
    document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+view));
    document.querySelectorAll(".nav-link[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    document.querySelectorAll(".mobile-bottom-nav [data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
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
    const date=e.target.closest("[data-date]");if(date){activeDate=date.dataset.date;switchView("day");renderDay();}
    const suggestion=e.target.closest("[data-suggestion]");if(suggestion)askAssistant(suggestion.dataset.suggestion);
  });
  $("activityForm").addEventListener("submit",e=>{
    e.preventDefault();const start=$("activityStart").value,end=$("activityEnd").value;
    if(end<=start){notify("L'heure de fin doit être après l'heure de début.");return;}
    const id=$("activityId").value||crypto.randomUUID();
    const item={id,title:$("activityTitle").value.trim(),description:$("activityDescription").value.trim(),date:$("activityDate").value,start,end,category:$("activityCategory").value,priority:$("activityPriority").value,done:activities.find(a=>a.id===id)?.done||false};
    const conflict=activities.find(a=>a.id!==id&&a.date===item.date&&item.start<a.end&&item.end>a.start);
    if(conflict&&!confirm(`Attention : chevauchement avec « ${conflict.title} ». Enregistrer quand même ?`))return;
    const index=activities.findIndex(a=>a.id===id);if(index>=0)activities[index]=item;else activities.push(item);
    activeDate=item.date;save();closeModal();notify(index>=0?"Activité modifiée.":"Activité ajoutée.");
  });
  $("closeModal").onclick=closeModal;$("cancelModal").onclick=closeModal;
  $("activityModal").addEventListener("click",e=>{if(e.target===$("activityModal"))closeModal();});
  $("themeToggle").onclick=toggleTheme;$("settingsTheme").onclick=toggleTheme;
  $("mobileMenu").onclick=()=>$("sidebar").classList.toggle("open");
  $("todayButton").onclick=()=>{activeDate=todayISO();renderDay();};
  $("prevMonth").onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar();};
  $("nextMonth").onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar();};
  $("calendarToday").onclick=()=>{calendarDate=new Date();renderCalendar();};
  ["taskSearch","statusFilter","priorityFilter"].forEach(id=>$(id).addEventListener("input",renderTasks));
  $("askAssistant").onclick=()=>askAssistant($("assistantInput").value);
  $("assistantInput").addEventListener("keydown",e=>{if(e.key==="Enter")askAssistant($("assistantInput").value);});
  $("saveName").onclick=()=>{const name=$("nameSetting").value.trim()||"Mon espace";localStorage.setItem(PROFILE_KEY,name);initProfile();notify("Profil mis à jour.");};
  $("profileButton").onclick=()=>switchView("settings");
  $("clearData").onclick=()=>{if(confirm("Effacer définitivement toutes les activités enregistrées dans ce navigateur ?")){activities=[];save();notify("Toutes les activités ont été effacées.");}};
  $("todayLabel").textContent=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}).toUpperCase();
  initProfile();applyTheme();renderAll();
  if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
})();