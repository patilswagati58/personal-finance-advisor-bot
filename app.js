(() => {
  "use strict";
  const STORE_KEY = "finora_personal_finance_v1";
  const CATEGORIES = ["Food","Transport","Shopping","Bills","Education","Health","Entertainment","Salary","Freelance","Other"];
  const CATEGORY_META = {
    Food:{icon:"◒",color:"#1b9b83"}, Transport:{icon:"↗",color:"#e9a15b"}, Shopping:{icon:"◇",color:"#8c83d8"},
    Bills:{icon:"▤",color:"#e17878"}, Education:{icon:"▱",color:"#5b9fd2"}, Health:{icon:"✚",color:"#64b6b0"},
    Entertainment:{icon:"♫",color:"#d27eac"}, Salary:{icon:"↙",color:"#1b9b83"}, Freelance:{icon:"✦",color:"#5b9fd2"}, Other:{icon:"•",color:"#9caab4"}
  };
  const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(n)||0);
  const today = () => new Date().toISOString().slice(0,10);
  const currentMonth = () => new Date().toISOString().slice(0,7);
  const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const seed = {
    budget:18000,
    transactions:[
      {id:1,name:"Monthly stipend",type:"income",amount:18000,category:"Salary",date:today(),note:"Monthly income"},
      {id:2,name:"Grocery shopping",type:"expense",amount:1850,category:"Food",date:today(),note:"Groceries"},
      {id:3,name:"Bus pass",type:"expense",amount:650,category:"Transport",date:today(),note:"Commute"},
      {id:4,name:"Internet bill",type:"expense",amount:799,category:"Bills",date:today(),note:"Monthly bill"},
      {id:5,name:"Course materials",type:"expense",amount:1200,category:"Education",date:today(),note:"Learning"},
      {id:6,name:"Coffee with friends",type:"expense",amount:350,category:"Food",date:today(),note:""},
      {id:7,name:"Freelance design",type:"income",amount:2500,category:"Freelance",date:today(),note:"Side income"},
      {id:8,name:"Skincare",type:"expense",amount:850,category:"Shopping",date:today(),note:"Personal care"}
    ],
    goals:[
      {id:101,name:"Emergency fund",target:25000,saved:7500,date:"",icon:"☂"},
      {id:102,name:"New laptop",target:60000,saved:12000,date:"",icon:"⌘"}
    ]
  };
  let state = loadState();
  let spendingChart = null, incomeExpenseChart = null, toastTimer = null;
  function loadState(){
    try { const saved=localStorage.getItem(STORE_KEY); if(saved){const parsed=JSON.parse(saved); if(parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.goals)) return parsed;} } catch(e){}
    return JSON.parse(JSON.stringify(seed));
  }
  function saveState(){ localStorage.setItem(STORE_KEY,JSON.stringify(state)); }
  function isThisMonth(t){return String(t.date||"").slice(0,7)===currentMonth();}
  function sum(list,type){return list.filter(t=>t.type===type).reduce((a,t)=>a+Number(t.amount||0),0);}
  function getTotals(all=false){
    const tx=all?state.transactions:state.transactions.filter(isThisMonth);
    const income=sum(tx,"income"), expenses=sum(tx,"expense");
    return {tx,income,expenses,net:income-expenses};
  }
  function toast(message){const el=document.getElementById("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
  function openModal(id){document.getElementById(id).classList.add("open");const first=document.querySelector(`#${id} input`);if(first)setTimeout(()=>first.focus(),60);}
  function closeModal(id){document.getElementById(id).classList.remove("open");}
  function render(){
    renderOverview();renderTransactions();renderBudget();renderGoals();renderAdvisor();renderReports();
  }
  function renderOverview(){
    const t=getTotals(); const rate=t.income>0?Math.round((t.net/t.income)*100):0;
    setText("totalBalance",money(t.net));setText("totalIncome",money(t.income));setText("totalExpenses",money(t.expenses));setText("availableSave",money(Math.max(0,t.net)));
    setText("savingsRate",`${rate}%`);setText("heroSaved",`${money(t.net)} ${t.net>=0?"saved":"deficit"}`);
    document.getElementById("savingsProgress").style.width=`${Math.max(0,Math.min(100,rate))}%`;
    setText("savingsFoot",t.income?"Your savings rate is "+rate+"%":"Add income to calculate your savings rate");
    const used=state.budget>0?Math.round(t.expenses/state.budget*100):0;
    setText("budgetUsed",`${used}%`);
    const budgetProgress=document.getElementById("budgetProgress");
    budgetProgress.style.width=`${Math.min(100,used)}%`;
    budgetProgress.style.background=used>100?"#e17878":"#1b9b83";
    const budgetFoot=state.budget>0
      ? (t.expenses>state.budget
          ? `${money(state.budget)} limit · ${money(t.expenses-state.budget)} over budget`
          : `${money(state.budget)} limit · ${money(state.budget-t.expenses)} remaining`)
      : "Set a monthly budget";
    setText("budgetFoot",budgetFoot);
    renderSpendingChart(t.tx);renderInsights(t);renderRecent();
  }
  function renderSpendingChart(tx){
    const all=document.getElementById("chartPeriod").value==="all";
    const rows=all?state.transactions:tx;
    const totals={};rows.filter(x=>x.type==="expense").forEach(x=>totals[x.category]=(totals[x.category]||0)+Number(x.amount));
    const entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]);const labels=entries.map(x=>x[0]);const values=entries.map(x=>x[1]);const colors=labels.map(x=>(CATEGORY_META[x]||CATEGORY_META.Other).color);
    const total=values.reduce((a,b)=>a+b,0);setText("chartTotal",money(total));
    const canvas=document.getElementById("spendingChart");
    if(spendingChart)spendingChart.destroy();
    spendingChart=new Chart(canvas,{type:"doughnut",data:{labels:labels.length?labels:["No expenses"],datasets:[{data:values.length?values:[1],backgroundColor:colors.length?colors:["#e9eef1"],borderWidth:0,hoverOffset:4,spacing:3,borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,cutout:"76%",plugins:{legend:{display:false},tooltip:{enabled:values.length>0,callbacks:{label:c=>`${c.label}: ${money(c.raw)}`}}}}});
    const legend=document.getElementById("chartLegend");
    legend.innerHTML=entries.length?entries.slice(0,6).map(([name,value])=>`<div class="legend-item"><span style="background:${(CATEGORY_META[name]||CATEGORY_META.Other).color}"></span>${escapeHtml(name)}<b>${money(value)}</b></div>`).join(""):`<div class="legend-item">Add an expense to see your spending breakdown.</div>`;
  }
  function renderInsights(t){
    const used=state.budget>0?t.expenses/state.budget:0;const rate=t.income>0?t.net/t.income:0;
    const cats={};t.tx.filter(x=>x.type==="expense").forEach(x=>cats[x.category]=(cats[x.category]||0)+Number(x.amount));
    const biggest=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
    const items=[];
    if(t.income===0)items.push(["＋","Start with your income","Add your income first so your cash flow and savings rate can be calculated."]);
    else if(rate>=.2)items.push(["✓","Great savings momentum",`You're keeping ${Math.round(rate*100)}% of this month's income. Keep your savings habit consistent.`]);
    else if(t.net>0)items.push(["↗","Build your savings buffer",`You have ${money(t.net)} left from entered income. Try aiming to save at least 20% when practical.`]);
    else items.push(["!","Review your cash flow","Your recorded expenses are at or above your income. Check optional spending and upcoming bills."]);
    if(state.budget<=0)items.push(["▤","Set a monthly spending limit","A realistic budget makes it easier to spot overspending before the month ends."]);
    else if(used>.9)items.push(["!","You're close to your budget",`You've used ${Math.round(used*100)}% of your monthly limit. Pause non-essential purchases if you can.`]);
    else items.push(["◈","Budget is in view",`${money(Math.max(0,state.budget-t.expenses))} of your monthly budget remains based on entries.`]);
    if(biggest)items.push(["◉",`${biggest[0]} is your top category`,`${money(biggest[1])} is recorded here. Review this category for a realistic saving opportunity.`]);
    else items.push(["✧","Track a few expenses","Add your regular spending to get useful category-level insights."]);
    document.getElementById("insightList").innerHTML=items.slice(0,3).map(i=>`<div class="insight-item"><span class="insight-symbol">${i[0]}</span><div><b>${escapeHtml(i[1])}</b><p>${escapeHtml(i[2])}</p></div></div>`).join("");
  }
  function transactionRow(t,showDelete=false){
    const meta=CATEGORY_META[t.category]||CATEGORY_META.Other;const isIncome=t.type==="income";
    return `<tr><td><div class="tx-name-cell"><span class="tx-icon" style="color:${meta.color}">${meta.icon}</span><span>${escapeHtml(t.name)}${t.note?`<small style="display:block;font-weight:400;color:#9aa7b1;margin-top:3px">${escapeHtml(t.note)}</small>`:""}</span></div></td><td>${escapeHtml(t.category)}</td>${showDelete?`<td><span class="type-pill ${isIncome?"":"expense"}">${isIncome?"Income":"Expense"}</span></td>`:""}<td>${formatDate(t.date)}</td><td class="${isIncome?"amount-income":"amount-expense"}">${isIncome?"+":"−"}${money(t.amount)}</td>${showDelete?`<td><button class="delete-btn" data-delete-tx="${t.id}" aria-label="Delete ${escapeHtml(t.name)}" title="Delete">×</button></td>`:""}</tr>`;
  }
  function renderRecent(){
    const rows=[...state.transactions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||b.id-a.id).slice(0,5);
    document.getElementById("recentRows").innerHTML=rows.length?rows.map(t=>transactionRow(t)).join(""):`<tr><td colspan="4">No transactions yet. Add your first transaction.</td></tr>`;
  }
  function renderTransactions(){
    const t=getTotals(true);setText("txIncome",money(t.income));setText("txExpenses",money(t.expenses));setText("txNet",money(t.net));
    const search=(document.getElementById("searchTransactions").value||"").toLowerCase();const type=document.getElementById("filterType").value;
    const list=[...state.transactions].filter(x=>(type==="all"||x.type===type)&&`${x.name} ${x.category} ${x.note||""}`.toLowerCase().includes(search)).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||b.id-a.id);
    document.getElementById("transactionRows").innerHTML=list.map(t=>transactionRow(t,true)).join("");
    document.getElementById("emptyTransactions").classList.toggle("hidden",list.length>0);
  }
  function categorySpent(cat){return getTotals().tx.filter(x=>x.type==="expense"&&x.category===cat).reduce((s,x)=>s+Number(x.amount),0);}
  function renderBudget(){
    const t=getTotals();const used=state.budget>0?t.expenses/state.budget:0;const pct=Math.round(used*100);
    setText("budgetAmountLarge",money(state.budget));setText("budgetRingPct",`${pct}%`);
    document.getElementById("budgetRing").style.setProperty("--progress",`${Math.min(100,Math.max(0,pct))*3.6}deg`);
    setText("budgetRemaining",state.budget>0?(t.expenses>state.budget?`${money(t.expenses-state.budget)} over your limit this month`:`${money(state.budget-t.expenses)} remaining this month`):"Add a budget to start tracking.");
    const cats=["Food","Transport","Shopping","Bills","Education","Health","Entertainment","Other"];
    const perCat=state.budget>0?state.budget/cats.length:0;
    document.getElementById("categoryBudgets").innerHTML=cats.map(cat=>{
      const spent=categorySpent(cat),p=perCat?spent/perCat*100:0,meta=CATEGORY_META[cat];
      return `<article class="category-budget"><div class="category-budget-head"><span class="category-emoji" style="color:${meta.color}">${meta.icon}</span><div><b>${cat}</b><small>${money(spent)} spent</small></div><strong>${perCat?Math.round(p)+"%":"—"}</strong></div><div class="budget-line"><span class="${p>100?"over":""}" style="width:${Math.min(100,p)}%;background:${p>100?"#e58a61":meta.color}"></span></div><div class="budget-foot"><span>${perCat?money(Math.max(0,perCat-spent))+" left":"Set a total budget"}</span><span>${perCat?money(perCat)+" planned":"No limit"}</span></div></article>`;
    }).join("");
  }
  function renderGoals(){
    const target=state.goals.reduce((s,g)=>s+Number(g.target),0),saved=state.goals.reduce((s,g)=>s+Number(g.saved),0);
    setText("goalTotalTarget",money(target));setText("goalSummaryText",state.goals.length?`${money(saved)} saved across ${state.goals.length} goal${state.goals.length===1?"":"s"} (${target?Math.round(saved/target*100):0}% of target).`:"Create your first goal to begin.");
    const icons=["☂","⌘","✈","⌂","♡","✧"];
    document.getElementById("goalsGrid").innerHTML=state.goals.length?state.goals.map((g,i)=>{const pct=Math.min(100,Math.round(g.saved/g.target*100));return `<article class="goal-card"><div class="goal-card-top"><span class="goal-art">${g.icon||icons[i%icons.length]}</span><button class="delete-btn" data-delete-goal="${g.id}" aria-label="Delete ${escapeHtml(g.name)}">×</button></div><h3>${escapeHtml(g.name)}</h3><div class="goal-date">${g.date?`Target date: ${formatDate(g.date)}`:"No target date set"}</div><div class="goal-amounts"><b>${money(g.saved)}</b><span>of ${money(g.target)}</span></div><div class="goal-progress"><span style="width:${pct}%"></span></div><div class="goal-bottom"><b>${pct}% complete</b><div class="goal-actions"><button class="small-action" data-add-savings="${g.id}">＋ Add savings</button></div></div></article>`}).join(""):`<article class="panel empty-state">No savings goals yet. Create one for a trip, emergency fund, gadget, or any future plan.</article>`;
  }
  function getHealth(t){
    const rate=t.income>0?Math.max(0,t.net/t.income):0;const used=state.budget>0?t.expenses/state.budget:null;
    let score=0;
    score+=t.income>0?20:0;score+=rate>=.2?35:rate>0?22:0;score+=used===null?0:used<=.75?25:used<=1?15:0;score+=state.transactions.filter(x=>x.type==="expense").length>=5?20:state.transactions.some(x=>x.type==="expense")?12:0;
    return {score,rate,used};
  }
  function renderAdvisor(){
    const t=getTotals();const h=getHealth(t);setText("healthScore",h.score);document.getElementById("healthMeter").style.width=h.score+"%";
    const label=h.score>=80?"Strong habits":h.score>=55?"Good start":h.score>=30?"Building habits":"Getting started";setText("healthLabel",label);
    setText("healthDescription",h.score>=80?"Your entries show positive cash flow and regular tracking. Keep your plan realistic.":h.score>=55?"You have a useful foundation. Focus on one improvement you can maintain.":"Add income, expenses, and a budget to build a more complete picture.");
    setText("healthSavings",`${Math.round(h.rate*100)}%`);setText("healthBudget",h.used===null?"Not set":h.used<=1?"Within limit":"Over limit");setText("healthTracking",state.transactions.filter(x=>x.type==="expense").length>=5?"Regular entries":state.transactions.some(x=>x.type==="expense")?"Some entries":"Getting started");
    const recs=[];const cats={};t.tx.filter(x=>x.type==="expense").forEach(x=>cats[x.category]=(cats[x.category]||0)+Number(x.amount));const biggest=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
    if(t.income<=0)recs.push(["Record your income","Add your salary, stipend, allowance, or other income. Your cash-flow summary will become more meaningful."]);
    if(t.net<0)recs.push(["Bring spending back in line",`Recorded expenses exceed income by ${money(Math.abs(t.net))}. Review upcoming bills and consider pausing optional purchases.`]);
    else if(t.income>0&&h.rate<.2)recs.push(["Try a manageable savings target",`Your recorded balance is ${money(t.net)}. If your essential costs allow it, work gradually toward saving 10–20% of income.`]);
    else if(t.income>0)recs.push(["Protect your savings habit",`Your recorded savings rate is ${Math.round(h.rate*100)}%. Consider keeping emergency savings separate from everyday spending.`]);
    if(h.used===null)recs.push(["Create a monthly budget","Choose a realistic spending limit. The budget planner divides it across categories as a simple starting point."]);
    else if(h.used>1)recs.push(["Review your budget",`You've recorded ${Math.round(h.used*100)}% of your monthly limit. Check category spending and adjust your plan if needed.`]);
    else recs.push(["Check your remaining budget",`${money(Math.max(0,state.budget-t.expenses))} remains against your recorded monthly limit. Keep some room for unexpected costs.`]);
    if(biggest)recs.push(["Review your largest category",`${biggest[0]} is currently your highest expense category at ${money(biggest[1])}. Look for a small change that doesn't affect essentials.`]);
    else recs.push(["Build a useful spending history","Record regular expenses for a clearer view of your biggest categories and recurring costs."]);
    document.getElementById("advisorRecommendations").innerHTML=recs.map((r,i)=>`<div class="recommendation"><span class="rec-number">${String(i+1).padStart(2,"0")}</span><div><b>${escapeHtml(r[0])}</b><p>${escapeHtml(r[1])}</p></div></div>`).join("");
  }
  function renderReports(){
    const t=getTotals(true);setText("reportIncome",money(t.income));setText("reportExpenses",money(t.expenses));setText("reportNet",money(t.net));setText("reportCount",state.transactions.length);
    if(incomeExpenseChart)incomeExpenseChart.destroy();
    incomeExpenseChart=new Chart(document.getElementById("incomeExpenseChart"),{type:"bar",data:{labels:["Income","Expenses","Net cash flow"],datasets:[{data:[t.income,t.expenses,t.net],backgroundColor:["#1b9b83","#e9a15b",t.net>=0?"#7b86d8":"#e17878"],borderRadius:7,maxBarThickness:45}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>money(c.raw)}}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{beginAtZero:true,grid:{color:"#edf1f3"},ticks:{font:{size:9},callback:v=>money(v)}}}}});
    const cats={};state.transactions.filter(x=>x.type==="expense").forEach(x=>cats[x.category]=(cats[x.category]||0)+Number(x.amount));const entries=Object.entries(cats).sort((a,b)=>b[1]-a[1]);const total=entries.reduce((s,x)=>s+x[1],0);
    document.getElementById("reportCategories").innerHTML=entries.length?entries.map(([cat,val])=>`<div class="report-category-row"><span class="cat-dot" style="background:${(CATEGORY_META[cat]||CATEGORY_META.Other).color}"></span><span>${escapeHtml(cat)} <small style="color:#a0acb4">· ${total?Math.round(val/total*100):0}%</small></span><b>${money(val)}</b></div>`).join(""):`<div class="report-category-empty">Add expenses to see your category report.</div>`;
  }
  function setText(id,text){document.getElementById(id).textContent=text;}
  function formatDate(d){if(!d)return "—";const date=new Date(d+"T12:00:00");return date.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}
  function navigate(target){
    document.querySelectorAll(".page-section").forEach(s=>s.classList.toggle("active",s.id===target));
    document.querySelectorAll(".nav-item[data-target]").forEach(b=>b.classList.toggle("active",b.dataset.target===target));
    const active=document.querySelector(`.nav-item[data-target="${target}"]`);setText("pageBreadcrumb",active?active.textContent.trim().replace("NEW","").trim():"Overview");
    document.getElementById("sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});
    if(target==="reports")renderReports();
  }
  document.querySelectorAll(".nav-item[data-target]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.target)));
  document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.goto)));
  document.getElementById("mobileMenu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
  document.addEventListener("click",e=>{const side=document.getElementById("sidebar");if(side.classList.contains("open")&&!side.contains(e.target)&&!e.target.closest("#mobileMenu"))side.classList.remove("open");});
  document.getElementById("quickAdd").addEventListener("click",()=>openModal("transactionModal"));
  document.getElementById("addTransactionBtn").addEventListener("click",()=>openModal("transactionModal"));
  document.getElementById("editBudgetBtn").addEventListener("click",()=>{document.getElementById("budgetInput").value=state.budget||"";openModal("budgetModal");});
  document.getElementById("editIncomeBtn").addEventListener("click",()=>{document.getElementById("incomeInput").value=getTotals().income;openModal("incomeModal");});
  document.getElementById("addGoalBtn").addEventListener("click",()=>openModal("goalModal"));
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
  document.querySelectorAll(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id);}));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal-backdrop.open").forEach(m=>closeModal(m.id));});
  document.getElementById("transactionForm").addEventListener("submit",e=>{
    e.preventDefault();const amount=Number(document.getElementById("txAmount").value);
    if(!Number.isFinite(amount)||amount<=0){toast("Enter an amount greater than zero.");return;}
    state.transactions.push({id:Date.now(),name:document.getElementById("txName").value.trim(),type:document.getElementById("txType").value,amount,category:document.getElementById("txCategory").value,date:document.getElementById("txDate").value||today(),note:document.getElementById("txNote").value.trim()});
    saveState();render();closeModal("transactionModal");e.target.reset();document.getElementById("txDate").value=today();toast("Transaction added. Your dashboard is updated.");
  });
  document.getElementById("budgetForm").addEventListener("submit",e=>{
    e.preventDefault();const amount=Number(document.getElementById("budgetInput").value);if(!Number.isFinite(amount)||amount<=0){toast("Enter a budget greater than zero.");return;}
    state.budget=amount;saveState();render();closeModal("budgetModal");toast("Monthly budget saved.");
  });
  document.getElementById("incomeForm").addEventListener("submit",e=>{
    e.preventDefault();
    const target=Number(document.getElementById("incomeInput").value);
    if(!Number.isFinite(target)||target<0){toast("Enter a valid total income (zero or more).");return;}
    const month=currentMonth();
    const monthIncome=state.transactions.filter(t=>t.type==="income"&&String(t.date||"").slice(0,7)===month);
    const salaryEntries=monthIncome.filter(t=>t.category==="Salary");
    const otherIncome=monthIncome.filter(t=>t.category!=="Salary").reduce((sum,t)=>sum+Number(t.amount||0),0);
    if(target<otherIncome){toast(`Total income must be at least ${money(otherIncome)} because other income entries are unchanged.`);return;}
    const salaryAmount=target-otherIncome;
    if(salaryEntries.length){
      const primary=salaryEntries[0];
      primary.amount=salaryAmount;
      if(salaryAmount===0)state.transactions=state.transactions.filter(t=>t.id!==primary.id);
      salaryEntries.slice(1).forEach(t=>{state.transactions=state.transactions.filter(x=>x.id!==t.id);});
    }else if(salaryAmount>0){
      state.transactions.push({id:Date.now(),name:"Monthly salary",type:"income",amount:salaryAmount,category:"Salary",date:today(),note:"Updated total monthly income"});
    }
    saveState();render();closeModal("incomeModal");toast("Total monthly income updated. Dashboard and reports refreshed.");
  });
  document.getElementById("goalForm").addEventListener("submit",e=>{
    e.preventDefault();const target=Number(document.getElementById("goalTarget").value),saved=Number(document.getElementById("goalSaved").value||0);
    if(target<=0||saved<0){toast("Please enter valid goal amounts.");return;}
    state.goals.push({id:Date.now(),name:document.getElementById("goalName").value.trim(),target,saved:Math.min(saved,target),date:document.getElementById("goalDate").value,icon:["☂","⌘","✈","⌂","♡","✧"][state.goals.length%6]});
    saveState();render();closeModal("goalModal");e.target.reset();document.getElementById("goalSaved").value=0;toast("Savings goal created.");
  });
  document.addEventListener("click",e=>{
    const delTx=e.target.closest("[data-delete-tx]");if(delTx){const id=Number(delTx.dataset.deleteTx);state.transactions=state.transactions.filter(t=>t.id!==id);saveState();render();toast("Transaction deleted.");}
    const delGoal=e.target.closest("[data-delete-goal]");if(delGoal){const id=Number(delGoal.dataset.deleteGoal);state.goals=state.goals.filter(g=>g.id!==id);saveState();render();toast("Savings goal deleted.");}
    const add=e.target.closest("[data-add-savings]");if(add){const goal=state.goals.find(g=>g.id===Number(add.dataset.addSavings));if(!goal)return;const value=prompt(`How much would you like to add to "${goal.name}"? (₹)`,"500");if(value===null)return;const amount=Number(value);if(!Number.isFinite(amount)||amount<=0){toast("Enter a valid amount greater than zero.");return;}goal.saved=Math.min(goal.target,goal.saved+amount);saveState();render();toast("Savings goal updated.");}
  });
  document.getElementById("searchTransactions").addEventListener("input",renderTransactions);
  document.getElementById("filterType").addEventListener("change",renderTransactions);
  document.getElementById("chartPeriod").addEventListener("change",()=>renderSpendingChart(getTotals().tx));
  document.getElementById("exportCsvBtn").addEventListener("click",()=>{
    const rows=[["Name","Type","Amount INR","Category","Date","Note"],...state.transactions.map(t=>[t.name,t.type,t.amount,t.category,t.date,t.note||""])];
    const csv=rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="finora-transactions.csv";a.click();URL.revokeObjectURL(url);toast("CSV report exported.");
  });
  document.getElementById("resetData").addEventListener("click",()=>{if(confirm("Reset all local entries and restore the sample demo data?")){state=JSON.parse(JSON.stringify(seed));saveState();render();toast("Demo data restored.");}});
  document.getElementById("helpBtn").addEventListener("click",()=>alert("Finora is a frontend-only demo. Add transactions, edit total monthly income, set a budget, create savings goals, and view instant reports. Data stays in this browser's local storage. No bank account or backend is connected."));
  document.getElementById("txDate").value=today();
  render();
})();