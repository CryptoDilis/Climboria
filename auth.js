(() => {
  'use strict';

  // Publishable key is intended for browser use. Never place a service_role or secret key here.
  const SUPABASE_URL = 'https://unadepiwbovblkfjlksk.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5DTna9vCafWt4YEbkSSaAA_W0hEDiUK';
  // Use the exact site root so email, OAuth, and Web3 flows share one allow-listed origin URL.
  const AUTH_REDIRECT_URL = new URL('/', window.location.origin).toString();
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
  const authTitle = document.getElementById('authTitle');
  const authIntro = document.getElementById('authIntro');
  const authEmailSection = document.getElementById('authEmailSection');
  const authConnections = document.getElementById('authConnections');
  const authConnectionSummary = document.getElementById('authConnectionSummary');
  const authWalletStatus = document.getElementById('authWalletStatus');

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
  // A wallet connected in the browser is NOT a Supabase-linked identity.
  // Never store an unverified wallet address as a verified user account link.
  let connectedWallet = null;
  let connectedWalletUserId = null;
  const linkedProviders = () => new Set(
    (currentSession?.user?.identities || []).map(identity => identity.provider)
  );
  const hasLinkedSocial = provider => {
    const providers = linkedProviders();
    return provider === 'x' ? providers.has('x') || providers.has('twitter')
      : providers.has(provider);
  };
  const buttonLabel = (button, message) => {
    const label = button?.querySelector('span');
    if (label) label.textContent = message;
  };

  const setBusy = (value) => {
    busy = value;
    for (const button of [signInButton, signUpButton, googleButton, xButton, solanaButton, ethereumButton]) {
      if (button) button.disabled = value ||
        ((button === googleButton || button === xButton) &&
          !!currentSession && !currentSession.user?.is_anonymous &&
          hasLinkedSocial(button === googleButton ? 'google' : 'x'));
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
    if (/wallet does not have a compatible|signMessage\(\)|publicKey\.toBase58\(\)/i.test(message)) {
      return 'This wallet cannot sign a Supabase login challenge. Choose a compatible Phantom/Solflare wallet. Email sign-in never needs a wallet signature.';
    }
    if (/manual linking.*disabled|manual.*link.*not.*enabled/i.test(message)) {
      return 'Account linking needs to be enabled in the Climboria Supabase Auth settings. Your current account has not been changed.';
    }
    if (/identity.*already.*linked|already linked to.*user/i.test(message)) {
      return 'That Google or X identity is already linked to another account. Your current Climboria session was not switched.';
    }
    if (/failed to fetch|network/i.test(message)) return 'Could not reach the authentication service. Check your connection and retry.';
    return message;
  };

  const renderSession = (session) => {
    const priorId = currentSession?.user?.id || null;
    currentSession = session || null;
    const user = currentSession?.user;
    const userId = user?.id || null;
    if (priorId !== userId) {
      connectedWallet = null;
      connectedWalletUserId = null;
    }
    const signedIn = !!user;
    const guest = !!user?.is_anonymous;
    const account = signedIn && !guest;

    if (signOutButton) signOutButton.hidden = !signedIn;
    document.querySelectorAll('[data-open-auth]').forEach(button => {
      button.textContent = account ? 'MY ACCOUNT' :
        guest ? 'GUEST ACCOUNT' : 'SIGN IN / CREATE ACCOUNT';
    });
    if (authEmailSection) authEmailSection.hidden = signedIn;
    if (authConnections) authConnections.hidden = !account;
    if (authTitle) authTitle.textContent = account ? 'Your Climboria account' : 'Enter Climboria';
    if (authIntro) authIntro.textContent = account
      ? 'Keep your email session while connecting another login provider or wallet.'
      : 'Email, Google, X and wallet sign-in are separate choices. Email sign-in never requires a wallet signature.';

    for (const button of [googleButton,xButton,solanaButton,ethereumButton]) {
      if (button) button.hidden = guest;
    }
    buttonLabel(googleButton, account ? 'Link Google to this account' : 'Continue with Google / Gmail');
    buttonLabel(xButton, account ? 'Link X to this account' : 'Continue with X');
    buttonLabel(solanaButton, account ? 'Connect Solana wallet (session only)' : 'Sign in with Solana wallet');
    buttonLabel(ethereumButton, account ? 'Connect Ethereum wallet (session only)' : 'Sign in with Ethereum wallet');
    if (googleButton) googleButton.disabled = busy || (account && hasLinkedSocial('google'));
    if (xButton) xButton.disabled = busy || (account && hasLinkedSocial('x'));

    if (authConnectionSummary) {
      const linked = linkedProviders();
      const methods = [];
      if (user?.email) methods.push('Email');
      if (linked.has('google')) methods.push('Google');
      if (linked.has('x') || linked.has('twitter')) methods.push('X');
      if (linked.has('solana')) methods.push('Solana identity');
      if (linked.has('ethereum')) methods.push('Ethereum identity');
      authConnectionSummary.textContent = account
        ? 'Supabase identities on this account: ' + (methods.join(' · ') || 'Account authenticated') + '.'
        : '';
    }
    if (authWalletStatus) {
      authWalletStatus.textContent = account && connectedWallet && connectedWalletUserId === userId
        ? connectedWallet.chain + ' wallet connected: ' + connectedWallet.address +
          '. Browser connection only; it is NOT permanently linked to your account.'
        : 'No wallet connected here. Connecting will not switch your email account or permanently link a wallet.';
    }

    if (!signedIn) {
      setStatus('Not signed in. Use email/password, social login or a compatible wallet signer.');
    } else if (guest) {
      setStatus('Guest session active. Linking to other login methods is not enabled yet; your guest save stays protected.');
    } else {
      setStatus('Signed in as ' + (user.email || 'Climboria account') +
        '. Connect a wallet without signing in again, or link Google/X to keep this account.');
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
          options: { emailRedirectTo: AUTH_REDIRECT_URL }
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
    const signedInUser = currentSession?.user;
    if (signedInUser?.is_anonymous) {
      setStatus('Guest-to-account linking is not enabled yet. Keep the guest session to protect its save.');
      return;
    }
    if (signedInUser && hasLinkedSocial(provider)) {
      setStatus((provider === 'google' ? 'Google' : 'X') + ' is already linked to this Climboria account.');
      return;
    }
    setBusy(true);
    try {
      if (signedInUser) {
        // Never sign in with OAuth while another account is active. The server
        // must confirm the current user before an OAuth account link can begin.
        if (typeof authClient.auth.getUser !== 'function' ||
            typeof authClient.auth.linkIdentity !== 'function') {
          throw new Error('This Supabase client does not support secure identity linking.');
        }
        const { data: verified, error: verificationError } = await authClient.auth.getUser();
        if (verificationError) throw verificationError;
        if (!verified?.user || verified.user.id !== signedInUser.id) {
          throw new Error('The current account could not be verified. Sign in again before linking.');
        }
        const { error } = await authClient.auth.linkIdentity({
          provider, options: { redirectTo: AUTH_REDIRECT_URL }
        });
        if (error) throw error;
        setStatus('Continue in ' + (provider === 'google' ? 'Google' : 'X') +
          ' to LINK it to this existing account. We will confirm the link after Supabase redirects back.');
      } else {
        const { error } = await authClient.auth.signInWithOAuth({
          provider, options: { redirectTo: AUTH_REDIRECT_URL }
        });
        if (error) throw error;
        setStatus('Redirecting to ' + (provider === 'x' ? 'X' : 'Google') + ' to finish sign-in…');
      }
    } catch (error) {
      setStatus(friendlyError(error, provider));
      setBusy(false);
    }
  };

  googleButton?.addEventListener('click', () => startOAuth('google'));
  xButton?.addEventListener('click', () => startOAuth('x'));

  const signInWithWallet = async (chain) => {
    if (busy) return;
    if (currentSession?.user?.is_anonymous) {
      setStatus('Guest-to-wallet linking is not enabled. Keep your guest save until the verified linking flow is ready.');
      return;
    }
    const isSolana = chain === 'solana';
    // Choose the actual Solana provider, not window.phantom's wrapper.
    // Supabase Web3 sign-in requires signMessage() + publicKey.toBase58().
    const solanaProviders = [
      window.phantom?.solana, window.solana, window.braveSolana,
      window.solflare, window.backpack?.solana
    ].filter(Boolean);
    const solanaWallet = solanaProviders.find(p => typeof p.connect === 'function' &&
      typeof p.signMessage === 'function' && typeof p.publicKey?.toBase58 === 'function') ||
      solanaProviders.find(p => typeof p.connect === 'function');
    const ethereumProviders = Array.isArray(window.ethereum?.providers) ? window.ethereum.providers : [];
    const ethereumWallet = ethereumProviders.find(p => p.isMetaMask) ||
      window.ethereum || null;
    const wallet = isSolana ? solanaWallet : ethereumWallet;
    if (!wallet || (isSolana ? typeof wallet.connect !== 'function' : typeof wallet.request !== 'function')) {
      setStatus(isSolana
        ? 'No compatible Solana wallet detected. Open in Phantom, Solflare or another compatible wallet browser.'
        : 'No EVM wallet detected. Install MetaMask or another compatible wallet.');
      return;
    }

    const originalUserId = currentSession?.user?.id || null;
    if (!originalUserId && !requireSignedOut()) return;
    setBusy(true);
    try {
      let address;
      if (isSolana) {
        const result = await wallet.connect();
        const publicKey = wallet.publicKey || result?.publicKey;
        address = typeof publicKey?.toBase58 === 'function'
          ? publicKey.toBase58() : typeof publicKey?.toString === 'function'
          ? publicKey.toString() : '';
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
          throw new Error('The wallet did not provide a valid Solana address.');
        }
        if (!originalUserId &&
            (typeof wallet.signMessage !== 'function' ||
             typeof wallet.publicKey?.toBase58 !== 'function')) {
          throw new Error('Wallet does not have a compatible signMessage() and publicKey.toBase58() API');
        }
      } else {
        const accounts = await wallet.request({ method: 'eth_requestAccounts' });
        address = Array.isArray(accounts) ? accounts[0] : null;
        if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
          throw new Error('The EVM wallet did not provide a valid Ethereum address.');
        }
      }

      if (originalUserId) {
        // This is a wallet *connection*, not a permanent account identity.
        // No signInWithWeb3, updateUser({data:...}), or unverified DB write.
        if (currentSession?.user?.id !== originalUserId) {
          throw new Error('Your login changed during wallet connection. Reopen account settings and retry.');
        }
        connectedWallet = { chain: isSolana ? 'Solana' : 'Ethereum', address };
        connectedWalletUserId = originalUserId;
        renderSession(currentSession);
        setStatus(connectedWallet.chain + ' wallet connected without changing your email login. ' +
          'Permanent account linking requires a separate signed, server-verified ownership check.');
        return;
      }

      const { data, error } = await authClient.auth.signInWithWeb3({
        chain, statement: 'Sign in to Climboria.', wallet
      });
      if (error) throw error;
      if (!data?.session) throw new Error('Wallet signature returned no Climboria session.');
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
