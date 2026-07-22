import classes from "./Landing.module.scss";
import { useRef, useEffect, useState, useContext, useMemo } from "react";
import ValidUserContext from "../authCheck";

const isMobileDevice = () => /Mobi|Android/i.test(navigator.userAgent);

const workbookKeyFromViewUrl = (viewUrl) => {
  if (!viewUrl) return "";
  return viewUrl.split("/sheets/")[0] || viewUrl.split("/")[0] || viewUrl;
};

const buildVizUrl = (viewPath) => {
  const base =
    JSON.parse(localStorage.getItem("dashboard-url")) ||
    "https://10ay.online.tableau.com/#/site/conferencedirect/views/";
  // Keep workbook + sheet in the initial src; sheet switches use activateSheetAsync
  return (
    base +
    viewPath.replace("/sheets", "") +
    "?:showVizHome=no&:embed=true&:toolbar=no&:tabs=n"
  );
};

const findSheetForViewUrl = (sheets, viewUrl) => {
  if (!sheets?.length || !viewUrl) return null;

  const sheetSeg = viewUrl.split("/sheets/")[1] || viewUrl.split("/").pop() || "";
  const compactSeg = sheetSeg.replace(/[\s_-]+/g, "").toLowerCase();
  const pathWithoutSheets = viewUrl.replace("/sheets/", "/");

  return (
    sheets.find((s) => s.url && (s.url.includes(viewUrl) || s.url.includes(pathWithoutSheets))) ||
    sheets.find((s) => s.name === sheetSeg) ||
    sheets.find(
      (s) => (s.name || "").replace(/[\s_-]+/g, "").toLowerCase() === compactSeg
    ) ||
    null
  );
};

const activateSheetByViewUrl = async (viz, viewUrl) => {
  if (!viz?.workbook || !viewUrl) return;
  const sheets = viz.workbook.publishedSheetsInfo || [];
  const sheet = findSheetForViewUrl(sheets, viewUrl);
  if (!sheet) {
    console.warn("Sheet not found for view:", viewUrl, sheets.map((s) => s.name));
    return;
  }
  try {
    await viz.workbook.activateSheetAsync(sheet.name);
  } catch (err) {
    console.error("activateSheetAsync failed", err);
  }
};

const Dashboard = ({ embedUrl, activeSheetUrl, displayTabs = false }) => {
  const elementRef = useRef(null);
  const readyRef = useRef(false);
  const activeSheetRef = useRef(activeSheetUrl);
  const workbookKeyRef = useRef(workbookKeyFromViewUrl(embedUrl));
  const validUserContext = useContext(ValidUserContext);

  const [src, setSrc] = useState(() => (embedUrl ? buildVizUrl(embedUrl) : ""));
  const [token] = useState(() => {
    const jwtToken = JSON.parse(localStorage.getItem("tableau-login-data"));
    if (jwtToken && jwtToken !== "redeemed") {
      localStorage.setItem("tableau-login-data", JSON.stringify("redeemed"));
      return jwtToken;
    }
    return null;
  });

  const [tabArray, setTabArray] = useState([]);
  const [tabLinksArray, setTabLinksArray] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  activeSheetRef.current = activeSheetUrl;

  // Workbook change → reload viz src. View change within workbook → activateSheetAsync.
  useEffect(() => {
    if (!embedUrl) return;
    const nextKey = workbookKeyFromViewUrl(embedUrl);
    if (nextKey !== workbookKeyRef.current) {
      workbookKeyRef.current = nextKey;
      readyRef.current = false;
      localStorage.setItem("tableauActive", false);
      setSrc(buildVizUrl(embedUrl));
    }
  }, [embedUrl]);

  useEffect(() => {
    const viz = elementRef.current;
    if (!viz) return undefined;

    const onFirstInteractive = async () => {
      readyRef.current = true;
      localStorage.setItem("tableauActive", true);

      const sheets = viz.workbook?.publishedSheetsInfo || [];
      const names = sheets.map((sheet) =>
        isMobileDevice() ? sheet.index + 1 : sheet.name
      );
      setTabArray(names);
      setTabLinksArray(sheets.map((sheet) => sheet.name));

      const targetUrl = activeSheetRef.current || embedUrl;
      const idx = sheets.findIndex((sheet) => {
        const match = findSheetForViewUrl([sheet], targetUrl);
        return !!match;
      });
      if (idx >= 0) setActiveTab(idx);

      await activateSheetByViewUrl(viz, targetUrl);
    };

    viz.addEventListener("firstinteractive", onFirstInteractive);

    const timeoutId = setTimeout(() => {
      const tableauActive = JSON.parse(localStorage.getItem("tableauActive"));
      if (!tableauActive) {
        validUserContext.logoutUser();
      }
    }, 30000);

    return () => {
      viz.removeEventListener("firstinteractive", onFirstInteractive);
      clearTimeout(timeoutId);
    };
    // Mount once per Dashboard instance; workbook reloads happen via src change on same element
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same-workbook view navigation — preserve filters via activateSheetAsync
  useEffect(() => {
    if (!readyRef.current || !activeSheetUrl) return;
    const viz = elementRef.current;
    if (!viz?.workbook) return;

    activateSheetByViewUrl(viz, activeSheetUrl).then(() => {
      const sheets = viz.workbook.publishedSheetsInfo || [];
      const idx = sheets.findIndex((sheet) => !!findSheetForViewUrl([sheet], activeSheetUrl));
      if (idx >= 0) setActiveTab(idx);
    });
  }, [activeSheetUrl]);

  const handleTabClick = (tabIndex) => {
    validUserContext.localAuthCheck(false);
    const name = tabLinksArray[tabIndex];
    if (elementRef.current?.workbook && name) {
      elementRef.current.workbook.activateSheetAsync(name);
    }
    setActiveTab(tabIndex);
  };

  const inputProps = useMemo(() => (token ? { token } : {}), [token]);

  if (!src) {
    return <div className={classes.vizWrapper} />;
  }

  return (
    <div className={classes.vizWrapper}>
      {displayTabs ? (
        <div className={classes.tabbar}>
          <span className={classes.tabs}>
            {tabArray.map((tab, index) => (
              <span
                key={index}
                className={`${classes.tab} ${activeTab === index ? classes.active : ""}`}
                onClick={() => handleTabClick(index)}
              >
                {tab}
              </span>
            ))}
          </span>
        </div>
      ) : (
        <div />
      )}
      <tableau-viz
        class={classes.tabframe}
        ref={elementRef}
        id="tableauViz"
        width="100%"
        height="100%"
        hide-tabs="true"
        toolbar="hidden"
        src={src}
        {...inputProps}
      />
    </div>
  );
};

export default Dashboard;
