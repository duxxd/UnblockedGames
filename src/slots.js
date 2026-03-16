export class Slots {

constructor(containerId){

this.container = document.getElementById(containerId);

this.canvas = document.createElement("canvas");
this.ctx = this.canvas.getContext("2d");

this.container.appendChild(this.canvas);

this.width = 600;
this.height = 450;

this.canvas.width = this.width;
this.canvas.height = this.height;


// SYMBOL WEIGHTS (rarity)

this.symbolWeights = [
{symbol:"🍒", weight:35},
{symbol:"🍋", weight:25},
{symbol:"🍀", weight:15},
{symbol:"🔔", weight:12},
{symbol:"💎", weight:8},
{symbol:"7️⃣", weight:5}
];

this.symbols = this.symbolWeights.map(s=>s.symbol);

this.reelCount = 3;
this.reels = [];

this.spinning=false;

this.credits=200;

this.bet=10;

this.betOptions=[5,10,20,50];

this.lastWin=0;

this.jackpot=1000;

this.winFlash=0;

this.initReels();

this.boundClick=this.handleClick.bind(this);

}


// ---------------- SYMBOL GENERATION ----------------

buildPool(){

const pool=[];

this.symbolWeights.forEach(s=>{
for(let i=0;i<s.weight;i++){
pool.push(s.symbol);
}
});

return pool;

}

getRandomSymbols(count){

const pool=this.buildPool();
const res=[];

for(let i=0;i<count;i++){
res.push(pool[Math.floor(Math.random()*pool.length)]);
}

return res;

}


// ---------------- REELS ----------------

initReels(){

this.reels=[];

for(let i=0;i<this.reelCount;i++){

this.reels.push({

symbols:this.getRandomSymbols(30),

offset:0,
speed:0,

velocity:0,

stopping:false,
stopped:true,

targetOffset:null

});

}

}


// ---------------- START ----------------

start(){

this.canvas.addEventListener("click",this.boundClick);

this.lastTime=performance.now();

this.update();

}


// ---------------- CLICK HANDLER ----------------

handleClick(e){

const rect=this.canvas.getBoundingClientRect();

const x=e.clientX-rect.left;
const y=e.clientY-rect.top;


// spin button

if(x>200 && x<400 && y>360 && y<420){
this.spin();
}


// bet buttons

this.betOptions.forEach((b,i)=>{

const bx=150+(i*70);
const by=310;

if(
!this.spinning &&
x>bx &&
x<bx+60 &&
y>by &&
y<by+35 &&
b<=this.credits
){
this.bet=b;
}

});

}


// ---------------- SPIN ----------------

spin(){

if(this.spinning || this.credits<this.bet) return;

this.credits-=this.bet;

this.jackpot+=Math.floor(this.bet*0.1);

this.spinning=true;

this.lastWin=0;

this.reels.forEach((reel,i)=>{

reel.speed=30+Math.random()*5;

reel.velocity=0;

reel.stopping=false;

reel.stopped=false;

reel.targetOffset=null;

setTimeout(()=>{
reel.stopping=true;
},800+(i*500));

});

}


// ---------------- UPDATE LOOP ----------------

update(){

const now=performance.now();

const dt=now-this.lastTime;

this.lastTime=now;

if(this.spinning){

let allStopped=true;

this.reels.forEach(reel=>{

if(reel.stopping){

if(reel.targetOffset===null){

reel.targetOffset=Math.ceil(reel.offset/100)*100+300;

reel.velocity=reel.speed;

}

const tension=0.04;
const damping=0.85;

const displacement=reel.targetOffset-reel.offset;

reel.velocity+=displacement*tension;

reel.velocity*=damping;

reel.offset+=reel.velocity;

if(Math.abs(reel.velocity)<0.2 && Math.abs(displacement)<0.5){

reel.offset=reel.targetOffset;

reel.velocity=0;

reel.stopped=true;

}

}

else{

reel.offset+=reel.speed;

}

if(!reel.stopped) allStopped=false;

});

if(allStopped){

this.spinning=false;

this.checkWin();

}

}

if(this.winFlash>0){
this.winFlash--;
}

this.draw();

this.requestId=requestAnimationFrame(()=>this.update());

}


// ---------------- WIN CHECK ----------------

checkWin(){

const results=this.reels.map(reel=>{

let step=Math.floor(reel.offset/100);

let index=(reel.symbols.length-(step%reel.symbols.length))%reel.symbols.length;

return reel.symbols[index];

});

const [r1,r2,r3]=results;

let payout=0;


// jackpot

if(r1==="7️⃣" && r2==="7️⃣" && r3==="7️⃣"){

payout=this.jackpot;

this.jackpot=1000;

}


// 3 matches

else if(r1===r2 && r2===r3){

if(r1==="💎") payout=this.bet*25;
else if(r1==="🔔") payout=this.bet*15;
else if(r1==="🍀") payout=this.bet*10;
else if(r1==="🍋") payout=this.bet*5;
else if(r1==="🍒") payout=this.bet*4;

}


// 2 matches

else if(r1===r2 || r2===r3){

payout=this.bet*2;

}

if(payout>0){

this.lastWin=payout;

this.credits+=payout;

this.winFlash=20;

}

}


// ---------------- DRAW ----------------

draw(){

this.ctx.fillStyle="#1a1a1a";
this.ctx.fillRect(0,0,this.width,this.height);


// frame

this.ctx.fillStyle="#2d2d2d";

this.ctx.fillRect(50,50,500,250);


// reels

const reelWidth=120;
const reelHeight=200;

const startX=100;
const startY=75;

const centerY=startY+reelHeight/2;

this.ctx.save();

this.ctx.beginPath();

this.ctx.rect(startX,startY,reelWidth*3+40,reelHeight);

this.ctx.clip();

this.reels.forEach((reel,i)=>{

const x=startX+i*(reelWidth+20);

this.ctx.fillStyle="#eee";
this.ctx.fillRect(x,startY,reelWidth,reelHeight);

this.ctx.font="60px Arial";
this.ctx.textAlign="center";
this.ctx.textBaseline="middle";

for(let j=-2;j<=2;j++){

let step=Math.floor(reel.offset/100);

let index=(reel.symbols.length-(step%reel.symbols.length)+j)%reel.symbols.length;

if(index<0) index+=reel.symbols.length;

const symbol=reel.symbols[index];

const y=centerY+(reel.offset%100)+(j*100);

this.ctx.fillText(symbol,x+reelWidth/2,y);

}

});

this.ctx.restore();


// win line

this.ctx.strokeStyle="red";
this.ctx.lineWidth=4;

this.ctx.beginPath();

this.ctx.moveTo(startX-10,centerY);
this.ctx.lineTo(startX+reelWidth*3+50,centerY);

this.ctx.stroke();


// flash

if(this.winFlash>0){

this.ctx.fillStyle="rgba(255,255,0,0.2)";
this.ctx.fillRect(50,50,500,250);

}


// top hud

this.ctx.fillStyle="#fbbf24";
this.ctx.font="bold 20px Arial";

this.ctx.textAlign="left";

this.ctx.fillText(`COINS: ${this.credits}`,50,35);

this.ctx.textAlign="center";

this.ctx.fillText(`JACKPOT: ${this.jackpot}`,300,35);


if(this.lastWin>0){

this.ctx.fillStyle="#10b981";

this.ctx.fillText(`WIN +${this.lastWin}`,300,60);

}


// spin button

this.ctx.fillStyle=this.spinning?"#555":"#ef4444";

this.ctx.fillRect(200,360,200,60);

this.ctx.fillStyle="white";

this.ctx.font="bold 24px Arial";

this.ctx.fillText("SPIN",300,398);


// bet buttons

this.ctx.font="16px Arial";

this.betOptions.forEach((b,i)=>{

const bx=150+(i*70);
const by=310;

const active=this.bet===b;

const disabled=this.spinning || b>this.credits;

this.ctx.fillStyle=
disabled?"#555":
active?"#22c55e":
"#3b82f6";

this.ctx.fillRect(bx,by,60,35);

this.ctx.fillStyle="white";

this.ctx.fillText(b,bx+30,by+22);

});

}


// ---------------- STOP ----------------

stop(){

if(this.requestId) cancelAnimationFrame(this.requestId);

this.canvas.removeEventListener("click",this.boundClick);

this.container.innerHTML="";

}

}