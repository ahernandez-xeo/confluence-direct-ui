import Layout from "./components/Layout";
import { useContext, useState } from "react";
import classes from "./App.module.scss";
import LoginForm from "./components/LoginForm";
import LoginHead from "./components/LoginHead";
import Landing from "./components/Landing";
import ValidUserContext from "./authCheck";
import { useIdleTimer } from 'react-idle-timer';

function App() {
  const validUserContext = useContext(ValidUserContext);
  const [idleCount, setIdleCount] = useState(0);

  const onPresenceChange = (presence) => {
    if (validUserContext.isLoggedIn && presence.type == 'idle') {
      idleTimer.reset()
      setIdleCount((count) => count + 1)
    }
  }

  const onActive = () => {
    validUserContext.localAuthCheck(true)
  }

  const idleTimer = useIdleTimer({ onPresenceChange, timeout: 5 * 60 * 1000 })
  useIdleTimer({ onActive, timeout: 5 * 60 * 1000 })

  if (validUserContext.isLoggedIn) {
    return (
      <div className={classes.container}>
        <Landing idleCountParam={idleCount} />
        {validUserContext.isLoggingIn && (
          <div className={classes.spinnerOverlay}>
            <div className={classes.spinner}></div>
          </div>
        )}
      </div>
    );
  }

  // v1: auth + embed only (password reset / new-user email deferred until Mailgun)
  return (
    <Layout>
      <div className={classes.loginCard}>
        <LoginHead />
        <LoginForm />
      </div>
      {validUserContext.isLoggingIn && (
        <div className={classes.spinnerOverlay}>
          <div className={classes.spinner}></div>
        </div>
      )}
    </Layout>
  );
}

export default App;
