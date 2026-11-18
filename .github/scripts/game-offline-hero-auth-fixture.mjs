/** 
 * Offline browser smoke fixture for GLB rendering/creator UX ONLY.
 * The injected fake getUser is never shipped to the Game; do NOT treat any
 * result as real Supabase login, cloud-save or two-account room acceptance.
 */
export async function installOfflineHeroAuthFixture(page) {
 await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0',route=>
  route.fulfill({status:200,contentType:'application/javascript',
   body:`window.supabase={createClient:()=>({auth:{
     getUser:async()=>({data:{user:{id:'00000000-0000-4000-8000-000000000123',is_anonymous:false,app_metadata:{provider:'email'}}},error:null}),
     onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
   }})};`
  })
 );
}
