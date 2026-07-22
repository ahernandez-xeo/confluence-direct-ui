import classes from "./Landing.module.scss";
import { useEffect, useState, useContext, useMemo, useRef } from "react";
import ValidUserContext from "../authCheck";

import signoutIcon from "../assets/fa-logout.svg";
import userIcon from "../assets/fa-user.svg";
import menuIcon from "../assets/fa-menu.svg";

import brandLogo from "../assets/cd-logo.svg";
import Dashboard from "./Dashboard";

const VIEW_PILL_LIMIT = 10;
const WORKBOOK_PILL_LIMIT = 10;

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
  const workbookPickerRef = useRef(null);

  const navEntries = useMemo(
    () => Object.entries(JSON.parse(localStorage.getItem("navigation")) || {}),
    []
  );
  const group = JSON.parse(localStorage.getItem("group")) ?? "default";
  const isAdmin = group === "Admin";

  const userName = (JSON.parse(localStorage.getItem("user-name")) || "").trim();
  const role = JSON.parse(localStorage.getItem("role")) || "";
  const roleLabel = role.includes("Administrator") ? "Administrator" : role;

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
  const [embedURL, setEmbedURL] = useState(() => {
    const v = buildViews(workbooks[0]);
    return v.length ? v[0].url : "";
  });
  const [navOpen, setNavOpen] = useState(!isMobileDevice());
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [workbookMenuOpen, setWorkbookMenuOpen] = useState(false);
  const [idleCount, setIdleCount] = useState(idleCountParam);

  const useViewPicker = views.length > VIEW_PILL_LIMIT;
  const useWorkbookPicker = workbooks.length > WORKBOOK_PILL_LIMIT;
  const activeView = views[activeIndex] || null;

  useEffect(() => {
    if (idleCountParam !== idleCount) {
      setIdleCount(idleCountParam);
      handleBackgroundRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleCountParam]);

  // Close pickers on outside click or Escape
  useEffect(() => {
    if (!viewMenuOpen && !workbookMenuOpen) return undefined;

    const onPointerDown = (e) => {
      if (
        viewMenuOpen &&
        viewPickerRef.current &&
        !viewPickerRef.current.contains(e.target)
      ) {
        setViewMenuOpen(false);
      }
      if (
        workbookMenuOpen &&
        workbookPickerRef.current &&
        !workbookPickerRef.current.contains(e.target)
      ) {
        setWorkbookMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setViewMenuOpen(false);
        setWorkbookMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [viewMenuOpen, workbookMenuOpen]);

  useEffect(() => {
    if (!viewMenuOpen) return;
    const active = viewPickerRef.current?.querySelector('[aria-selected="true"]');
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [viewMenuOpen, activeIndex]);

  useEffect(() => {
    if (!workbookMenuOpen) return;
    const active = workbookPickerRef.current?.querySelector('[aria-selected="true"]');
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [workbookMenuOpen, selectedWorkbookId]);

  const applyWorkbook = (workbook) => {
    const nextViews = buildViews(workbook);
    const firstUrl = nextViews.length ? nextViews[0].url : "";
    setSelectedWorkbookId(workbook?.id || "");
    setViews(nextViews);
    setActiveIndex(0);
    setActiveURL(firstUrl);
    setEmbedURL(firstUrl);
    setViewMenuOpen(false);
    setWorkbookMenuOpen(false);
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

  const handleBackgroundRefresh = () => {
    const viz = getViz();
    if (viz) viz.refreshDataAsync().catch(() => {});
  };

  const handleLogout = () => validUserContext.logoutUser();

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

        <div className={classes.headerCenter}>
          {workbooks.length > 0 && !useWorkbookPicker && (
            <div className={classes.workbookNav} role="tablist" aria-label="Workbooks">
              {workbooks.map((wb) => (
                <button
                  key={wb.id}
                  type="button"
                  role="tab"
                  aria-selected={wb.id === selectedWorkbook?.id}
                  className={`${classes.workbookPill} ${
                    wb.id === selectedWorkbook?.id ? classes.workbookPillActive : ""
                  }`}
                  onClick={() => handleWorkbookChange(wb.id)}
                  title={wb.name}
                >
                  {wb.name}
                </button>
              ))}
            </div>
          )}

          {workbooks.length > 0 && useWorkbookPicker && selectedWorkbook && (
            <div className={classes.workbookPicker} ref={workbookPickerRef}>
              <button
                type="button"
                className={`${classes.workbookPill} ${classes.workbookPillActive} ${classes.workbookPickerButton}`}
                onClick={() => setWorkbookMenuOpen((o) => !o)}
                aria-expanded={workbookMenuOpen}
                aria-haspopup="listbox"
                title={selectedWorkbook.name}
              >
                <span className={classes.workbookPickerLabel}>{selectedWorkbook.name}</span>
                <span className={classes.chevron}>▾</span>
              </button>
              {workbookMenuOpen && (
                <div className={classes.pickerMenu} role="listbox">
                  {workbooks.map((wb) => (
                    <button
                      key={wb.id}
                      type="button"
                      role="option"
                      aria-selected={wb.id === selectedWorkbook?.id}
                      className={`${classes.pickerItem} ${
                        wb.id === selectedWorkbook?.id ? classes.pickerItemActive : ""
                      }`}
                      onClick={() => handleWorkbookChange(wb.id)}
                      title={wb.name}
                    >
                      {wb.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={classes.headerRight}>
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
                type="button"
                className={`${classes.viewTab} ${
                  activeIndex === index ? classes.viewTabActive : ""
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
                className={`${classes.viewTab} ${classes.viewTabActive} ${classes.viewPickerButton}`}
                onClick={() => setViewMenuOpen((o) => !o)}
                aria-expanded={viewMenuOpen}
                aria-haspopup="listbox"
                title={activeView.label}
              >
                <span className={classes.viewPickerLabel}>{activeView.label}</span>
                <span className={classes.chevron}>▾</span>
              </button>

              {viewMenuOpen && (
                <div className={classes.pickerMenu} role="listbox">
                  {views.map((view, index) => (
                    <button
                      key={view.id || index}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`${classes.pickerItem} ${
                        index === activeIndex ? classes.pickerItemActive : ""
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
          <span className={classes.downloadLabel}>Download:</span>
          <button
            type="button"
            className={classes.downloadLink}
            onClick={handleExportPDFClick}
          >
            PDF
          </button>
          <button
            type="button"
            className={classes.downloadLink}
            onClick={handleExportImageClick}
          >
            Image
          </button>
        </div>
      </nav>

      <main className={classes.content}>
        <div className={classes.dashboardCard} ref={dashboardRef}>
          {embedURL ? (
            <Dashboard
              embedUrl={embedURL}
              activeSheetUrl={activeURL}
              displayTabs={false}
            />
          ) : (
            <div className={classes.emptyState}>Select a dashboard to get started.</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Landing;
