(() => {
  'use strict';

  const SUPABASE_URL = 'https://unadepiwbovblkfjlksk.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5DTna9vCafWt4YEbkSSaAA_W0hEDiUK';
  const adapter = window.__CLIMBORIA_GAME_SAVE_ADAPTER__;
  const statusNode = document.createElement('div');
  statusNode.id = 'climboria-cloud-save-status';
  statusNode.style.cssText = 'position:fixed;left:50%;bottom:calc(12px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:1200;max-width:calc(100vw - 24px);padding:6px 11px;border:1px solid rgba(232,199,127,.35);border-radius:999px;background:rgba(7,12,20,.82);color:#e8c77f;font:600 10px/1.25 system-ui,sans-serif;letter-spacing:.04em;text-align:center;pointer-events:none;backdrop-filter:blur(8px)';
  document.body.appendChild(statusNode);

  const setStatus = (state, message) => {
    document.documentElement.dataset.climboriaCloudSave = state;
    statusNode.textContent = message;
    statusNode.dataset.state = state;
  };

  if (!window.supabase?.createClient || !adapter ||
      typeof adapter.capture !== 'function' || typeof adapter.restore !== 'function') {
    setStatus('unavailable', 'Cloud save unavailable · local progress remains on this browser');
    console.warn('[Climboria cloud save] Supabase client or game save adapter did not load.');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.__CLIMBORIA_GAME_SAVE_CLIENT = client;

  let activeUserId = null;
  let loadingUser = false;
  let ready = false;
  let blocked = false;
  let hasRemoteRow = false;
  let remoteSavedAt = null;
  let lastSnapshot = null;
  let saveInProgress = false;
  let retryAfter = 0;
  let generation = 0;

  async function saveNow(force = false) {
    if (!ready || !activeUserId || blocked || saveInProgress || Date.now() < retryAfter) return;
    const payload = adapter.capture();
    if (!payload) return;

    const serialized = JSON.stringify(payload);
    if (new TextEncoder().encode(serialized).length > 60000) {
      blocked = true;
      setStatus('size-limit', 'Cloud save too large · local progress remains on this browser');
      return;
    }
    if (!force && serialized === lastSnapshot) return;

    saveInProgress = true;
    try {
      let savedAt = null;
      if (hasRemoteRow) {
        const { data, error } = await client
          .from('player_saves')
          .update({
            schema_version: 1,
            save_data: payload,
            saved_at: new Date().toISOString()
          })
          .eq('user_id', activeUserId)
          .eq('saved_at', remoteSavedAt)
          .select('saved_at')
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          blocked = true;
          ready = false;
          setStatus('conflict', 'A newer cloud save exists on another device · reload to load the latest progress');
          return;
        }
        savedAt = data.saved_at;
      } else {
        const { data, error } = await client
          .from('player_saves')
          .insert({
            user_id: activeUserId,
            schema_version: 1,
            save_data: payload
          })
          .select('saved_at')
          .single();
        if (error) {
          if (error.code === '23505') {
            blocked = true;
            ready = false;
            setStatus('conflict', 'A cloud save was created on another device · reload to load the latest progress');
            return;
          }
          throw error;
        }
        savedAt = data.saved_at;
        hasRemoteRow = true;
      }
      remoteSavedAt = savedAt;
      lastSnapshot = serialized;
      retryAfter = 0;
      setStatus('synced', 'Cloud save · progress synced');
    } catch (error) {
      retryAfter = Date.now() + 30000;
      setStatus('error', 'Cloud save failed · local progress remains on this browser');
      console.warn('[Climboria cloud save] Save failed:', error);
    } finally {
      saveInProgress = false;
    }
  }

  async function loadForSession(session) {
    const user = session?.user;
    if (!user || user.is_anonymous) {
      // Return to the local guest backpack cache. Account-scoped backpacks remain isolated.
      adapter.setUserScope?.(null, false);
      generation++;
      activeUserId = null;
      loadingUser = false;
      ready = false;
      blocked = false;
      hasRemoteRow = false;
      remoteSavedAt = null;
      lastSnapshot = null;
      setStatus(user?.is_anonymous ? 'guest-local' : 'local-only',
        user?.is_anonymous ? 'Guest progress is local only · link an account to sync' : 'Local only · sign in to sync progress');
      return;
    }

    if (activeUserId === user.id && (loadingUser || ready || blocked)) return;
    const requestGeneration = ++generation;
    activeUserId = user.id;
    loadingUser = true;
    ready = false;
    blocked = false;
    hasRemoteRow = false;
    remoteSavedAt = null;
    lastSnapshot = null;
    setStatus('loading', 'Cloud save · loading account progress');

    try {
      const { data, error } = await client
        .from('player_saves')
        .select('schema_version,save_data,saved_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (requestGeneration !== generation) return;
      const scope = adapter.setUserScope?.(user.id, !data) || { unclaimedLocalItems: 0 };

      if (data) {
        if (data.schema_version !== 1 || !adapter.restore(data.save_data)) {
          blocked = true;
          setStatus('unsupported', 'Cloud save version unsupported · local progress was not overwritten');
          return;
        }
        hasRemoteRow = true;
        remoteSavedAt = data.saved_at;
        lastSnapshot = JSON.stringify(adapter.capture());
        setStatus('loaded', scope.unclaimedLocalItems > 0
          ? 'Cloud save loaded · separate local guest backpack preserved'
          : 'Cloud save · account progress loaded');
      } else {
        setStatus('ready', 'Cloud save ready · progress will sync when you start playing');
      }

      ready = true;
      if (!hasRemoteRow) await saveNow(true);
    } catch (error) {
      if (requestGeneration === generation) {
        ready = false;
        retryAfter = Date.now() + 30000;
        setStatus('error', 'Cloud save unavailable · local progress remains on this browser');
        console.warn('[Climboria cloud save] Load failed:', error);
      }
    } finally {
      if (requestGeneration === generation) loadingUser = false;
    }
  }

  client.auth.onAuthStateChange((event, session) => {
    // Defer Data API calls until Supabase has exited its auth-state callback.
    window.setTimeout(() => { void loadForSession(session); }, 0);
  });
  client.auth.getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      return loadForSession(data.session);
    })
    .catch(error => {
      setStatus('error', 'Cloud save session check failed · local progress remains on this browser');
      console.warn('[Climboria cloud save] Session check failed:', error);
    });

  window.addEventListener('climboria:inventory', () => {
    window.setTimeout(() => { void saveNow(); }, 500);
  });
  window.setInterval(() => { void saveNow(); }, 12000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void saveNow();
  });
  window.addEventListener('pagehide', () => { void saveNow(); });

  window.__CLIMBORIA_GAME_SAVE = {
    saveNow,
    get status() { return document.documentElement.dataset.climboriaCloudSave || 'unknown'; },
    get userId() { return activeUserId; }
  };
})();
