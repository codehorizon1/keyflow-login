
import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5050/api";

function getInitialPage() {
  return window.location.pathname === "/dashboard"
    ? "dashboard"
    : "login";
}

function getPasswordStrength(value) {
  if (!value) return { score: 0, label: "Not entered" };

  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  if (score <= 1) return { score: 1, label: "Weak" };
  if (score <= 2) return { score: 2, label: "Fair" };
  if (score <= 3) return { score: 3, label: "Good" };
  return { score: 4, label: "Strong" };
}

export default function App() {
  const [page, setPage] = useState(getInitialPage);
  const [authMode, setAuthMode] = useState("login");
  const [method, setMethod] = useState("email");
  const [phoneStep, setPhoneStep] = useState("number");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const strength = getPasswordStrength(password);

  function clearFeedback() {
    setError("");
    setNotice("");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function selectMethod(nextMethod) {
    setMethod(nextMethod);
    setAuthMode("login");
    setPhoneStep("number");
    clearFeedback();
  }

  function openRegistration() {
    setMethod("email");
    setAuthMode("register");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    clearFeedback();
  }

  function openLogin() {
    setAuthMode("login");
    setMethod("email");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    clearFeedback();
  }

  function goToDashboard(identifier) {
    sessionStorage.setItem("keyflow-user", identifier);
    window.history.replaceState(null, "", "/dashboard");
    setPage("dashboard");
    clearFeedback();
  }

  async function handleEmailLogin(event) {
    event.preventDefault();
    clearFeedback();

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Enter your password to continue.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to sign in.");
      }

      if (!data.user?.email) {
        throw new Error("The server returned an invalid response.");
      }

      goToDashboard(data.user.email);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to Express. Check that the backend is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    clearFeedback();

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Enter your full name.");
      return;
    }

    if (cleanName.length > 70) {
      setError("Your name must be 70 characters or fewer.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }

    if (password.length > 128) {
      setError("Your password must be 128 characters or fewer.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create your account.");
      }

      // Registration succeeds before the demo dashboard is opened.
      goToDashboard(data.user.email);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to Express. Check that the backend is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    clearFeedback();
    setNotice(
      "Google sign-in is not configured yet. OAuth credentials are required."
    );
  }

  function handlePasskey() {
    clearFeedback();
    setNotice(
      "Passkey sign-in requires WebAuthn registration and server verification."
    );
  }

  function handlePhoneContinue(event) {
    event.preventDefault();
    clearFeedback();

    const digits = phone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setPhone(digits);
    setOtp("");
    setPhoneStep("otp");
    setNotice("Demo mode: use 123456 to test. No SMS has been sent.");
  }

  function verifyDemoOtp(event) {
    event.preventDefault();
    clearFeedback();

    if (otp !== "123456") {
      setError("Incorrect demo code. Enter 123456 to continue.");
      return;
    }

    // Demonstration only; this does not verify a real mobile number.
    goToDashboard(`+91 ${phone}`);
  }

  function signOut() {
    sessionStorage.removeItem("keyflow-user");
    window.history.replaceState(null, "", "/");

    setPage("login");
    setAuthMode("login");
    setMethod("email");
    setPhoneStep("number");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    clearFeedback();
  }

  if (page === "dashboard") {
    const currentUser = sessionStorage.getItem("keyflow-user");

    if (!currentUser) {
      return (
        <main className="kf-page">
          <section className="kf-dashboard">
            <p className="kf-eyebrow">SESSION REQUIRED</p>
            <h1>Sign in to continue.</h1>
            <button
              className="kf-primary-button"
              onClick={() => {
                window.history.replaceState(null, "", "/");
                setPage("login");
              }}
            >
              <span>Back to sign in</span>
              <span>↗</span>
            </button>
          </section>
        </main>
      );
    }

    return (
      <main className="kf-page kf-dashboard-page">
        <header className="kf-header">
          <a className="kf-brand" href="/" aria-label="KEYFLOW home">
            <span className="kf-brand-mark">↗</span>
            <span>KEYFLOW</span>
          </a>
          <span className="kf-header-meta">PERSONAL WORKSPACE</span>
        </header>

        <section className="kf-dashboard">
          <div className="kf-success-mark">✓</div>
          <p className="kf-eyebrow">ACCESS CONFIRMED</p>
          <h1>You're in.</h1>
          <p className="kf-subtitle">
            Your space is ready. Welcome back.
          </p>

          <div className="kf-account-panel">
            <span className="kf-micro-label">CURRENT SESSION</span>
            <strong>{currentUser}</strong>
            <span className="kf-session-status">
              <span /> Demo session active
            </span>
          </div>

          <button
            className="kf-primary-button"
            type="button"
            onClick={signOut}
          >
            <span>Sign out</span>
            <span>↗</span>
          </button>

          <p className="kf-demo-note">KEYFLOW · Week 11 demonstration</p>
        </section>

        <footer className="kf-footer">
          <span>KEYFLOW / 001</span>
          <span>THREE CHANNELS. ONE DESTINATION.</span>
        </footer>
      </main>
    );
  }

  return (
    <main className="kf-page">
      <div className="kf-background" aria-hidden="true">
        <div className="kf-grid" />
        <div className="kf-glow kf-glow-a" />
        <div className="kf-glow kf-glow-b" />
        <div className="kf-flow-line kf-flow-a" />
        <div className="kf-flow-line kf-flow-b" />
      </div>

      <header className="kf-header">
        <a className="kf-brand" href="/" aria-label="KEYFLOW home">
          <span className="kf-brand-mark">↗</span>
          <span>KEYFLOW</span>
        </a>
        <span className="kf-header-meta">ACCESS SYSTEM / 001</span>
      </header>

      <section className="kf-workspace">
        <div className="kf-intro">
          <p className="kf-eyebrow">
            {authMode === "register"
              ? "CREATE YOUR IDENTITY"
              : "YOUR IDENTITY, YOUR WAY"}
          </p>

          <h1>
            {authMode === "register" ? (
              <>
                Your space,
                <br />
                <span>starts here.</span>
              </>
            ) : (
              <>
                Access,
                <br />
                <span>reimagined.</span>
              </>
            )}
          </h1>

          <p className="kf-subtitle">
            {authMode === "register"
              ? "Create one account. Make it yours."
              : "Choose a channel. Continue your journey."}
          </p>
        </div>

        <section className="kf-access-panel" aria-label="Account access">
          <div className="kf-panel-heading">
            <span className="kf-micro-label">
              {authMode === "register"
                ? "NEW ACCOUNT SETUP"
                : "SELECT ACCESS CHANNEL"}
            </span>

            <span className="kf-system-state">
              <span /> READY
            </span>
          </div>

          {authMode === "login" && (
            <div className="kf-channel-switch" role="group" aria-label="Sign-in method">
              <button
                type="button"
                className={`kf-channel ${method === "email" ? "active" : ""}`}
                aria-pressed={method === "email"}
                onClick={() => selectMethod("email")}
              >
                <span className="kf-channel-top">
                  <span className="kf-channel-number">01</span>
                  <span className="kf-channel-icon">✉</span>
                </span>
                <strong>Email</strong>
                <small>Password access</small>
                <span className="kf-channel-indicator" />
              </button>

              <button
                type="button"
                className={`kf-channel ${method === "google" ? "active" : ""}`}
                aria-pressed={method === "google"}
                onClick={() => selectMethod("google")}
              >
                <span className="kf-channel-top">
                  <span className="kf-channel-number">02</span>
                  <span className="kf-google-g">G</span>
                </span>
                <strong>Google</strong>
                <small>External identity</small>
                <span className="kf-channel-indicator" />
              </button>

              <button
                type="button"
                className={`kf-channel ${method === "mobile" ? "active" : ""}`}
                aria-pressed={method === "mobile"}
                onClick={() => selectMethod("mobile")}
              >
                <span className="kf-channel-top">
                  <span className="kf-channel-number">03</span>
                  <span className="kf-channel-icon">⌕</span>
                </span>
                <strong>Mobile</strong>
                <small>One-time code</small>
                <span className="kf-channel-indicator" />
              </button>
            </div>
          )}

          <div
            className="kf-active-method"
            key={`${authMode}-${method}-${phoneStep}`}
          >
            <div className="kf-active-heading">
              <div>
                <span className="kf-micro-label">
                  {authMode === "register"
                    ? "ACCOUNT SETUP"
                    : method === "email"
                      ? "CHANNEL 01"
                      : method === "google"
                        ? "CHANNEL 02"
                        : phoneStep === "number"
                          ? "CHANNEL 03"
                          : "VERIFICATION"}
                </span>

                <h2>
                  {authMode === "register"
                    ? "Create your account."
                    : method === "email"
                      ? "Continue with email."
                      : method === "google"
                        ? "Use your Google account."
                        : phoneStep === "number"
                          ? "Continue with mobile."
                          : "Verify your number."}
                </h2>
              </div>

              <span className="kf-active-arrow">↗</span>
            </div>

            {method === "email" && authMode === "login" && (
              <form className="kf-form" onSubmit={handleEmailLogin} noValidate>
                <label htmlFor="kf-email">Email address</label>
                <input
                  id="kf-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearFeedback();
                  }}
                  aria-invalid={Boolean(error)}
                  required
                />

                <div className="kf-label-row">
                  <label htmlFor="kf-password">Password</label>
                  <button
                    className="kf-text-button"
                    type="button"
                    onClick={() => {
                      clearFeedback();
                      setNotice("Password recovery is not enabled in this demo.");
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="kf-password-field">
                  <input
                    id="kf-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearFeedback();
                    }}
                    onKeyDown={(event) =>
                      setCapsLock(event.getModifierState("CapsLock"))
                    }
                    onKeyUp={(event) =>
                      setCapsLock(event.getModifierState("CapsLock"))
                    }
                    onBlur={() => setCapsLock(false)}
                    aria-invalid={Boolean(error)}
                    required
                  />

                  <button
                    type="button"
                    className="kf-show-password"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {capsLock && (
                  <p className="kf-inline-notice">Caps Lock is on.</p>
                )}

                {password && (
                  <div className="kf-strength" aria-live="polite">
                    <div className="kf-strength-bars">
                      {[1, 2, 3, 4].map((bar) => (
                        <span
                          key={bar}
                          className={
                            bar <= strength.score
                              ? `strength-${strength.score}`
                              : ""
                          }
                        />
                      ))}
                    </div>
                    <span>Password strength: {strength.label}</span>
                  </div>
                )}

                {error && <p className="kf-error" role="alert">{error}</p>}
                {notice && <p className="kf-notice" role="status">{notice}</p>}

                <button
                  className="kf-primary-button"
                  type="submit"
                  disabled={loading}
                >
                  <span>{loading ? "Checking credentials…" : "Continue securely"}</span>
                  <span>{loading ? "…" : "↗"}</span>
                </button>
              </form>
            )}

            {method === "email" && authMode === "register" && (
              <form className="kf-form kf-register-form" onSubmit={handleRegister} noValidate>
                <label htmlFor="kf-full-name">Full name</label>
                <input
                  id="kf-full-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Your full name"
                  maxLength={70}
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    clearFeedback();
                  }}
                  required
                />

                <label className="kf-spaced-label" htmlFor="kf-register-email">
                  Email address
                </label>
                <input
                  id="kf-register-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearFeedback();
                  }}
                  required
                />

                <label className="kf-spaced-label" htmlFor="kf-register-password">
                  Create password
                </label>
                <div className="kf-password-field">
                  <input
                    id="kf-register-password"
                    type={showPassword ? "text" : "password"}
                    name="new-password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearFeedback();
                    }}
                    onKeyDown={(event) =>
                      setCapsLock(event.getModifierState("CapsLock"))
                    }
                    onKeyUp={(event) =>
                      setCapsLock(event.getModifierState("CapsLock"))
                    }
                    onBlur={() => setCapsLock(false)}
                    required
                  />

                  <button
                    type="button"
                    className="kf-show-password"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {capsLock && (
                  <p className="kf-inline-notice">Caps Lock is on.</p>
                )}

                {password && (
                  <div className="kf-strength" aria-live="polite">
                    <div className="kf-strength-bars">
                      {[1, 2, 3, 4].map((bar) => (
                        <span
                          key={bar}
                          className={
                            bar <= strength.score
                              ? `strength-${strength.score}`
                              : ""
                          }
                        />
                      ))}
                    </div>
                    <span>Password strength: {strength.label}</span>
                  </div>
                )}

                <label className="kf-spaced-label" htmlFor="kf-confirm-password">
                  Confirm password
                </label>
                <div className="kf-password-field">
                  <input
                    id="kf-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirm-password"
                    autoComplete="new-password"
                    placeholder="Enter the password again"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      clearFeedback();
                    }}
                    required
                  />

                  <button
                    type="button"
                    className="kf-show-password"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {error && <p className="kf-error" role="alert">{error}</p>}

                <button
                  className="kf-primary-button"
                  type="submit"
                  disabled={loading}
                >
                  <span>{loading ? "Creating account…" : "Create account"}</span>
                  <span>{loading ? "…" : "↗"}</span>
                </button>
              </form>
            )}

            {method === "google" && authMode === "login" && (
              <div className="kf-provider-state">
                <div className="kf-provider-icon">G</div>
                <p>
                  Use an existing Google account instead of creating another
                  password.
                </p>
                {notice && <p className="kf-notice" role="status">{notice}</p>}
                <button
                  className="kf-primary-button"
                  type="button"
                  onClick={handleGoogleSignIn}
                >
                  <span>Continue with Google</span>
                  <span>↗</span>
                </button>
                <p className="kf-provider-footnote">
                  Google OAuth requires a registered client and server callback.
                </p>
              </div>
            )}

            {method === "mobile" && authMode === "login" && phoneStep === "number" && (
              <form className="kf-form" onSubmit={handlePhoneContinue} noValidate>
                <label htmlFor="kf-phone">Indian mobile number</label>
                <div className="kf-phone-field">
                  <span>🇮🇳 +91</span>
                  <input
                    id="kf-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      clearFeedback();
                    }}
                    required
                  />
                </div>
                {error && <p className="kf-error" role="alert">{error}</p>}
                {notice && <p className="kf-notice" role="status">{notice}</p>}
                <button className="kf-primary-button" type="submit">
                  <span>Continue with mobile</span>
                  <span>↗</span>
                </button>
              </form>
            )}

            {method === "mobile" && authMode === "login" && phoneStep === "otp" && (
              <form className="kf-form" onSubmit={verifyDemoOtp} noValidate>
                <div className="kf-verified-number">
                  <span className="kf-micro-label">NUMBER ENTERED</span>
                  <strong>+91 {phone}</strong>
                  <button
                    type="button"
                    className="kf-text-button"
                    onClick={() => {
                      setPhoneStep("number");
                      setOtp("");
                      clearFeedback();
                    }}
                  >
                    Change
                  </button>
                </div>

                <label htmlFor="kf-otp">Six-digit verification code</label>
                <input
                  id="kf-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="Enter demo code"
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, ""));
                    clearFeedback();
                  }}
                  required
                />

                <p className="kf-notice">
                  Demo only: enter <strong>123456</strong>. No SMS is sent.
                </p>
                {error && <p className="kf-error" role="alert">{error}</p>}

                <button className="kf-primary-button" type="submit">
                  <span>Verify number</span>
                  <span>↗</span>
                </button>

                <button
                  type="button"
                  className="kf-back-button"
                  onClick={() => {
                    setPhoneStep("number");
                    setOtp("");
                    clearFeedback();
                  }}
                >
                  ← Use a different number
                </button>
              </form>
            )}

            {method === "email" && (
              <div className="kf-auth-switch">
                {authMode === "login" ? (
                  <>
                    <span>New to KEYFLOW?</span>
                    <button type="button" onClick={openRegistration}>
                      Create new account <span>↗</span>
                    </button>
                  </>
                ) : (
                  <>
                    <span>Already have an account?</span>
                    <button type="button" onClick={openLogin}>
                      Sign in instead <span>↗</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="kf-privacy-line">
          <span className="kf-privacy-icon">◇</span>
          <span>
            {authMode === "register"
              ? "Your details are used for this demo account."
              : "Designed with privacy and clarity in mind."}
          </span>
        </div>
      </section>

      <footer className="kf-footer">
        <span>KEYFLOW / 001</span>
        <span>THREE CHANNELS. ONE DESTINATION.</span>
        <span>WEEK 11 PROJECT</span>
      </footer>
    </main>
  );
}
