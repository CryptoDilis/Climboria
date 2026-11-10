(() => {
  'use strict';

  // Publishable key is intended for browser use. Never place a service_role or secret key here.
  const SUPABASE_URL = 'https://unadepiwbovblkfjlksk.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5DTna9vCafWt4YEbkSSaAA_W0hEDiUK';
  const authStatus = document.getElementById('authStatus');
  const authEmailForm = document.getElementById('authEmailForm');
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const signInButton = document.getElementById('authSignIn');
  const signUpButton = document.getElementById('authSignUp');
  const signOutButton = document.getElementById('authSignOut');
  const googleButton = document.getElementById('authGoogle');
  const xButton = document.getElementById('authX');
  const guestButton = document.getElementById('authGuest');

  const setStatus = (message) => {
    if (authStatus) authStatus.textContent = message;
  };

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    setStatus('Authentication library did not load. Check your connection and reload.');
    for (const button of [signInButton, signUpButton, googleButton, xButton]) {
      if (button) button.disabled = true;
    }
    return;
  }

  const authClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  window.CLIMBORIA_AUTH = authClient;

  let currentSession = null;
  let busy = false;

  const setBusy = (value) => {
    busy = value;
    for (const button of [signInButton, signUpButton, googleButton, xButton]) {
      if (button) button.disabled = value;
    }
  };

  const friendlyError = (error, provider) => {
    const message = String(error?.message || error || 'Unknown authentication error');
    if (/provider.*not enabled|unsupported provider/i.test(message)) {
      const name = provider === 'x' ? 'X (Twitter)' : provider === 'google' ? 'Google' : provider;
      return name + ' sign-in is not enabled in the Climboria Supabase Auth provider settings yet.';
    }
    if (/captcha/i.test(message)) {
      return 'Authentication CAPTCHA is not configured correctly yet. Please try again later.';
    }
    if (/invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
    if (/email not confirmed/i.test(message)) return 'Please confirm your email using the link we sent before signing in.';
    if (/user already registered/i.test(message)) return 'This email already has an account. Use Sign In instead.';
    if (/failed to fetch|network/i.test(message)) return 'Could not reach the authentication service. Check your connection and retry.';
    return message;
  };

  const renderSession = (session) => {
    currentSession = session || null;
    if (signOutButton) signOutButton.hidden = !currentSession;
    if (!currentSession) {
      setStatus('Not signed in. Create an account or sign in to sync your Climboria profile.');
      return;
    }
    if (currentSession.user?.is_anonymous) {
      setStatus('Guest session active in this browser. Guest progress is not yet linked to an email or social account.');
      return;
    }
    const email = currentSession.user?.email || 'Climboria player';
    setStatus('Signed in as ' + email + '. Your Supabase session is active on this device.');
  };

  const confirmLeavingGuest = () => {
    if (!currentSession?.user?.is_anonymous) return true;
    return window.confirm('This is a guest account. Its progress is not linked to another login yet. Continue and switch accounts?');
  };

  const runPasswordSignIn = async () => {
    if (busy) return;
    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';
    if (!email || !password) {
      setStatus('Enter your email address and password.');
      return;
    }
    if (!confirmLeavingGuest()) return;
    setBusy(true);
    try {
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      renderSession(data.session);
    } catch (error) {
      setStatus(friendlyError(error, 'email'));
    } finally {
      setBusy(false);
    }
  };

  if (authEmailForm) {
    authEmailForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await runPasswordSignIn();
    });
  }

  if (signUpButton) {
    signUpButton.addEventListener('click', async () => {
      if (busy) return;
      const email = emailInput?.value.trim() || '';
      const password = passwordInput?.value || '';
      if (!email || !password) {
        setStatus('Enter your email address and a password to create an account.');
        return;
      }
      if (password.length < 8) {
        setStatus('Use a password with at least 8 characters.');
        return;
      }
      if (currentSession?.user?.is_anonymous) {
        setStatus('Guest-to-email account linking is not configured yet. Keep this guest session; do not create a separate account until linking is ready.');
        return;
      }
      setBusy(true);
      try {
        const { data, error } = await authClient.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: new URL('/?auth=confirmed', window.location.origin).toString() }
        });
        if (error) throw error;
        if (data.session) renderSession(data.session);
        else setStatus('Account request accepted. Check your email for the confirmation link before signing in.');
      } catch (error) {
        setStatus(friendlyError(error, 'email'));
      } finally {
        setBusy(false);
      }
    });
  }

  const startOAuth = async (provider) => {
    if (busy) return;
    if (currentSession?.user?.is_anonymous) {
      setStatus('Guest identity linking is not enabled yet. Do not switch providers until your guest progress can be linked safely.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.auth.signInWithOAuth({
        provider,
        options: { redirectTo: new URL('/?auth=callback', window.location.origin).toString() }
      });
      if (error) throw error;
      setStatus('Redirecting to ' + (provider === 'x' ? 'X' : 'Google') + ' to finish sign-in…');
    } catch (error) {
      setStatus(friendlyError(error, provider));
      setBusy(false);
    }
  };

  googleButton?.addEventListener('click', () => startOAuth('google'));
  xButton?.addEventListener('click', () => startOAuth('x'));

  // Anonymous sign-in is intentionally gated until both a Turnstile site key and
  // Supabase Auth CAPTCHA verification are configured to prevent automated user creation.
  if (guestButton) {
    guestButton.disabled = true;
    guestButton.title = 'Configure Cloudflare Turnstile and Supabase Auth CAPTCHA before enabling guest sign-in.';
  }

  signOutButton?.addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await authClient.auth.signOut({ scope: 'local' });
      if (error) throw error;
      renderSession(null);
      setStatus('Signed out on this device.');
    } catch (error) {
      setStatus(friendlyError(error, 'sign-out'));
    } finally {
      setBusy(false);
    }
  });

  authClient.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      renderSession(session);
    }
  });

  authClient.auth.getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      renderSession(data.session);
    })
    .catch((error) => setStatus(friendlyError(error, 'session')));
})();
