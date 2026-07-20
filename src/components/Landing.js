import classes from "./Landing.module.scss";
import { useEffect, useState, useContext, useMemo } from "react";
import ValidUserContext from "../authCheck";

import signoutIcon from "../assets/fa-logout.svg";
import userIcon from "../assets/fa-user.svg";
import menuIcon from "../assets/fa-menu.svg";
import pdfIcon from "../assets/icon-pdf.svg";
import imageIcon from "../assets/icon-image.svg";
import refreshIcon from "../assets/icon-refresh.svg";

import brandLogo from "../assets/cd-logo.svg";
import Dashboard from "./Dashboard";
import { useRef } from "react";

const isMobileDevice = () => /Mobi|Android/i.test(navigator.userAgent);

// "AdminInsightsStarter/sheets/UserDrilldown" -> "User Drilldown"
const formatViewLabel = (url) => {
  const seg = url.split("/sheets/")[1] || url.split("/").pop() || url;
  return seg
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
};

const buildViews = (navEntries, clientName) =>
  navEntries
    .filter(([, wb]) => wb.client === clientName)
    .flatMap(([, wb]) =>
      (wb.dashboards || []).map((url, i) => ({
        url,
        id: (wb.dashboard_ids || [])[i],
        label: formatViewLabel(url),
        workbook: wb.name,
      }))
    );

const Landing = ({ idleCountParam }) => {
  const validUserContext = useContext(ValidUserContext);
  const dashboardRef = useRef(null);

  const navEntries = useMemo(
    () => Object.entries(JSON.parse(localStorage.getItem("navigation")) || {}),
    []
  );
  const clientList = useMemo(
    () => JSON.parse(localStorage.getItem("client_list")) || [],
    []
  );
  const group = JSON.parse(localStorage.getItem("group")) ?? "default";
  const isAdmin = group === "Admin";

  const userName = (JSON.parse(localStorage.getItem("user-name")) || "").trim();
  const role = JSON.parse(localStorage.getItem("role")) || "";
  const roleLabel = role.includes("Administrator") ? "Administrator" : role;

  const initialClient = isAdmin
    ? clientList[0] || (navEntries[0] && navEntries[0][1].client) || "default"
    : group;

  const [selectedClient, setSelectedClient] = useState(initialClient);
  const [views, setViews] = useState(() => buildViews(navEntries, initialClient));
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeURL, setActiveURL] = useState(() => {
    const v = buildViews(navEntries, initialClient);
    return v.length ? v[0].url : "";
  });
  const [refreshSpin, setRefreshSpin] = useState(false);
  const [navOpen, setNavOpen] = useState(!isMobileDevice());
  const [profileOpen, setProfileOpen] = useState(false);
  const [idleCount, setIdleCount] = useState(idleCountParam);

  useEffect(() => {
    if (idleCountParam !== idleCount) {
      setIdleCount(idleCountParam);
      handleBackgroundRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleCountParam]);

  const handleClientChange = (client) => {
    const nextViews = buildViews(navEntries, client);
    setSelectedClient(client);
    setViews(nextViews);
    setActiveIndex(0);
    setActiveURL(nextViews.length ? nextViews[0].url : "");
  };

  const handleViewClick = (index) => {
    validUserContext.localAuthCheck(false);
    setActiveIndex(index);
    setActiveURL(views[index].url);
    if (isMobileDevice()) setNavOpen(false);
  };

  // Tableau Embedding API v3 custom element inside Dashboard
  const getViz = () => dashboardRef.current?.querySelector("tableau-viz");

  const handleExportPDFClick = async () => {
    const viz = getViz();
    if (!viz) return;
    try {
      await viz.displayDialogAsync("export-pdf");
    } catch (err) {
      console.error("PDF export failed", err);
    }
  };

  const handleExportImageClick = async () => {
    const viz = getViz();
    if (!viz) return;
    try {
      await viz.exportImageAsync();
    } catch (err) {
      console.error("Image export failed", err);
    }
  };

  const handleTriggerRefresh = () => {
    const viz = getViz();
    if (!viz) return;
    setRefreshSpin(true);
    viz
      .refreshDataAsync()
      .then(() => setRefreshSpin(false))
      .catch(() => setRefreshSpin(false));
  };

  const handleBackgroundRefresh = () => {
    const viz = getViz();
    if (viz) viz.refreshDataAsync().catch(() => {});
  };

  const handleLogout = () => validUserContext.logoutUser();

  const exportButtons = [
    { icon: pdfIcon, alt: "Export PDF", onClick: handleExportPDFClick },
    { icon: imageIcon, alt: "Export Image", onClick: handleExportImageClick },
  ];

  return (
    <div className={classes.app}>
      <header className={classes.header}>
        <div className={classes.headerLeft}>
          <button
            className={classes.menuToggle}
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Toggle navigation"
          >
            <img src={menuIcon} alt="Menu" />
          </button>
          <img className={classes.brandLogo} src={brandLogo} alt="Conference Direct" />
        </div>

        <div className={classes.headerRight}>
          {isAdmin && clientList.length > 0 && (
            <div className={classes.clientSelect}>
              <select
                value={selectedClient}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                {clientList.map((client, i) => (
                  <option key={i} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={classes.profile}>
            <button
              className={classes.profileButton}
              onClick={() => setProfileOpen((o) => !o)}
            >
              <span className={classes.avatar}>
                <img src={userIcon} alt="" />
              </span>
              <span className={classes.profileText}>
                <span className={classes.profileName}>{userName || "Account"}</span>
                {roleLabel && <span className={classes.profileRole}>{roleLabel}</span>}
              </span>
              <span className={classes.chevron}>▾</span>
            </button>
            {profileOpen && (
              <div className={classes.profileMenu}>
                <button onClick={handleLogout}>
                  <img src={signoutIcon} alt="" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className={`${classes.subnav} ${navOpen ? "" : classes.subnavClosed}`}>
        <div className={classes.viewNav}>
          {views.length === 0 && (
            <span className={classes.noViews}>No dashboards available</span>
          )}
          {views.map((view, index) => (
            <button
              key={view.id || index}
              className={`${classes.viewPill} ${
                activeIndex === index ? classes.viewPillActive : ""
              }`}
              onClick={() => handleViewClick(index)}
              title={view.label}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className={classes.toolbarActions}>
          {exportButtons.map((btn) => (
            <button
              key={btn.alt}
              className={classes.iconButton}
              onClick={btn.onClick}
              title={btn.alt}
              aria-label={btn.alt}
            >
              <img src={btn.icon} alt="" />
            </button>
          ))}
          <button
            className={classes.iconButton}
            onClick={handleTriggerRefresh}
            title="Refresh"
            aria-label="Refresh"
          >
            <img
              className={refreshSpin ? classes.spin : ""}
              src={refreshIcon}
              alt=""
            />
          </button>
        </div>
      </nav>

      <main className={classes.content}>
        <div className={classes.dashboardCard} ref={dashboardRef}>
          {activeURL ? (
            <Dashboard dashboardLinkProp={activeURL} displayTabs={false} idleCount={idleCount} />
          ) : (
            <div className={classes.emptyState}>Select a dashboard to get started.</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Landing;
