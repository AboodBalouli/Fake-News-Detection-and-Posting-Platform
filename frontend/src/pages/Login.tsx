// import React from 'react'
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username || !password) {
      alert("Please fill in all fields");
      return;
    }
    try {
      const response = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username, password: password }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Login successful, data:", data);
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("user", JSON.stringify(data.user));
  localStorage.setItem("role", data.user.role ?? "user");
        navigate("/main");
      } else {
        const errorData = await response.json();
        console.log("Login failed, error:", errorData);
        alert("Login failed: " + errorData.detail);
      }
    } catch (error) {
      console.log("Network error:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleRegister = () => {
    navigate("/register");
  };

  return (
    <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100">
      <div className="row d-flex justify-content-center align-items-center h-100">
        <div className="col-md-9 col-lg-6 col-xl-5">
          <img
            src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/draw2.webp"
            className="img-fluid"
          />
        </div>
        <div
          className="col-md-8 col-lg-6 col-xl-4 offset-xl-1"
          style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              {/* <label>Email address</label> */}
              <input
                type="text"
                className="form-control form-control-lg"
                id="exampleInputUsername1"
                aria-describedby="usernameHelp"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <p />
            </div>

            <div className="form-group">
              {/* <label>Password</label> */}
              <input
                type="password"
                className="form-control form-control-lg"
                id="exampleInputPassword1"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="exampleCheck1"
              />
              <p />
              <label className="form-check-label">Remember me</label>
            </div>
            <div className="text-center text-lg-start mt-4 pt-2">
              <button
                type="submit"
                data-mdb-button-init
                data-mdb-ripple-init
                className="btn btn-primary btn-lg"
                style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
              >
                Submit
              </button>
            </div>
            <div className="text-center text-lg-start mt-4 pt-2">
              Not a member?
              <button
                type="button"
                className="btn btn-link btn-sm btn-block"
                onClick={handleRegister}
              >
                Register!
              </button>
            </div>
            {/* add forgot password later and register */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
