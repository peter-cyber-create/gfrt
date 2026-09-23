import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { DEMO_MODE, navSections, pageSubtitles, pageTitles } from "../data/mock";
import { assetUrl } from "../lib/assetUrl.js";
import { getDataSource, notificationService } from "../services/index.js";
import DemoBadge from "./DemoBadge";
import Toast from "./Toast";

export default function AppLayout() {
  const { user, logout, canAccessPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState(null);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const headerRef = useRef(null);
  const dataSource = getDataSource();

  const title = pageTitles[location.pathname] || "Application";
  const subtitle = pageSubtitles[location.pathname] || "";
  const unread = notifications.filter((n) => n.unread).length;

  const filteredSections = useMemo(() => {
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => canAccessPath(item.path)),
      }))
      .filter((section) => section.items.length > 0);
  }, [canAccessPath]);

  useEffect(() => {
    notificationService.list().then(setNotifications).catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setUserOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function notify(message, variant = "success") {
    setToast({ message, variant });
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`} data-data-source={dataSource}>
      <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`} aria-label="Primary">
        <div className="sidebar-head">
          <Link to="/home" className="sidebar-brand-link" onClick={() => setMobileOpen(false)}>
            <img src={assetUrl("img/coa2.png")} alt="" height="28" />
            {!collapsed && (
              <div className="sidebar-brand-text">
                <strong>GFRT</strong>
                <span>Requisition Tracker</span>
              </div>
            )}
          </Link>
          <button
            type="button"
            className="btn btn-sm btn-link d-md-none text-muted"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <nav className="sidebar-scroll" data-testid="sidebar-nav">
          {filteredSections.map((section) => (
            <div className="nav-section" key={section.id}>
              {section.label && !collapsed && <div className="nav-section-label">{section.label}</div>}
              <ul className="nav flex-column sidebar-nav">
                {section.items.map((item) => (
                  <li className="nav-item" key={item.path}>
                    <NavLink
                      to={item.path}
                      title={item.label}
                      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <i className={item.icon} />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          {!collapsed && user && (
            <div className="sidebar-user">
              <div className="sidebar-user-name">{user.name || user.email}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
          )}
          <button
            type="button"
            className="btn btn-sm btn-light btn-block d-none d-md-inline-block"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i className={`fas fa-${collapsed ? "angle-double-right" : "angle-double-left"}`} />
            {!collapsed && <span className="ml-2">Collapse</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="sidebar-backdrop d-md-none" onClick={() => setMobileOpen(false)} />}

      <div className="app-main">
        <header className="app-topnav" ref={headerRef}>
          <div className="topnav-left">
            <button
              type="button"
              className="btn btn-link d-md-none mr-1"
              aria-label="Toggle navigation"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <i className="fas fa-bars" />
            </button>
            <div>
              <div className="topnav-breadcrumb text-muted">
                <Link to="/home">Home</Link>
                <span className="mx-1">/</span>
                <span>{title}</span>
              </div>
              <h1 className="topnav-title">{title}</h1>
              {subtitle && <div className="topnav-subtitle text-muted">{subtitle}</div>}
            </div>
          </div>

          <div className="topnav-right">
            <DemoBadge />
            <div className={`dropdown ${notifOpen ? "show" : ""}`}>
              <button
                type="button"
                className="btn btn-light btn-icon position-relative"
                aria-label="Notifications"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotifOpen((v) => !v);
                  setUserOpen(false);
                }}
              >
                <i className="fas fa-bell" />
                {unread > 0 && <span className="notif-dot">{unread}</span>}
              </button>
              <div className={`dropdown-menu dropdown-menu-right notif-menu ${notifOpen ? "show" : ""}`}>
                <div className="dropdown-header d-flex justify-content-between align-items-center">
                  <span>Notifications</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const list = await notificationService.markAllRead(user?.name);
                      setNotifications(list);
                    }}
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div className="dropdown-item-text text-muted small">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div className={`dropdown-item-text notif-item ${n.unread ? "unread" : ""}`} key={n.id}>
                      <div className="small">{n.text}</div>
                      <div className="text-muted meta-text">{n.time}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={`dropdown ${userOpen ? "show" : ""}`}>
              <button
                type="button"
                className="btn btn-light user-chip"
                id="userMenu"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserOpen((v) => !v);
                  setNotifOpen(false);
                }}
              >
                <span className="user-avatar">{(user?.name || "U").charAt(0)}</span>
                <span className="user-meta d-none d-sm-flex">
                  <strong>{user?.name || user?.email}</strong>
                  <small>{user?.role}</small>
                </span>
                <i className="fas fa-chevron-down ml-1 d-none d-sm-inline" />
              </button>
              <div className={`dropdown-menu dropdown-menu-right ${userOpen ? "show" : ""}`} aria-labelledby="userMenu">
                <span className="dropdown-item-text small text-muted">{user?.email}</span>
                <div className="dropdown-divider" />
                <button type="button" className="dropdown-item" onClick={() => navigate("/settings")}>
                  Settings
                </button>
                <button type="button" className="dropdown-item" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="app-content">
          {DEMO_MODE && (
            <div className="demo-banner" role="note">
              Demonstration data — not live production figures.
            </div>
          )}
          <Outlet context={{ notify }} />
        </main>
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
