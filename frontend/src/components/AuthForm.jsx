import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthForm = ({ mode = 'login', onModeChange }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signUpStep, setSignUpStep] = useState('form'); // 'form' | 'verify' | 'lecturer' | 'details' | 'passcode'
  const [verificationCode, setVerificationCode] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // New state for OTP
  const [signUpForm, setSignUpForm] = useState({ email: '', password: '' });
  const [signUpError, setSignUpError] = useState('');
  const [lecturerForm, setLecturerForm] = useState({ fullName: '', token: '' });
  const [lecturerError, setLecturerError] = useState('');
  const [lecturerLoading, setLecturerLoading] = useState(false);
  const [lecturerDetails, setLecturerDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [passcode, setPasscode] = useState(['', '', '', '', '', '']); // 6-digit passcode
  const [passcodeError, setPasscodeError] = useState('');
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  // New state for two-step login
  const [loginStep, setLoginStep] = useState('login'); // 'login' | 'passcode'
  const [loginSession, setLoginSession] = useState(null); // Store temp session info if needed
  // New state for passcode reset flow
  const [resetStep, setResetStep] = useState(null); // null | 'email' | 'code' | 'newpasscode' | 'done'
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPasscode, setResetPasscode] = useState(['', '', '', '', '', '']);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const isLogin = mode === 'login';
  
  const config = {
    login: {
      title: 'Welcome back',
      subtitle: 'Login with your Apple or Google account',
      submitButton: 'Login',
      switchText: "Don't have an account?",
      switchLink: 'Sign up',
      switchMode: 'signup'
    },
    signup: {
      title: 'Sign Up',
      subtitle: 'Sign up with your Apple or Google account',
      submitButton: 'Continue',
      switchText: 'Already have an account?',
      switchLink: 'Sign in',
      switchMode: 'login'
    }
  };

  const currentConfig = config[mode];

  const handleSwitchMode = () => {
    if (onModeChange) {
      onModeChange(currentConfig.switchMode);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Handle sign up form submit
  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    // Simple validation (you can expand this)
    if (!signUpForm.email || !signUpForm.password) {
      setSignUpError('All fields are required.');
      return;
    }
    setSignUpError('');
    setSignUpStep('verify');
    // Here you would trigger sending the verification code to the email
  };

  // Handle verification code submit
  const handleVerifySubmit = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;
    // Here you would verify the code (simulate success for now)
    setSignUpStep('lecturer');
  };

  // Handler for OTP input
  const handleOtpChange = (e, idx) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (!value) {
      // If empty, clear this box
      setOtp((prev) => {
        const newOtp = [...prev];
        newOtp[idx] = '';
        return newOtp;
      });
      return;
    }
    if (value.length === 1) {
      setOtp((prev) => {
        const newOtp = [...prev];
        newOtp[idx] = value;
        return newOtp;
      });
      // Move to next input
      if (idx < 5) {
        const nextInput = document.getElementById(`otp-${idx + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      if (otp[idx] === '') {
        if (idx > 0) {
          const prevInput = document.getElementById(`otp-${idx - 1}`);
          if (prevInput) prevInput.focus();
        }
      } else {
        setOtp((prev) => {
          const newOtp = [...prev];
          newOtp[idx] = '';
          return newOtp;
        });
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      const prevInput = document.getElementById(`otp-${idx - 1}`);
      if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      const nextInput = document.getElementById(`otp-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handler for lecturer info submit
  const handleLecturerSubmit = async (e) => {
    e.preventDefault();
    if (!lecturerForm.fullName || !lecturerForm.token) {
      setLecturerError('All fields are required.');
      return;
    }
    setLecturerError('');
    setLecturerLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/lecturer/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lecturerForm.fullName,
          token: lecturerForm.token,
        }),
      });
      const data = await res.json();
      setLecturerLoading(false);
      if (data.valid) {
        // Fetch lecturer details
        await fetchLecturerDetails(data.lecturerId);
      } else {
        setLecturerError(data.error || 'Validation failed.');
      }
    } catch (err) {
      setLecturerLoading(false);
      setLecturerError('Server error. Please try again.');
    }
  };

  // Fetch lecturer details
  const fetchLecturerDetails = async (lecturerId) => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/lecturer/${lecturerId}/details`);
      const data = await res.json();
      setDetailsLoading(false);
      if (res.ok) {
        setLecturerDetails(data);
        setSignUpStep('details');
      } else {
        setLecturerError(data.error || 'Failed to fetch lecturer details.');
      }
    } catch (err) {
      setDetailsLoading(false);
      setLecturerError('Server error. Please try again.');
    }
  };

  // Handler for passcode input (similar to OTP)
  const handlePasscodeChange = (e, idx) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (!value) {
      setPasscode((prev) => {
        const newPasscode = [...prev];
        newPasscode[idx] = '';
        return newPasscode;
      });
      return;
    }
    if (value.length === 1) {
      setPasscode((prev) => {
        const newPasscode = [...prev];
        newPasscode[idx] = value;
        return newPasscode;
      });
      // Move to next input (fix: use correct ID for both login and signup passcode forms)
      if (idx < 5) {
        // Determine which block we're in
        const nextInput = document.getElementById(
          mode === 'signup' && signUpStep === 'passcode'
            ? `passcode-${idx + 1}`
            : `login-passcode-${idx + 1}`
        );
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handlePasscodeKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      if (passcode[idx] === '') {
        if (idx > 0) {
          const prevInput = document.getElementById(
            mode === 'signup' && signUpStep === 'passcode'
              ? `passcode-${idx - 1}`
              : `login-passcode-${idx - 1}`
          );
          if (prevInput) prevInput.focus();
        }
      } else {
        setPasscode((prev) => {
          const newPasscode = [...prev];
          newPasscode[idx] = '';
          return newPasscode;
        });
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      const prevInput = document.getElementById(
        mode === 'signup' && signUpStep === 'passcode'
          ? `passcode-${idx - 1}`
          : `login-passcode-${idx - 1}`
      );
      if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      const nextInput = document.getElementById(
        mode === 'signup' && signUpStep === 'passcode'
          ? `passcode-${idx + 1}`
          : `login-passcode-${idx + 1}`
      );
      if (nextInput) nextInput.focus();
    }
  };

  // Handle passcode submission and final registration
  const handlePasscodeSubmit = async (e) => {
    e.preventDefault();
    const passcodeString = passcode.join('');
    if (passcodeString.length !== 6) {
      setPasscodeError('Please enter a 6-digit passcode.');
      return;
    }
    
    setPasscodeError('');
    setRegistrationLoading(true);
    
    try {
      const res = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signUpForm.email,
          password: signUpForm.password,
          passcode: passcodeString,
          lecturerId: lecturerDetails.lecturer.id
        }),
      });
      
      const data = await res.json();
      setRegistrationLoading(false);
      
      if (data.success) {
        // Auto-login after successful registration
        const loginRes = await fetch('http://localhost:5001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: signUpForm.email,
            password: signUpForm.password,
            passcode: passcodeString
          }),
        });
        
        const loginData = await loginRes.json();
        if (loginData.success) {
          // Store authentication data and navigate to dashboard
          login(loginData.user, 'auth-token'); // You might want to use a real JWT token here
          navigate('/dashboard');
        } else {
          setPasscodeError('Registration successful but auto-login failed. Please log in manually.');
        }
      } else {
        setPasscodeError(data.error || 'Registration failed.');
      }
    } catch (err) {
      setRegistrationLoading(false);
      setPasscodeError('Server error. Please try again.');
    }
  };

  // Handle login form submit (step 1)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = loginForm;
    if (!email || !password) {
      setLoginError('Email and password are required.');
      return;
    }
    setLoginError('');
    setLoginLoading(true);
    try {
      // Use /api/auth/login for both steps
      const res = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      setLoginLoading(false);
      if (data.success && data.requirePasscode) {
        // Proceed to passcode step
        setLoginStep('passcode');
        setLoginSession({ email, password });
      } else if (data.success) {
        // If no passcode required, log in directly
        login(data.user, 'auth-token');
        navigate('/dashboard');
      } else {
        setLoginError(data.error || 'Login failed.');
      }
    } catch (err) {
      setLoginLoading(false);
      setLoginError('Server error. Please try again.');
    }
  };

  const handlePasscodeSubmitStep2 = async (e) => {
    e.preventDefault();
    const passcodeString = passcode.join('');
    if (passcodeString.length !== 6) {
      setPasscodeError('Please enter a 6-digit passcode.');
      return;
    }
    setPasscodeError('');
    setLoginLoading(true);
    try {
      // Use /api/auth/login for passcode step as well
      const res = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginSession.email,
          password: loginSession.password,
          passcode: passcodeString
        }),
      });
      const data = await res.json();
      setLoginLoading(false);
      if (data.success) {
        login(data.user, 'auth-token');
        navigate('/dashboard');
      } else {
        setPasscodeError(data.error || 'Passcode verification failed.');
      }
    } catch (err) {
      setLoginLoading(false);
      setPasscodeError('Server error. Please try again.');
    }
  };

  // Handler for passcode reset email step
  const handleResetEmailSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    // TODO: Call backend to send verification code
    setTimeout(() => {
      setResetLoading(false);
      setResetStep('code');
    }, 1000);
  };

  // New: Handler to start reset flow (called from 'Forgot passcode?')
  const startResetFlow = () => {
    setResetError('');
    if (loginSession && loginSession.email) {
      setResetEmail(loginSession.email);
      setResetStep('code');
      // Optionally, trigger sending the code here automatically
      // TODO: Call backend to send verification code
    } else {
      setResetEmail('');
      setResetStep('email');
    }
  };

  // Handler for passcode reset code step
  const handleResetCodeSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    // TODO: Call backend to verify code
    setTimeout(() => {
      setResetLoading(false);
      setResetStep('newpasscode');
    }, 1000);
  };

  // Handler for passcode reset new passcode step
  const handleResetPasscodeChange = (e, idx) => {
    const value = e.target.value.replace(/\D/g, '');
    if (!value) {
      setResetPasscode((prev) => {
        const newPasscode = [...prev];
        newPasscode[idx] = '';
        return newPasscode;
      });
      return;
    }
    if (value.length === 1) {
      setResetPasscode((prev) => {
        const newPasscode = [...prev];
        newPasscode[idx] = value;
        return newPasscode;
      });
      if (idx < 5) {
        const nextInput = document.getElementById(`reset-passcode-${idx + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };
  const handleResetPasscodeKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      if (resetPasscode[idx] === '') {
        if (idx > 0) {
          const prevInput = document.getElementById(`reset-passcode-${idx - 1}`);
          if (prevInput) prevInput.focus();
        }
      } else {
        setResetPasscode((prev) => {
          const newPasscode = [...prev];
          newPasscode[idx] = '';
          return newPasscode;
        });
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      const prevInput = document.getElementById(`reset-passcode-${idx - 1}`);
      if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      const nextInput = document.getElementById(`reset-passcode-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };
  const handleResetPasscodeSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    // TODO: Call backend to set new passcode
    setTimeout(() => {
      setResetLoading(false);
      setResetStep('done');
    }, 1000);
  };

  // Add ref for first passcode input
  const firstPasscodeInputRef = useRef(null);

  // Focus first passcode input when entering 'passcode' step in signup
  useEffect(() => {
    if (mode === 'signup' && signUpStep === 'passcode' && firstPasscodeInputRef.current) {
      firstPasscodeInputRef.current.focus();
    }
  }, [mode, signUpStep]);

  return (
    <div className="w-full max-w-sm bg-white border border-gray-200 shadow-lg rounded-xl p-6">
      {(isLogin && loginStep === 'login' && !resetStep) || (mode === 'signup' && signUpStep === 'form') ? (
        <div className="flex flex-col gap-1 text-center mb-6">
          <h2 className="text-xl font-bold tracking-tight text-emerald-700">{currentConfig.title}</h2>
          <p className="text-sm text-gray-500">{currentConfig.subtitle}</p>
        </div>
      ) : null}
      {isLogin && loginStep === 'login' && !resetStep && (
        <form className="flex flex-col gap-6" onSubmit={handleLoginSubmit}>
          <div className="flex flex-col gap-4">
            <button type="button" className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-md py-2 hover:bg-gray-50 transition font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" fill="currentColor"/></svg>
              Login with Apple
            </button>
            <button type="button" className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-md py-2 hover:bg-gray-50 transition font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor"/></svg>
              Login with Google
            </button>
          </div>
          <div className="relative text-center text-sm">
            <span className="bg-white px-2 relative z-10 text-gray-400">Or continue with</span>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-gray-200 z-0" />
          </div>
          <div className="grid gap-4">
            <div className="grid gap-3 text-left">
              <label htmlFor="login-email" className="text-sm font-medium text-emerald-700">Email</label>
              <input 
                id="login-email" 
                type="email" 
                placeholder="m@example.com" 
                required 
                className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={loginForm.email}
                onChange={e => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 text-left">
              <div className="flex items-center">
                <label htmlFor="login-password" className="text-sm font-medium text-emerald-700">Password</label>
                <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline text-emerald-700">Forgot your password?</a>
              </div>
              <div className="relative">
                <input 
                  id="login-password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={loginForm.password}
                  onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {loginError && <div className="text-red-500 text-sm mt-1">{loginError}</div>}
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition shadow" disabled={loginLoading}>
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      )}
      {isLogin && loginStep === 'passcode' && !resetStep && (
        <form className="flex flex-col gap-6" onSubmit={handlePasscodeSubmitStep2}>
          <div className="flex flex-col gap-4">
            <div className="text-center text-lg font-bold text-emerald-700">Enter Passcode</div>
            <div className="flex gap-2 justify-center">
              {passcode.map((digit, idx) => (
                <input
                  key={idx}
                  id={`login-passcode-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-10 h-10 text-center text-lg border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={digit}
                  onChange={e => handlePasscodeChange(e, idx)}
                  onKeyDown={e => handlePasscodeKeyDown(e, idx)}
                  autoFocus={idx === 0}
                />
              ))}
            </div>
            {passcodeError && <div className="text-red-500 text-sm mt-1">{passcodeError}</div>}
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition shadow" disabled={loginLoading}>
              {loginLoading ? 'Verifying...' : 'Verify Passcode'}
            </button>
            <button type="button" className="w-full text-emerald-700 underline mt-2" onClick={() => { setLoginStep('login'); setPasscode(['','','','','','']); setPasscodeError(''); }}>Back to Login</button>
            <button type="button" className="w-full text-emerald-700 underline mt-2" onClick={startResetFlow}>Forgot passcode?</button>
          </div>
        </form>
      )}
      {isLogin && loginStep === 'passcode' && resetStep === 'email' && (
        <form className="flex flex-col gap-6" onSubmit={handleResetEmailSubmit}>
          <div className="flex flex-col gap-4">
            <div className="text-center text-lg font-bold text-emerald-700">Reset Passcode</div>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              required
            />
            {resetError && <div className="text-red-500 text-sm mt-1">{resetError}</div>}
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition shadow" disabled={resetLoading}>
              {resetLoading ? 'Sending code...' : 'Send Verification Code'}
            </button>
            <button type="button" className="w-full text-emerald-700 underline mt-2" onClick={() => setResetStep(null)}>Back</button>
          </div>
        </form>
      )}
      {isLogin && loginStep === 'passcode' && resetStep === 'code' && (
        <form className="flex flex-col gap-6" onSubmit={handleResetCodeSubmit}>
          <div className="flex flex-col gap-4">
            <div className="text-center text-lg font-bold text-emerald-700">Enter Verification Code</div>
            <div className="text-center text-sm text-gray-500 mb-2">We sent a code to <b>{resetEmail}</b></div>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Enter code sent to your email"
              value={resetCode}
              onChange={e => setResetCode(e.target.value)}
              required
            />
            {resetError && <div className="text-red-500 text-sm mt-1">{resetError}</div>}
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition shadow" disabled={resetLoading}>
              {resetLoading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button type="button" className="w-full text-emerald-700 underline mt-2" onClick={() => setResetStep(loginSession && loginSession.email ? null : 'email')}>Back</button>
          </div>
        </form>
      )}
      {isLogin && loginStep === 'passcode' && resetStep === 'newpasscode' && (
        <form className="flex flex-col gap-6" onSubmit={handleResetPasscodeSubmit}>
          <div className="flex flex-col gap-4">
            <div className="text-center text-lg font-bold text-emerald-700">Set New Passcode</div>
            <div className="flex gap-2 justify-center">
              {resetPasscode.map((digit, idx) => (
                <input
                  key={idx}
                  id={`reset-passcode-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-10 h-10 text-center text-lg border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={digit}
                  onChange={e => handleResetPasscodeChange(e, idx)}
                  onKeyDown={e => handleResetPasscodeKeyDown(e, idx)}
                  autoFocus={idx === 0}
                />
              ))}
            </div>
            {resetError && <div className="text-red-500 text-sm mt-1">{resetError}</div>}
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition shadow" disabled={resetLoading}>
              {resetLoading ? 'Resetting...' : 'Reset Passcode'}
            </button>
            <button type="button" className="w-full text-emerald-700 underline mt-2" onClick={() => setResetStep('code')}>Back</button>
          </div>
        </form>
      )}
      {isLogin && loginStep === 'passcode' && resetStep === 'done' && (
        <div className="flex flex-col gap-6 items-center justify-center">
          <div className="text-center text-lg font-bold text-emerald-700">Passcode Reset Successful!</div>
          <button type="button" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition shadow" onClick={() => { setResetStep(null); setLoginStep('login'); }}>Back to Login</button>
        </div>
      )}
      {mode === 'signup' && signUpStep === 'form' && (
        <>
          <form className="flex flex-col gap-6" onSubmit={handleSignUpSubmit}>
            <div className="flex flex-col gap-4">
              <button type="button" className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-md py-2 hover:bg-gray-50 transition font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" fill="currentColor"/></svg>
                Sign up with Apple
              </button>
              <button type="button" className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-md py-2 hover:bg-gray-50 transition font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor"/></svg>
                Sign up with Google
              </button>
            </div>
            <div className="relative text-center text-sm">
              <span className="bg-white px-2 relative z-10 text-gray-400">Or continue with</span>
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-gray-200 z-0" />
            </div>
            <div className="grid gap-4">
              <div className="grid gap-3 text-left">
                <label htmlFor="signup-email" className="text-sm font-medium text-emerald-700">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={signUpForm.email}
                  onChange={e => setSignUpForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-3 text-left">
                <label htmlFor="signup-password" className="text-sm font-medium text-emerald-700">Password</label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={signUpForm.password}
                    onChange={e => setSignUpForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {signUpError && <div className="text-red-500 text-sm mt-1">{signUpError}</div>}
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition shadow">
                Continue
              </button>
            </div>
          </form>
          <div className="text-center text-sm mt-6">
            {currentConfig.switchText}{' '}
            <button 
              type="button"
              onClick={handleSwitchMode}
              className="underline underline-offset-4 text-emerald-700 hover:text-emerald-900 bg-transparent border-none cursor-pointer"
            >
              {currentConfig.switchLink}
            </button>
          </div>
          <div className="text-gray-400 text-center text-xs mt-4">
            By clicking continue, you agree to our{' '}
            <a href="#" className="underline underline-offset-4 hover:text-emerald-700">Terms of Service</a> and{' '}
            <a href="#" className="underline underline-offset-4 hover:text-emerald-700">Privacy Policy</a>.
          </div>
        </>
      )}
      {mode === 'signup' && signUpStep === 'verify' && (
        <form className="flex flex-col gap-6" onSubmit={handleVerifySubmit}>
          <div className="flex flex-col gap-4 items-center">
            <div className="text-emerald-700 text-lg font-semibold text-center">Verify your email</div>
            <div className="text-gray-500 text-center text-sm mb-2">
              A verification code has been sent to <span className="font-semibold text-emerald-700">{signUpForm.email}</span>. Please enter it below to continue your registration.
            </div>
            <div className="flex gap-2 justify-center">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-12 h-12 text-center text-lg border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={digit}
                  onChange={e => handleOtpChange(e, idx)}
                  onKeyDown={e => handleOtpKeyDown(e, idx)}
                  autoFocus={idx === 0}
                />
              ))}
            </div>
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition shadow" disabled={otp.join('').length !== 6}>Verify</button>
            <div className="text-xs text-gray-400 mt-2">Didn't receive the code? <button type="button" className="underline underline-offset-4 text-emerald-700 hover:text-emerald-900">Resend</button></div>
            <button type="button" onClick={() => setSignUpStep('form')} className="mt-2 text-emerald-700 underline underline-offset-4 hover:text-emerald-900">&larr; Back to sign up</button>
            <button type="button" onClick={() => setSignUpStep('lecturer')} className="mt-2 text-emerald-700 underline underline-offset-4 hover:text-emerald-900">Continue</button>
          </div>
        </form>
      )}
      {mode === 'signup' && signUpStep === 'lecturer' && (
        <form className="flex flex-col gap-6" onSubmit={handleLecturerSubmit}>
          <div className="flex flex-col gap-4 items-center">
            <div className="text-emerald-700 text-lg font-semibold text-center">Lecturer Verification</div>
            <div className="text-gray-500 text-center text-sm mb-2">
              Please enter your full name (as in our records) and your personal lecturer token.
            </div>
            <div className="w-full flex flex-col gap-3">
              <label htmlFor="lecturer-fullname" className="text-sm font-medium text-emerald-700">Full Name</label>
              <input
                id="lecturer-fullname"
                type="text"
                placeholder="e.g. John Doe"
                className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={lecturerForm.fullName}
                onChange={e => setLecturerForm(f => ({ ...f, fullName: e.target.value }))}
                required
                disabled={lecturerLoading}
              />
            </div>
            <div className="w-full flex flex-col gap-3">
              <label htmlFor="lecturer-token" className="text-sm font-medium text-emerald-700">Lecturer Token</label>
              <input
                id="lecturer-token"
                type="text"
                placeholder="Enter your token"
                className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                style={{ textTransform: 'uppercase' }}
                value={lecturerForm.token}
                onChange={e => setLecturerForm(f => ({ ...f, token: e.target.value }))}
                required
                disabled={lecturerLoading}
              />
            </div>
            {lecturerError && <div className="text-red-500 text-sm mt-1">{lecturerError}</div>}
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition shadow" disabled={lecturerLoading}>
              {lecturerLoading ? 'Validating...' : 'Submit'}
            </button>
            <button type="button" onClick={() => setSignUpStep('verify')} className="mt-2 text-emerald-700 underline underline-offset-4 hover:text-emerald-900" disabled={lecturerLoading}>
              &larr; Back to verification
            </button>
          </div>
        </form>
      )}
      {mode === 'signup' && signUpStep === 'details' && lecturerDetails && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 items-center">
            <div className="text-emerald-700 text-lg font-semibold text-center">Welcome, {lecturerDetails.lecturer.name}!</div>
            <div className="text-gray-500 text-center text-sm mb-2">
              Here are your assigned programs and courses:
            </div>
            {/* Scrollable programs/courses list with global course numbering */}
            <div className="w-full space-y-4 max-h-[320px] overflow-y-auto custom-scrollbar">
              {(() => {
                return lecturerDetails.programs.map((program, programIndex) => (
                  <div key={programIndex} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-emerald-700 mb-2">{program.name}</h3>
                    <div className="space-y-2">
                      {program.courses.map((course, courseIndex) => {
                        // Calculate global course number
                        const globalCourseNumber = lecturerDetails.programs
                          .slice(0, programIndex)
                          .reduce((total, prog) => total + prog.courses.length, 0) + courseIndex + 1;
                        
                        return (
                          <div key={courseIndex} className="flex flex-col gap-1 text-sm min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="bg-emerald-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                                {globalCourseNumber}
                              </span>
                              <span className="font-medium whitespace-nowrap leading-none text-base">{course.code}</span>
                              <span className="text-gray-500 text-xs font-medium">
                                {(() => {
                                  const levelStr = String(course.level || '').toLowerCase().replace(/[()]/g, '');
                                  if (levelStr.includes('top up') || levelStr.includes('top-up')) {
                                    // Extract the level number and format as "Level XXX_Top up"
                                    const levelMatch = course.level?.match(/level\s*(\d+)/i);
                                    const levelNumber = levelMatch ? levelMatch[1] : '';
                                    return `(Level ${levelNumber}_Top up)`;
                                  }
                                  return `(${course.level || ''})`;
                                })()}
                              </span>
                            </div>
                            <div className="ml-7">
                              <span className="text-gray-600 text-sm">{course.title}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
              {lecturerDetails.programs.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No courses assigned yet.
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500 text-center">
              Total courses: {lecturerDetails.totalCourses}
            </div>
            <button 
              onClick={() => setSignUpStep('passcode')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition shadow"
            >
              Continue to Set Passcode
            </button>
            <button 
              type="button" 
              onClick={() => setSignUpStep('lecturer')} 
              className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
            >
              &larr; Back to verification
            </button>
          </div>
        </div>
      )}
      {mode === 'signup' && signUpStep === 'passcode' && (
        <form className="flex flex-col gap-6" onSubmit={handlePasscodeSubmit}>
          <div className="flex flex-col gap-4 items-center">
            <div className="text-emerald-700 text-lg font-semibold text-center">Set Your Passcode</div>
            <div className="text-gray-500 text-center text-sm mb-2">
              Create a 6-digit passcode that you'll use to log in. This adds an extra layer of security to your account.
            </div>
            <div className="flex gap-2 justify-center">
              {passcode.map((digit, idx) => (
                <input
                  key={idx}
                  id={`passcode-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-12 h-12 text-center text-lg border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={digit}
                  onChange={e => handlePasscodeChange(e, idx)}
                  onKeyDown={e => handlePasscodeKeyDown(e, idx)}
                  ref={idx === 0 ? firstPasscodeInputRef : undefined}
                />
              ))}
            </div>
            {passcodeError && <div className="text-red-500 text-sm mt-1">{passcodeError}</div>}
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition shadow" disabled={registrationLoading || passcode.join('').length !== 6}>
              {registrationLoading ? 'Creating Account...' : 'Complete Registration'}
            </button>
            <button type="button" onClick={() => setSignUpStep('details')} className="mt-2 text-emerald-700 underline underline-offset-4 hover:text-emerald-900" disabled={registrationLoading}>
              &larr; Back to details
            </button>
          </div>
        </form>
      )}
      {!(mode === 'signup' && (signUpStep === 'verify' || signUpStep === 'details' || signUpStep === 'passcode')) && (
        <>
          {isLogin && loginStep === 'login' && !resetStep && (
            <>
              <div className="text-center text-sm mt-6">
                {currentConfig.switchText}{' '}
                <button 
                  type="button"
                  onClick={handleSwitchMode}
                  className="underline underline-offset-4 text-emerald-700 hover:text-emerald-900 bg-transparent border-none cursor-pointer"
                >
                  {currentConfig.switchLink}
                </button>
              </div>
              <div className="text-gray-400 text-center text-xs mt-4">
                By clicking continue, you agree to our{' '}
                <a href="#" className="underline underline-offset-4 hover:text-emerald-700">Terms of Service</a> and{' '}
                <a href="#" className="underline underline-offset-4 hover:text-emerald-700">Privacy Policy</a>.
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AuthForm; 