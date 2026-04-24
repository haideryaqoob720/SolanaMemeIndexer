import React from "react";
import { Route, Redirect, RouteProps } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoaderCircle } from "lucide-react";

interface PrivateRouteProps extends RouteProps {
  component: React.ComponentType<any>;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  component: Component,
  ...rest
}) => {
  const { isAuthenticated, loading } = useAuth();
  console.log("Is authenticated...", isAuthenticated);

  // If loading is true, render nothing or a loading spinner.
  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{
          animation: "spin 0.25s linear infinite",
        }}
      >
        {/* Lucid-React Spinner */}
        <LoaderCircle size={30} />
      </div>
    );
  }

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? (
          <Component {...props} />
        ) : (
          <Redirect
            to={{
              pathname: "/login",
              state: { from: props.location }
            }}
          />
        )
      }
    />
  );
};

export default PrivateRoute;
