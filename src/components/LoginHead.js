import classes from "./LoginHead.module.scss";
import brandLogo from "../assets/cd-logo.svg"
import { useContext} from "react";
import ValidUserContext from "../authCheck";

function LoginHead() {
  const validUserContext = useContext(ValidUserContext);

  const handleReset = () => {
    validUserContext.reset()
  }

  return (
    <div className={classes.brandBlock}>
      <a href="/">
        <img
          className={classes.loginLogo}
          src={brandLogo}
          alt="Conference Direct"
          onClick={() => handleReset()}
        />
      </a>
    </div>
  );
}

export default LoginHead;
