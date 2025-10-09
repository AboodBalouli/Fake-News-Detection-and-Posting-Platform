// import React from 'react'
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();

  // state to store user information
  const [userName, setUserName] = useState("User");
  const [userProfilePic, setUserProfilePic] = useState("");
  const [userRole, setUserRole] = useState<string>(() =>
    localStorage.getItem("role") || "user"
  );

  // fetch user data from your API endpoint
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          // no token, use fallback approach
          const userData = localStorage.getItem("user");
          if (userData) {
            const user = JSON.parse(userData);
            setUserName(user.name || "User");
            setUserProfilePic(user.pfp || "");
            const storedRole = localStorage.getItem("role");
            if (storedRole) {
              setUserRole(storedRole);
            }
          }
          return;
        }

        // call your API endpoint
        const response = await fetch("http://localhost:8000/api/user_name", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserName(data.user_name || "User");
          setUserProfilePic(data.user_pfp || "");
          if (data.role) {
            setUserRole(data.role);
            localStorage.setItem("role", data.role);
          }
        } else {
          // API failed, fallback to localStorage
          const userData = localStorage.getItem("user");
          if (userData) {
            const user = JSON.parse(userData);
            setUserName(user.name || "User");
            setUserProfilePic(user.pfp || "");
            const storedRole = localStorage.getItem("role");
            if (storedRole) {
              setUserRole(storedRole);
            }
          }
        }
      } catch (error) {
        console.log("couldn't load user data from API, using localStorage:", error);
        // fallback to localStorage on network error
        const userData = localStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          setUserName(user.name || "User");
          setUserProfilePic(user.pfp || "");
          const storedRole = localStorage.getItem("role");
          if (storedRole) {
            setUserRole(storedRole);
          }
        }
      }
    };

    fetchUserData();
  }, []);

  // navigation handlers
  const handleHome = () => {
    navigate("/main");
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/");
  };

  const handlePost = () => {
    navigate("/post");
  };

  const handleAdmin = () => {
    navigate("/admin");
  };

  // utility function to get profile picture URL
  const getProfilePictureUrl = (pfpFilename?: string) => {
    if (pfpFilename) {
      return `http://localhost:8000/api/profile-pictures/${pfpFilename}`;
    }
    return "/src/assets/Default_pfp.jpg"; // fallback to default
  };
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <a className="navbar-brand" href="#">
          FactChecker
        </a>
        <div className="navbar-nav ms-auto d-flex align-items-center">
          {/* user profile section */}
          <div className="d-flex align-items-center me-3">
            <img
              src={getProfilePictureUrl(userProfilePic)}
              alt="Profile"
              className="rounded-circle me-2"
              style={{ 
                width: "32px", 
                height: "32px", 
                objectFit: "cover",
                border: "2px solid white"
              }}
              onError={(e) => {
                e.currentTarget.src = "/src/assets/Default_pfp.jpg";
              }}
            />
            <span className="navbar-text text-white">Welcome, {userName}</span>
          </div>
          
          {/* navigation buttons */}
          {currentPath === "/post" && (
            <button className="btn btn-outline-light me-2" onClick={handleHome}>
              Home
            </button>
          )}
          {currentPath !== "/post" && (
            <button className="btn btn-outline-light me-2" onClick={handlePost}>
              Post Article
            </button>
          )}
          {userRole === "admin" && currentPath !== "/admin" && (
            <button className="btn btn-outline-warning me-2" onClick={handleAdmin}>
              Admin
            </button>
          )}
          <button className="btn btn-outline-light" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
