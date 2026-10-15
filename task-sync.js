// Browser storage is the offline cache; Netlify Database holds the online task copy.
let taskSyncReady=false, taskSyncBusy=false, taskSyncTimer;
function taskSyncStatus(message){const el=document.getElementById('task-save-status');if(el)el.textContent=message;}
function queueTaskSync(){
  localStorage.setItem('daystar.tasks.pending','1');
  taskSyncStatus('Changes saved on this device · waiting to save online.');
  clearTimeout(taskSyncTimer);taskSyncTimer=setTimeout(syncTasks,300);
}
async function syncTasks(){
  if(taskSyncBusy)return;
  if(!navigator.onLine){taskSyncStatus('Offline · task changes sync when you reconnect.');return;}
  taskSyncBusy=true;
  try{
    if(!taskSyncReady){
      const response=await fetch('/.netlify/functions/tasks',{cache:'no-store'});
      if(!response.ok)throw Error();
      const remote=await response.json();
      if(!localStorage.getItem('daystar.tasks.pending')&&Array.isArray(remote.tasks)){
        // Merge by ID: preserve commitments restored by earlier versions and local history.
        const merged=new Map(data.tasks.map(t=>[t.id,t]));
        remote.tasks.forEach(t=>merged.set(t.id,t));
        data.tasks=[...merged.values()];save();renderAll();
      }
      taskSyncReady=true;
    }
    const snapshot=JSON.stringify(data.tasks);
    const response=await fetch('/.netlify/functions/tasks',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({tasks:data.tasks})});
    if(!response.ok)throw Error();
    if(snapshot===JSON.stringify(data.tasks)){
      localStorage.removeItem('daystar.tasks.pending');
      taskSyncStatus('Tasks saved online and ready on this device.');
    }else queueTaskSync();
  }catch{
    taskSyncStatus('Task changes are on this device · online saving retries when available.');
    clearTimeout(taskSyncTimer);taskSyncTimer=setTimeout(syncTasks,30000);
  }finally{taskSyncBusy=false;}
}
window.addEventListener('online',syncTasks);
syncTasks();
