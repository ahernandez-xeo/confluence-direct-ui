import { useRef, useEffect, useState, useContext } from "react";

import classes from "./LoginForm.module.scss";
import usernameIcon from "../assets/fa-user.svg";
import passwordIcon from "../assets/carbon_password.svg";
import ValidUserContext from "../authCheck";


let isInitial = true;

function LoginForm() {
  const validUserContext = useContext(ValidUserContext);
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(true);


  const emailInputRef = useRef();
  const passwordInputRef = useRef();


  useEffect(() => {
    if (isInitial) {
      validUserContext.localAuthCheck(true);
      isInitial = false;
    }
  }, [validUserContext]);

  const submitHandler = (event) => {
    event.preventDefault();

    validUserContext.apiAuthCheck(
      emailInputRef.current.value,
      passwordInputRef.current.value,
      false
    );
  };
  

  return (
    <div className={classes.logincontainer}>
      <form onSubmit={submitHandler} className={classes.form}>
        <div className={classes.loginInstructions}>Welcome back</div>
        <div className={classes.loginSubtitle}>
          Sign in to Conference Direct Insights
        </div>

        <label className={classes.field}>
          <img className={classes.fieldIcon} src={usernameIcon} alt="" />
          <input
            className={classes.input}
            type="email"
            id="user-name"
            name="user-name"
            autoComplete="on"
            placeholder="Email address"
            ref={emailInputRef}
            required={!validUserContext.isLoggedIn}
          />
        </label>

        <label className={classes.field}>
          <img className={classes.fieldIcon} src={passwordIcon} alt="" />
          <input
            className={classes.input}
            type="password"
            id="user-password"
            name="user-password"
            autoComplete="off"
            placeholder="Password"
            ref={passwordInputRef}
            required={!validUserContext.isLoggedIn}
          />
        </label>

        {/* Password reset deferred until Mailgun is configured */}
        <button
          className={`${disclaimerAcknowledged ? classes.loginBtn : classes.loginBtnDisabled}`}
          disabled={validUserContext.isLoggedIn || !disclaimerAcknowledged}
        >
          {validUserContext.isLoggedIn ? "Already logged in" : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
