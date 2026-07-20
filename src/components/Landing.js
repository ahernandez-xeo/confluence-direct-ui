import classes from "./Landing.module.scss";
import { useEffect, useState, useContext, useMemo, useRef } from "react";
import ValidUserContext from "../authCheck";

import signoutIcon from "../assets/fa-logout.svg";
import userIcon from "../assets/fa-user.svg";
import menuIcon from "../assets/fa-menu.svg";
import pdfIcon from "../assets/icon-pdf.svg";
import imageIcon from "../assets/icon-image.svg";
import refreshIcon from "../assets/icon-refresh.svg";

import brandLogo from "../assets/cd-logo.svg";
import Dashboard from "./Dashboard";

const VIEW_PILL_LIMIT = 10;

const isMobileDevice = () => /Mobi|Android/i.test(navigator.userAgent);

// "AdminInsightsStarter/sheets/UserDrilldown" -> "User Drilldown"
const formatViewLabel = (url) => {
  const seg = url.split("/sheets/")[1] || url.split("/").pop() || url;
  return seg
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
};

const buildWorkbookList = (navEntries, clientName) =>
  navEntries
    .filter(([, wb]) => !clientName || wb.client === clientName)
    .map(([id, wb]) => ({
      id,
      name: wb.name,
      client: wb.client,
      dashboards: wb.dashboards || [],
      dashboard_ids: wb.dashboard_ids || [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

const buildViews = (workbook) => {
  if (!workbook) return [];
  return (workbook.dashboards || []).map((url, i) => ({
    url,
    id: (workbook.dashboard_ids || [])[i],
    label: formatViewLabel(url),
    workbook: workbook.name,
  }));
};

const Landing = ({ idleCountParam }) => {
  const validUserContext = useContext(ValidUserContext);
  const dashboardRef = useRef(null);
  const viewPickerRef = useRef(null);

  const navEntries = useMemo(
    () => Object.entries(JSON.parse(localStorage.getItem("navigation")) || {}),
    []
  );
  const group = JSON.parse(localStorage.getItem("group")) ?? "default";
  const isAdmin = group === "Admin";

  const userName = (JSON.parse(localStorage.getItem("user-name")) || "").trim();
  const role = JSON.parse(localStorage.getItem("role")) || "";
  const roleLabel = role.includes("Administrator") ? "Administrator" : role;

  // Scope workbooks to the user's folder/client label (group name for non-admins,
  // "Admin Insights" / first nav client for admins).
  const scopeClient = isAdmin
    ? (navEntries[0] && navEntries[0][1].client) || null
    : group;

  const workbooks = useMemo(
    () => buildWorkbookList(navEntries, scopeClient),
    [navEntries, scopeClient]
  );

  const initialWorkbookId = workbooks[0]?.id || "";
  const [selectedWorkbookId, setSelectedWorkbookId] = useState(initialWorkbookId);

  const selectedWorkbook = useMemo(
    () => workbooks.find((wb) => wb.id === selectedWorkbookId) || workbooks[0] || null,
    [workbooks, selectedWorkbookId]
  );

  const [views, setViews] = useState(() => buildViews(workbooks[0]));
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeURL, setActiveURL] = useState(() => {
    const v = buildViews(workbooks[0]);
    return v.length ? v[0].url : "";
  });
  const [refreshSpin, setRefreshSpin] = useState(false);
  const [navOpen, setNavOpen] = useState(!isMobileDevice());
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [idleCount, setIdleCount] = useState(idleCountParam);

  const useViewPicker = views.length > VIEW_PILL_LIMIT;
  const activeView = views[activeIndex] || null;

  useEffect(() => {
    if (idleCountParam !== idleCount) {
      setIdleCount(idleCountParam);
      handleBackgroundRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleCountParam]);

  // Close view picker on outside click or Escape
  useEffect(() => {
    if (!viewMenuOpen) return undefined;

    const onPointerDown = (e) => {
      if (viewPickerRef.current && !viewPickerRef.current.contains(e.target)) {
        setViewMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setViewMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [viewMenuOpen]);

  // Keep the currently selected view visible in the scrollable list
  useEffect(() => {
    if (!viewMenuOpen) return;
    const active = viewPickerRef.current?.querySelector('[aria-selected="true"]');
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [viewMenuOpen, activeIndex]);

  const applyWorkbook = (workbook) => {
    const nextViews = buildViews(workbook);
    setSelectedWorkbookId(workbook?.id || "");
    setViews(nextViews);
    setActiveIndex(0);
    setActiveURL(nextViews.length ? nextViews[0].url : "");
    setViewMenuOpen(false);
  };

  const handleWorkbookChange = (workbookId) => {
    const workbook = workbooks.find((wb) => wb.id === workbookId);
    applyWorkbook(workbook);
  };

  const handleViewClick = (index) => {
    validUserContext.localAuthCheck(false);
    setActiveIndex(index);
    setActiveURL(views[index].url);
    setViewMenuOpen(false);
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
          {workbooks.length > 0 && (
            <div className={classes.clientSelect}>
              <select
                value={selectedWorkbook?.id || ""}
                onChange={(e) => handleWorkbookChange(e.target.value)}
                aria-label="Select workbook"
              >
                {workbooks.map((wb) => (
                  <option key={wb.id} value={wb.id}>
                    {wb.name}
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
        <div
          className={`${classes.viewNav} ${useViewPicker ? classes.viewNavPicker : ""}`}
        >
          {views.length === 0 && (
            <span className={classes.noViews}>No dashboards available</span>
          )}

          {!useViewPicker &&
            views.map((view, index) => (
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

          {useViewPicker && activeView && (
            <div className={classes.viewPicker} ref={viewPickerRef}>
              <button
                type="button"
                className={classes.viewPickerButton}
                onClick={() => setViewMenuOpen((o) => !o)}
                aria-expanded={viewMenuOpen}
                aria-haspopup="listbox"
                title={activeView.label}
              >
                <span className={classes.viewPickerLabel}>{activeView.label}</span>
                <span className={classes.chevron}>▾</span>
              </button>

              {viewMenuOpen && (
                <div className={classes.viewPickerMenu} role="listbox">
                  {views.map((view, index) => (
                    <button
                      key={view.id || index}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`${classes.viewPickerItem} ${
                        index === activeIndex ? classes.viewPickerItemActive : ""
                      }`}
                      onClick={() => handleViewClick(index)}
                      title={view.label}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
