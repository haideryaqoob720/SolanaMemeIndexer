import React from "react";
import { Route, BrowserRouter as Router, Switch, useLocation, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TokenDetails from "./pages/TokenDetails";
import "./styles/auth.css";
import "./styles/theme.css";
import NewPageDesign from "./pages/NewPage";
import Dashboard from "./pages/Dashboard";
import Homepage from "./pages/Homepage";
import Admin from "./pages/Admin";
import ManageUsers from "./pages/ManageUsers";

// Simplified Navbar for auth pages
const AuthNavbar: React.FC = () => {
  return (
    <nav className="nav auth-nav">
      <a href="/" className="nav-brand">
        LamboRadar
      </a>
    </nav>
  );
};

// Wrapper component to conditionally render appropriate navbar and apply classes
const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  
  return (
    <div className={`app ${isAuthPage ? 'auth-page' : ''}`}>
      {isAuthPage ? <AuthNavbar /> : <Navbar />}
      {isAuthPage ? (
        <Switch>
          <Route exact path="/login" component={Login} />
          <PrivateRoute exact path="/register" component={Register} />
        </Switch>
      ) : (
        <main className="main-content fade-in">
          <Switch>
            <Route exact path="/" component={Homepage} />
            <PrivateRoute exact path="/dashboard" component={Dashboard} />
            <PrivateRoute exact path="/admin" component={Admin} />
            <PrivateRoute path="/token/:id" component={TokenDetails} />
            <PrivateRoute path={"/details/:id"} component={NewPageDesign} />
            <PrivateRoute path={"/admin/users"} component={ManageUsers} />
          </Switch>
        </main>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
