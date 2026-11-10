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
  const solanaButton = document.getElementById('authSolana');
  const ethereumButton = document.getElementById('authEthereum');
  const guestButton = document.getElementById('authGuest');

  const setStatus = (message) => {
    if (authStatus) authStatus.textContent = message;
  };

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    setStatus('Authentication library did not load. Check your connection and reload.');
    for (const button of [signInButton, signUpButton, googleButton, xButton, solanaButton, ethereumButton]) {
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
    for (const button of [signInButton, signUpButton, googleButton, xButton, solanaButton, ethereumButton]) {
      if (button) button.disabled = value;
    }
  };

  const friendlyError = (error, provider) => {
    const message = String(error?.message || error || 'Unknown authentication error');
    if (/provider.*not enabled|unsupported provider/i.test(message)) {
      const name = provider === 'x' ? 'X (Twitter)' : provider === 'google' ? 'Google' : provider === 'solana' ? 'Solana wallet' : provider === 'ethereum' ? 'Ethereum wallet' : provider;
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
    const email = currentSession.user?.email;
    const walletIdentity = (currentSession.user?.identities || []).find(identity => identity.provider === 'solana' || identity.provider === 'ethereum');
    const walletAddress = walletIdentity?.identity_data?.address || walletIdentity?.identity_data?.sub || walletIdentity?.provider_id;
    if (email) {
      setStatus('Signed in as ' + email + '. Your Supabase session is active on this device.');
    } else if (walletIdentity && walletAddress) {
      const chainName = walletIdentity.provider === 'solana' ? 'Solana' : 'Ethereum';
      const shortAddress = walletAddress.length > 14 ? walletAddress.slice(0, 6) + '…' + walletAddress.slice(-4) : walletAddress;
      setStatus('Signed in with ' + chainName + ' wallet ' + shortAddress + '. Your verified Supabase session is active on this device.');
    } else {
      setStatus('Climboria account authenticated. Your Supabase session is active on this device.');
    }
  };

  const requireSignedOut = () => {
    if (!currentSession) return true;
    if (currentSession.user?.is_anonymous) {
      setStatus('Guest progress is not linked to another login yet. Sign-in is blocked to protect this guest save until account linking is ready.');
    } else {
      setStatus('You are already signed in. Sign out on this device before switching to another Climboria account.');
    }
    return false;
  };

  const runPasswordSignIn = async () => {
    if (busy) return;
    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';
    if (!email || !password) {
      setStatus('Enter your email address and password.');
      return;
    }
    if (!requireSignedOut()) return;
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
      if (currentSession) {
        setStatus(currentSession.user?.is_anonymous
          ? 'Guest-to-email account linking is not configured yet. Keep this guest session; do not create a separate account until linking is ready.'
          : 'You are already signed in. Sign out on this device before creating a separate Climboria account.');
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
    if (!requireSignedOut()) return;
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

  const signInWithWallet = async (chain) => {
    if (busy || !requireSignedOut()) return;
    const isSolana = chain === 'solana';
    let wallet = null;
    if (isSolana) {
      wallet = window.phantom?.solana || window.solana || window.braveSolana || null;
      if (!wallet || typeof wallet.connect !== 'function') {
        setStatus('No compatible Solana wallet found. Install Phantom, Solflare, or another Solana wallet and retry.');
        return;
      }
    } else {
      const providers = Array.isArray(window.ethereum?.providers) ? window.ethereum.providers : [];
      wallet = providers.find(provider => provider.isMetaMask) || window.ethereum || null;
      if (!wallet || typeof wallet.request !== 'function') {
        setStatus('No compatible Ethereum wallet found. Install MetaMask or another EVM wallet and retry.');
        return;
      }
    }

    setBusy(true);
    try {
      if (isSolana) {
        await wallet.connect();
      } else {
        const accounts = await wallet.request({ method: 'eth_requestAccounts' });
        if (!Array.isArray(accounts) || accounts.length === 0) {
          throw new Error('The Ethereum wallet did not return an account.');
        }
      }

      const { data, error } = await authClient.auth.signInWithWeb3({
        chain,
        statement: 'I accept the Climboria Terms of Service at https://climboria.fun/terms/',
        wallet
      });
      if (error) throw error;
      if (!data.session) throw new Error('Wallet signature was verified but no Climboria session was returned.');
      renderSession(data.session);
    } catch (error) {
      setStatus(friendlyError(error, chain));
    } finally {
      setBusy(false);
    }
  };

  solanaButton?.addEventListener('click', () => signInWithWallet('solana'));
  ethereumButton?.addEventListener('click', () => signInWithWallet('ethereum'));

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
