/**
 * Versioned, server-private combat checkpoint codec.
 * No browser import/export, no session IDs, no inventory or wallet state.
 * Callers must scope storage by authenticated account AND room.
 * Decoding is structural validation only; movement.join must independently
 * revalidate saved ground and collision before allowing the player to return.
 */
const idOk=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
const tick=n=>Number.isSafeInteger(n)&&n>=0;
const point=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<50000);
export function decodeCombatCheckpoint(raw,{accountId,roomId,nowMs}={}){
 if(!idOk(accountId)||typeof roomId!=='string'||!roomId||!tick(nowMs)||
    !raw||raw.version!==1||raw.accountId!==accountId||raw.roomId!==roomId||
    !tick(raw.savedAtMs)||raw.savedAtMs>nowMs||
    !Number.isInteger(raw.hp)||raw.hp<0||raw.hp>500||raw.hp%5!==0)return null;
 const timestamp=t=>t===null||(tick(t)&&t<=raw.savedAtMs);
 if(!timestamp(raw.downedAt)||!timestamp(raw.lastAttack)||!timestamp(raw.lastAttempt)||
    (raw.hp===0)!==(raw.downedAt!==null)||
    (raw.lastAttack!==null&&(raw.lastAttempt===null||raw.lastAttack>raw.lastAttempt)))return null;
 const m=raw.movement;
 if(!m||m.roomId!==roomId||!point(m.position)||
    !Number.isSafeInteger(m.stamina)||m.stamina<0||m.stamina>200000||
    typeof m.exhausted!=='boolean'||typeof m.downed!=='boolean'||m.downed!==(raw.hp===0)||
    (m.stamina===0&&!m.exhausted)||(m.exhausted&&m.stamina>=40000))return null;
 // Copy only allowed fields; no prototype or extra payload survives.
 return {version:1,accountId,roomId,savedAtMs:raw.savedAtMs,hp:raw.hp,downedAt:raw.downedAt,
  lastAttack:raw.lastAttack,lastAttempt:raw.lastAttempt,movement:{roomId,
   position:{x:m.position.x,y:m.position.y,z:m.position.z},stamina:m.stamina,
   exhausted:m.exhausted,downed:m.downed}};
}
